import "server-only";

import { getDatabase } from "@/lib/db";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  requireBillingProject,
} from "../authorization";

import {
  searchRemoteSubscriptions,
} from "../mercadopago/subscriptions";

import {
  reconcileSubscription,
} from "./service";

type RecoverySubscription = {
  id: string;
  provider_subscription_id: string | null;
  checkout_payer_email: string | null;
  checkout_state: string;
  recovery_allowed: boolean;
};

export async function recoverCheckout(
  userId: string,
  projectId: string
) {
  const sql = getDatabase();

  const local = await sql.begin(
    async (tx) => {
      await requireBillingProject(
        tx,
        userId,
        projectId,
        { adminOnly: true }
      );

      const [subscription] =
        await tx<RecoverySubscription[]>`
          select
            id,
            provider_subscription_id,
            checkout_payer_email,
            checkout_state,

            (
              checkout_state <> 'CREATING'

              or checkout_requested_at <
                now() - interval '5 minutes'
            ) as recovery_allowed

          from billing.subscriptions

          where project_id = ${projectId}
        `;

      return subscription;
    }
  );

  if (!local) {
    throw new DomainError(
      "SUBSCRIPTION_NOT_FOUND",
      404
    );
  }

  if (!local.recovery_allowed) {
    throw new DomainError(
      "CHECKOUT_IN_PROGRESS",
      409
    );
  }

  let remoteId =
    local.provider_subscription_id;

  if (!remoteId) {
    if (!local.checkout_payer_email) {
      throw new DomainError(
        "CHECKOUT_RECOVERY_EMAIL_MISSING",
        409
      );
    }

    const matches = new Set<string>();

    let offset = 0;

    let complete = false;

    for (let page = 0; page < 3; page++) {
      const result =
        await searchRemoteSubscriptions(
          local.checkout_payer_email,
          offset
        );

      for (const item of result.results) {
        if (
          item.external_reference === local.id
        ) {
          matches.add(item.id);
        }
      }

      offset += result.results.length;

      if (offset >= result.paging.total) {
        complete = true;
        break;
      }

      if (!result.results.length) {
        break;
      }
    }

    if (!complete) {
      throw new DomainError(
        "CHECKOUT_SEARCH_INCOMPLETE",
        409
      );
    }

    if (matches.size !== 1) {
      throw new DomainError(
        "CHECKOUT_RECONCILIATION_REQUIRED",
        409
      );
    }

    remoteId =
      [...matches][0];
  }

  const result =
    await reconcileSubscription(remoteId);

  if (
    result.ignored ||
    result.subscription_id !== local.id
  ) {
    throw new DomainError(
      "SUBSCRIPTION_DATA_MISMATCH",
      409
    );
  }

  return {
    recovered: true,
  };
}