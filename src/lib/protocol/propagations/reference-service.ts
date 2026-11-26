import "server-only";

import type { TransactionSql } from "postgres";

import { DomainError } from "@/lib/api/domain-error";

export async function getReferenceTable(
  tx: TransactionSql,
  tableId: string
) {
  const [table] = await tx<{
    name: string;
  }[]>`
    select t.name

    from protocol.tables t

    join protocol.versions v
      on v.id = t.version_id

    where t.id = ${tableId}
      and t.deleted_at is null
      and v.active
  `;

  return table?.name ?? null;
}

export async function getPropagationReferences(
  tx: TransactionSql,
  input: {
    tableId: string;
    recordId: string;
    projectId: string;
    originInstanceId: string | null;
    destinationInstanceId: string;
  }
) {
  const tableName = await getReferenceTable(
    tx,
    input.tableId
  );

  if (!tableName) {
    return {
      origin: null,
      destination: null,
    };
  }

  const refs = await tx<{
    instance_id: string;
    ref_id: string;
  }[]>`
    select
      r.instance_id,
      r.ref_id

    from data.${tx(`${tableName}_ref`)} r

    join data.${tx(tableName)} d
      on d.id = r.id

    join platform.instances i
      on i.id = r.instance_id

    where r.id = ${input.recordId}
      and d.project_id = ${input.projectId}
      and i.project_id = d.project_id

      and (
        r.instance_id =
          ${input.originInstanceId}::uuid

        or r.instance_id =
          ${input.destinationInstanceId}
      )
  `;

  return {
    origin: refs.find(
      (ref) =>
        ref.instance_id ===
        input.originInstanceId
    )?.ref_id ?? null,

    destination: refs.find(
      (ref) =>
        ref.instance_id ===
        input.destinationInstanceId
    )?.ref_id ?? null,
  };
}

export async function registerDestinationReference(
  tx: TransactionSql,
  input: {
    tableId: string;
    recordId: string;
    projectId: string;
    instanceId: string;
    refId: string;
  }
) {
  const tableName = await getReferenceTable(
    tx,
    input.tableId
  );

  if (!tableName) {
    throw new DomainError(
      "MODEL_NOT_FOUND",
      404
    );
  }

  const [record] = await tx<{
    id: string;
  }[]>`
    select d.id

    from data.${tx(tableName)} d

    join platform.instances i
      on i.id = ${input.instanceId}
      and i.project_id = d.project_id

    where d.id = ${input.recordId}
      and d.project_id = ${input.projectId}
      and i.deleted_at is null
  `;

  if (!record) {
    throw new DomainError(
      "RECORD_NOT_FOUND",
      404
    );
  }

  const refTable = `${tableName}_ref`;

  const [existing] = await tx<{
    ref_id: string;
  }[]>`
    select ref_id

    from data.${tx(refTable)}

    where id = ${input.recordId}
      and instance_id = ${input.instanceId}
  `;

  if (existing) {
    if (existing.ref_id !== input.refId) {
      throw new DomainError(
        "RECORD_REFERENCE_CONFLICT",
        409
      );
    }

    return;
  }

  const inserted = await tx`
    insert into data.${tx(refTable)} (
      id,
      instance_id,
      ref_id
    )

    values (
      ${input.recordId},
      ${input.instanceId},
      ${input.refId}
    )

    on conflict do nothing

    returning id
  `;

  if (inserted.length === 0) {
    const [current] = await tx<{
      ref_id: string;
    }[]>`
      select ref_id

      from data.${tx(refTable)}

      where id = ${input.recordId}
        and instance_id = ${input.instanceId}
    `;

    if (current?.ref_id !== input.refId) {
      throw new DomainError(
        "DUPLICATE_RECORD_REFERENCE",
        409
      );
    }
  }
}