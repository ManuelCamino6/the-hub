
import "server-only";

import type { TransactionSql } from "postgres";

const MODEL_LOCK = 740001;

export async function lockModelForWrite(
  tx: TransactionSql
) {
  await tx`
    select pg_advisory_xact_lock(
      ${MODEL_LOCK}::bigint
    )
  `;
}

export async function lockModelForRead(
  tx: TransactionSql
) {
  await tx`
    select pg_advisory_xact_lock_shared(
      ${MODEL_LOCK}::bigint
    )
  `;
}
