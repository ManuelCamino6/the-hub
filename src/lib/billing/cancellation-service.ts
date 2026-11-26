import "server-only";

import { getDatabase } from "@/lib/db";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  requireBillingProject,
} from "./authorization";

import {
  cancelRemoteSubscription,
  getRemoteSubscription,
} from "./mercadopago/subscriptions";

import {
  reconcileSubscription,
} from "./reconciliation/service";

import {
  validateRemoteSubscription,
} from "./reconciliation/validation";

import type {
  LocalSubscription,
} from "./reconciliation/validation";

type CancellationSubscription =
  LocalSubscription & {
    status: string;
  };

export async function cancelSubscription(
  userId: string,
  projectId: string
) {
  const sql = getDatabase();

  const local = await sql.begin(
    async (tx) => {
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
        { adminOnly: true }
      );

      const [subscription] =
        await tx<CancellationSubscription[]>`
          select
            id,
            project_id,
            provider_subscription_id,
            amount_minor,
            currency,
            frequency,
            frequency_type,
            status

          from billing.subscriptions

          where project_id = ${projectId}

          for update
        `;

      if (!subscription) {
        throw new DomainError(
          "SUBSCRIPTION_NOT_FOUND",
          404
        );
      }

      if (subscription.status === "CANCELLED") {
        return subscription;
      }

      if (
        !subscription.provider_subscription_id
      ) {
        throw new DomainError(
          "CHECKOUT_RECONCILIATION_REQUIRED",
          409
        );
      }

      await tx`
        update billing.subscriptions

        set cancellation_requested_at =
          coalesce(
            cancellation_requested_at,
            clock_timestamp()
          )

        where id = ${subscription.id}
      `;

      return subscription;
    }
  );

  if (local.status === "CANCELLED") {
    return {
      cancelled: true,
    };
  }

  const remoteId =
    local.provider_subscription_id!;

  const remote =
    await getRemoteSubscription(remoteId);

  validateRemoteSubscription(
    local,
    remote
  );

  if (remote.status !== "canceled") {
    await cancelRemoteSubscription(
      remoteId
    );
  }

  await reconcileSubscription(remoteId);

  const [result] = await sql<{
    status: string;
  }[]>`
    select status

    from billing.subscriptions

    where id = ${local.id}
  `;

  if (result?.status !== "CANCELLED") {
    throw new DomainError(
      "CANCELLATION_NOT_CONFIRMED",
      409
    );
  }

  await sql`
    update billing.subscriptions

    set cancellation_requested_at = null

    where id = ${local.id}

      and status = 'CANCELLED'
  `;

  return {
    cancelled: true,
  };
}