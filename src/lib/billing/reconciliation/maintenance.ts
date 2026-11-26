import "server-only";

import { getDatabase } from "@/lib/db";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  findAuthorizedPayments,
} from "../mercadopago/payments";

import {
  reconcileSubscription,
} from "./service";

type MaintenanceSubscription = {
  id: string;
  provider_subscription_id: string;
  reconciliation_offset: number;
};

export async function reconcileNextSubscription() {
  const sql = getDatabase();

  const [local] =
    await sql<MaintenanceSubscription[]>`
      with candidate as (
        select id

        from billing.subscriptions

        where provider_subscription_id
          is not null

          and (
            last_reconciled_at is null

            or last_reconciled_at <
              now() - interval '2 minutes'
          )

        order by
          last_reconciled_at asc nulls first,
          created_at,
          id

        limit 1

        for update skip locked
      )

      update billing.subscriptions s

      set last_reconciled_at =
        clock_timestamp()

      from candidate

      where s.id = candidate.id

      returning
        s.id,
        s.provider_subscription_id,
        s.reconciliation_offset
    `;

  if (!local) {
    return {
      reconciled: false,
      payments: 0,
    };
  }

  const remoteId =
    local.provider_subscription_id;

  await reconcileSubscription(remoteId);

  const page =
    await findAuthorizedPayments(
      {
        preapproval_id: remoteId,
      },
      local.reconciliation_offset
    );

  const authorized = page.results[0];

  if (authorized) {
    if (
      authorized.preapproval_id !== remoteId
    ) {
      throw new DomainError(
        "PAYMENT_DATA_MISMATCH",
        409
      );
    }

    await reconcileSubscription(
      remoteId,
      authorized.id
    );
  }

  const nextOffset =
    local.reconciliation_offset + 1;

  await sql`
    update billing.subscriptions

    set
      last_reconciled_at =
        clock_timestamp(),

      reconciliation_offset = ${
        authorized &&
        nextOffset < page.paging.total
          ? nextOffset
          : 0
      }

    where id = ${local.id}

      and provider_subscription_id =
        ${remoteId}

      and reconciliation_offset =
        ${local.reconciliation_offset}
  `;

  return {
    reconciled: true,
    payments: authorized ? 1 : 0,
  };
}