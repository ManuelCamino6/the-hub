import "server-only";

import type { TransactionSql } from "postgres";

import {
  DomainError,
} from "@/lib/api/domain-error";

export async function hasActiveSubscription(
  tx: TransactionSql,
  projectId: string
) {
  const [result] = await tx<{
    active: boolean;
  }[]>`
    select
      billing.has_active_subscription(
        ${projectId}
      ) as active
  `;

  return result?.active ?? false;
}

export async function requireActiveSubscription(
  tx: TransactionSql,
  projectId: string
) {
  const active = await hasActiveSubscription(
    tx,
    projectId
  );

  if (!active) {
    throw new DomainError(
      "SUBSCRIPTION_REQUIRED",
      409
    );
  }
}