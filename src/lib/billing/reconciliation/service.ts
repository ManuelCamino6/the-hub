import "server-only";

import { z } from "zod";

import { getDatabase } from "@/lib/db";

import {
    getRemoteSubscription,
    validateCheckoutUrl,
} from "../mercadopago/subscriptions";

import {
    getAuthorizedPayment,
    getProviderPayment,
} from "../mercadopago/payments";

import {
    calculateBillingPeriod,
} from "../periods";

import {
    validateRemoteSubscription,
    validateRecurringPayment,
    isAccreditedPayment,
} from "./validation";

import type {
    LocalSubscription,
} from "./validation";

import type {
    TransactionSql,
} from "postgres";

import {
    DomainError,
} from "@/lib/api/domain-error";

type ReconciliationResult =
  | {
      ignored: true;
    }
  | {
      ignored: false;
      subscription_id: string;
    };

async function refreshSubscriptionStatus(
    tx: TransactionSql,
    subscriptionId: string
) {
    await tx`
    update billing.subscriptions s

    set
      period_start = period.period_start,
      period_end = period.period_end,

      status = (
        case

          when s.provider_status = 'canceled'
            then 'CANCELLED'

          when s.provider_status = 'paused'
            then 'PAUSED'

          when s.provider_status = 'authorized'
            and period.period_start <= now()
            and period.period_end > now()
            then 'ACTIVE'

          when s.provider_status = 'authorized'
            and period.period_end <= now()
            then 'PAST_DUE'

          else 'PENDING'

        end
      )::billing.subscription_status,

      updated_at = clock_timestamp()

    from (
      select
        (
          select f.period_start

          from platform.invoices f

          where f.subscription_id =
            ${subscriptionId}

            and f.status = 'PAID'

            and f.period_start <= now()

          order by f.period_end desc

          limit 1

        ) as period_start,

        (
          select f.period_end

          from platform.invoices f

          where f.subscription_id =
            ${subscriptionId}

            and f.status = 'PAID'

            and f.period_start <= now()

          order by f.period_end desc

          limit 1

        ) as period_end

    ) period

    where s.id = ${subscriptionId}
  `;
    await tx`
  update billing.subscriptions

  set cancellation_requested_at = null

  where id = ${subscriptionId}

    and status = 'CANCELLED'
`;
}

export async function reconcileSubscription(
  remoteId: string,
  authorizedPaymentId?: string
): Promise<ReconciliationResult> {
    const remote =
        await getRemoteSubscription(remoteId);

    if (remote.id !== remoteId) {
        throw new DomainError(
            "SUBSCRIPTION_DATA_MISMATCH",
            409
        );
    }

    const localId = z.uuid().safeParse(
        remote.external_reference
    );

    if (!localId.success) {
        return {
            ignored: true,
        };
    }

    const sql = getDatabase();

    const [reference] = await sql<{
        project_id: string;
    }[]>`
    select project_id

    from billing.subscriptions

    where id = ${localId.data}
  `;

    if (!reference) {
        return {
            ignored: true,
        };
    }

    const authorized = authorizedPaymentId
        ? await getAuthorizedPayment(
            authorizedPaymentId
        )
        : null;

    if (
        authorized &&
        authorized.id !== authorizedPaymentId
    ) {
        throw new DomainError(
            "PAYMENT_DATA_MISMATCH",
            409
        );
    }

    const payment = authorized?.payment?.id
        ? await getProviderPayment(
            authorized.payment.id
        )
        : null;

    return sql.begin(async (tx): Promise<ReconciliationResult> => {
        await tx`
      select id

      from platform.projects

      where id = ${reference.project_id}

      for update
    `;

        const [local] =
            await tx<LocalSubscription[]>`
        select
          id,
          project_id,
          provider_subscription_id,
          amount_minor,
          currency,
          frequency,
          frequency_type

        from billing.subscriptions

        where id = ${localId.data}

        for update
      `;

        if (!local) {
            throw new DomainError(
                "SUBSCRIPTION_NOT_FOUND",
                404
            );
        }

        validateRemoteSubscription(
            local,
            remote
        );

        const checkoutUrl = remote.init_point
            ? validateCheckoutUrl(
                remote.init_point
            )
            : null;

        await tx`
      update billing.subscriptions

      set
        provider_subscription_id =
          ${remote.id},

        provider_status =
          ${remote.status},

        provider_updated_at =
          ${remote.last_modified}::timestamptz,

        checkout_url =
          coalesce(
            ${checkoutUrl},
            checkout_url
          ),

        checkout_state =
          case
            when coalesce(
              ${checkoutUrl},
              checkout_url
            ) is not null
              then 'READY'

            else checkout_state
          end,

        updated_at =
          clock_timestamp()

      where id = ${local.id}

        and (
          provider_updated_at is null

          or provider_updated_at <=
            ${remote.last_modified}::timestamptz
        )
    `;

        if (authorized && payment) {
            validateRecurringPayment(
                local,
                remote,
                authorized,
                payment
            );

            const period =
                calculateBillingPeriod(
                    authorized.debit_date,
                    local.frequency,
                    local.frequency_type
                );

            const accredited =
                isAccreditedPayment(payment);

            const revoked =
                payment.transaction_amount_refunded > 0 ||
                [
                    "refunded",
                    "charged_back",
                    "cancelled",
                ].includes(payment.status);

            const invoiceStatus = accredited
                ? "PAID"
                : revoked
                    ? "VOID"
                    : "OPEN";

            const [invoice] = await tx<{
                id: string;
            }[]>`
        insert into platform.invoices (
          project_id,
          subscription_id,
          provider,
          provider_invoice_id,
          provider_payment_id,
          provider_updated_at,
          description,
          amount_minor,
          currency,
          status,
          created_at,
          due_at,
          paid_at,
          period_start,
          period_end
        )

        values (
          ${local.project_id},
          ${local.id},
          'mercadopago',
          ${authorized.id},
          ${payment.id},
          ${payment.date_last_updated}::timestamptz,
          'The Hub - Business',
          ${local.amount_minor},
          ${local.currency},
          ${invoiceStatus},
          ${payment.date_created}::timestamptz,
          ${authorized.debit_date}::timestamptz,
          ${accredited ? payment.date_approved : null},
          ${period.period_start},
          ${period.period_end}
        )

        on conflict (
          provider,
          provider_invoice_id
        )

        where provider_invoice_id is not null

        do update set

          provider_payment_id =
            excluded.provider_payment_id,

          provider_updated_at =
            excluded.provider_updated_at,

          status =
            excluded.status,

          paid_at =
            coalesce(
              excluded.paid_at,
              platform.invoices.paid_at
            )

        where platform.invoices.subscription_id =
          excluded.subscription_id

          and (
            platform.invoices.provider_updated_at
              is null

            or platform.invoices.provider_updated_at <=
              excluded.provider_updated_at
          )

        returning id
      `;

            if (!invoice) {
                const [existing] = await tx<{
                    subscription_id: string;
                }[]>`
          select subscription_id

          from platform.invoices

          where provider = 'mercadopago'

            and provider_invoice_id =
              ${authorized.id}
        `;

                if (
                    !existing ||
                    existing.subscription_id !== local.id
                ) {
                    throw new DomainError(
                        "INVOICE_OWNERSHIP_CONFLICT",
                        409
                    );
                }
            }
        }

        await refreshSubscriptionStatus(
            tx,
            local.id
        );

        return {
            ignored: false,
            subscription_id: local.id,
        };
    });
}