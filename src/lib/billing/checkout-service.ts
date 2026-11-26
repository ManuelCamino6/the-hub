import "server-only";

import { z } from "zod";

import { getDatabase } from "@/lib/db";

import {
    DomainError,
} from "@/lib/api/domain-error";

import {
    requireBillingProject,
} from "./authorization";

import {
    getBillingPlan,
    getBillingReturnUrl,
    isCheckoutEnabled,
} from "./config";

import {
    createRemoteSubscription,
    validateCheckoutUrl,
} from "./mercadopago/subscriptions";

type CheckoutSubscription = {
    id: string;

    status: string;

    checkout_state:
    | "IDLE"
    | "CREATING"
    | "READY"
    | "RECONCILE";

    checkout_url: string | null;

    provider_subscription_id:
    string | null;
};

type CheckoutReservation =
    | {
        kind: "existing";
        redirect_url: string;
    }
    | {
        kind: "reserved";
        id: string;
    };

export async function createCheckout(
    userId: string,
    projectId: string,
    payerEmail: string
) {
    if (!isCheckoutEnabled()) {
        throw new DomainError(
            "CHECKOUT_DISABLED",
            503
        );
    }

    if (
        !process.env.MERCADOPAGO_ACCESS_TOKEN
    ) {
        throw new DomainError(
            "PAYMENT_PROVIDER_NOT_CONFIGURED",
            503
        );
    }

    if (!z.email().safeParse(
        payerEmail
    ).success) {
        throw new DomainError(
            "INVALID_PAYER_EMAIL",
            422
        );
    }

    const plan = getBillingPlan();

    const backUrl =
        getBillingReturnUrl(projectId);

    const sql = getDatabase();

    const reservation =
        await sql.begin(
            async (tx): Promise<CheckoutReservation> => {
                await tx`
          select id

          from platform.projects

          where id = ${projectId}

          for update
        `;

                await requireBillingProject(
                    tx,
                    userId,
                    projectId,
                    {
                        adminOnly: true,
                    }
                );

                const [existing] =
                    await tx<CheckoutSubscription[]>`
            select
              id,
              status,
              checkout_state,
              checkout_url,
              provider_subscription_id

            from billing.subscriptions

            where project_id = ${projectId}

            for update
          `;

                if (existing) {
                    if (
                        existing.status !== "PENDING"
                    ) {
                        throw new DomainError(
                            "SUBSCRIPTION_ALREADY_EXISTS",
                            409
                        );
                    }

                    if (
                        existing.checkout_state ===
                        "READY" &&

                        existing.checkout_url
                    ) {
                        return {
                            kind: "existing",

                            redirect_url:
                                validateCheckoutUrl(
                                    existing.checkout_url
                                ),
                        };
                    }

                    if (
                        existing.checkout_state !==
                        "IDLE" ||

                        existing.provider_subscription_id
                    ) {
                        throw new DomainError(
                            "CHECKOUT_RECONCILIATION_REQUIRED",
                            409
                        );
                    }

                    await tx`
                        update billing.subscriptions

                        set
                        plan_code = ${plan.code},
                        currency = ${plan.currency},
                        amount_minor = ${plan.amount_minor},

                        checkout_state = 'CREATING',

                        checkout_requested_at =
                            clock_timestamp(),

                        updated_at =
                            clock_timestamp(),

                            frequency = ${plan.frequency},

                            frequency_type = ${plan.frequency_type}

                        where id = ${existing.id}
                    `;

                    await tx`
                        update billing.subscriptions

                        set
                            plan_code = ${plan.code},
                            currency = ${plan.currency},
                            amount_minor = ${plan.amount_minor},
                            frequency = ${plan.frequency},
                            frequency_type = ${plan.frequency_type},
                            checkout_payer_email = ${payerEmail},
                            checkout_state = 'CREATING',
                            checkout_requested_at = clock_timestamp(),
                            updated_at = clock_timestamp()

                        where id = ${existing.id}
                        `;

                    return {
                        kind: "reserved",
                        id: existing.id,
                    };
                }

                const [created] =
                    await tx<{ id: string }[]>`
                        insert into billing.subscriptions (
                        project_id,
                        provider,
                        status,
                        plan_code,
                        currency,
                        amount_minor,
                        frequency,
                        frequency_type,
                        checkout_payer_email,
                        checkout_state,
                        checkout_requested_at
                        )

                        values (
                        ${projectId},
                        ${plan.provider},
                        'PENDING',
                        ${plan.code},
                        ${plan.currency},
                        ${plan.amount_minor},
                        ${plan.frequency},
                        ${plan.frequency_type},
                        ${payerEmail},
                        'CREATING',
                        clock_timestamp()
                        )

                        returning id
                    `;

                return {
                    kind: "reserved",
                    id: created.id,
                };
            }
        );

    if (reservation.kind === "existing") {
        return {
            redirect_url:
                reservation.redirect_url,
        };
    }

    try {
        const remote =
            await createRemoteSubscription({
                reference: reservation.id,
                payerEmail,

                amountMinor:
                    plan.amount_minor,

                currency:
                    plan.currency,

                frequency:
                    plan.frequency,

                frequencyType:
                    plan.frequency_type,

                backUrl,
            });

        await sql.begin(async (tx) => {
            await tx`
        select id

        from platform.projects

        where id = ${projectId}

        for update
      `;

            const [saved] = await tx<{ id: string }[]>`
                update billing.subscriptions

                set
                    provider_subscription_id = ${remote.id},
                    provider_status = ${remote.status},
                    checkout_url = ${remote.init_point},
                    checkout_state = 'READY',
                    updated_at = clock_timestamp()

                where id = ${reservation.id}

                    and checkout_state = 'CREATING'

                    and status = 'PENDING'

                    and (
                    provider_subscription_id is null
                    or provider_subscription_id = ${remote.id}
                    )

                returning id
                `;

            if (!saved) {
                throw new DomainError(
                    "CHECKOUT_STATE_CONFLICT",
                    409
                );
            }

            await requireBillingProject(
                tx,
                userId,
                projectId,
                {
                    adminOnly: true,
                }
            );
        });

        return {
            redirect_url: remote.init_point,
        };

    } catch (error) {
        try {
            await sql`
        update billing.subscriptions

        set
          checkout_state = 'RECONCILE',

          updated_at =
            clock_timestamp()

        where id = ${reservation.id}

          and checkout_state = 'CREATING'
      `;

        } catch {
            console.error(
                "Checkout reconciliation required",
                {
                    subscriptionId:
                        reservation.id,
                }
            );
        }

        throw error;
    }
}