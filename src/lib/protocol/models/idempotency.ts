
import "server-only";

import { createHash } from "node:crypto";

import type { TransactionSql } from "postgres";

import {
  DomainError,
} from "@/lib/api/domain-error";

import type {
  WriteItem,
  WriteOperation,
  RegisteredChange,
} from "./write-schemas";

export function createRequestHash(
  tableId: string,
  operation: WriteOperation,
  item: WriteItem
): string {
  const entries = Object.entries(item)
    .filter(([key]) =>
      key !== "client_operation_id"
    )
    .sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0
    );

  const canonical = JSON.stringify({
    table_id: tableId,
    operation,
    entries,
  });

  return createHash("sha256")
    .update(canonical)
    .digest("hex");
}

export async function findIdempotentChange(
  tx: TransactionSql,
  batchId: string,
  clientOperationId: string,
  requestHash: string
): Promise<RegisteredChange | null> {
  const [existing] = await tx<{
    change_id: string;
    id: string;
    ref_id: string | null;
    request_hash: string | null;
  }[]>`
    select
      id as change_id,
      record_id as id,
      payload ->> 'ref_id' as ref_id,
      request_hash

    from protocol.changes

    where batch_id = ${batchId}
      and client_operation_id =
        ${clientOperationId}
  `;

  if (!existing) {
    return null;
  }

  if (
    existing.request_hash !== requestHash
  ) {
    throw new DomainError(
      "IDEMPOTENCY_CONFLICT",
      409
    );
  }

  return {
    id: existing.id,
    ref_id: existing.ref_id,
    change_id: existing.change_id,
  };
}
