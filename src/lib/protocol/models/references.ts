
import "server-only";

import type { TransactionSql } from "postgres";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  modelDataTable,
  modelReferenceTable,
  type ModelMetadata,
} from "./metadata";

import type {
  RecordReference,
} from "./schemas";

export type ResolvedRecord = {
  id: string;
  ref_id: string | null;
};

export async function resolveRecord(
  tx: TransactionSql,
  model: ModelMetadata,
  projectId: string,
  instanceId: string,
  reference: RecordReference
): Promise<ResolvedRecord> {
  const table = modelDataTable(model);
  const refs = modelReferenceTable(model);

  const [record] = await tx.unsafe<
    ResolvedRecord[]
  >(
    `
      select
        d.id,
        r.ref_id

      from ${table} d

      left join ${refs} r
        on r.id = d.id
        and r.instance_id = $2::uuid

      where d.project_id = $1::uuid
        and d.deleted_at is null

        and (
          (
            $3::uuid is not null
            and d.id = $3::uuid
          )
          or (
            $3::uuid is null
            and r.ref_id = $4::text
          )
        )
    `,
    [
      projectId,
      instanceId,
      reference.id ?? null,
      reference.ref_id ?? null,
    ]
  );

  if (!record) {
    throw new DomainError(
      "RECORD_NOT_FOUND",
      404
    );
  }

  if (
    reference.ref_id !== undefined &&
    record.ref_id !== reference.ref_id
  ) {
    throw new DomainError(
      "RECORD_REFERENCE_CONFLICT",
      409
    );
  }

  return record;
}


export async function referenceExists(
  tx: TransactionSql,
  model: ModelMetadata,
  instanceId: string,
  refId: string
): Promise<boolean> {
  const refs = modelReferenceTable(model);

  const [result] = await tx.unsafe<
    { exists: boolean }[]
  >(
    `
      select exists (
        select 1
        from ${refs}

        where instance_id = $1::uuid
          and ref_id = $2::text
      ) as exists
    `,
    [
      instanceId,
      refId,
    ]
  );

  return result.exists;
}