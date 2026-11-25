
import "server-only";

import type { TransactionSql } from "postgres";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  resolveRecord,
  referenceExists,
  type ResolvedRecord,
} from "./references";

import type {
  ModelMetadata,
} from "./metadata";

import type {
  RecordReference,
} from "./schemas";

export async function pendingReferenceExists(
  tx: TransactionSql,
  batchId: string,
  tableId: string,
  refId: string
): Promise<boolean> {
  const [result] = await tx<{
    exists: boolean;
  }[]>`
    select exists (
      select 1
      from protocol.changes

      where batch_id = ${batchId}
        and table_id = ${tableId}
        and type = 'CREATE'
        and payload ->> 'ref_id' = ${refId}
    ) as exists
  `;

  return result.exists;
}

export async function requireUnusedReference(
  tx: TransactionSql,
  model: ModelMetadata,
  batchId: string,
  instanceId: string,
  refId: string
) {
  const committed = await referenceExists(
    tx,
    model,
    instanceId,
    refId
  );

  const pending =
    await pendingReferenceExists(
      tx,
      batchId,
      model.id,
      refId
    );

  if (committed || pending) {
    throw new DomainError(
      "DUPLICATE_RECORD_REFERENCE",
      409
    );
  }
}


export async function resolveBatchRecord(
  tx: TransactionSql,
  model: ModelMetadata,
  batchId: string,
  projectId: string,
  instanceId: string,
  reference: RecordReference
): Promise<ResolvedRecord> {
  const [pending] = await tx<
    ResolvedRecord[]
  >`
    select
      record_id as id,
      payload ->> 'ref_id' as ref_id

    from protocol.changes

    where batch_id = ${batchId}
      and table_id = ${model.id}
      and type = 'CREATE'

      and (
        (
          ${reference.id ?? null}::uuid
            is not null

          and record_id =
            ${reference.id ?? null}::uuid
        )
        or (
          ${reference.id ?? null}::uuid
            is null

          and payload ->> 'ref_id' =
            ${reference.ref_id ?? null}::text
        )
      )

    limit 1
  `;

  let record: ResolvedRecord;

  if (pending) {
    if (
      reference.ref_id !== undefined &&
      pending.ref_id !== reference.ref_id
    ) {
      throw new DomainError(
        "RECORD_REFERENCE_CONFLICT",
        409
      );
    }

    record = pending;
  } else {
    record = await resolveRecord(
      tx,
      model,
      projectId,
      instanceId,
      reference
    );
  }

  const [deleted] = await tx<{
    exists: boolean;
  }[]>`
    select exists (
      select 1
      from protocol.changes

      where batch_id = ${batchId}
        and table_id = ${model.id}
        and record_id = ${record.id}
        and type = 'DELETE'
    ) as exists
  `;

  if (deleted.exists) {
    throw new DomainError(
      "RECORD_PENDING_DELETION",
      409
    );
  }

  return record;
}
