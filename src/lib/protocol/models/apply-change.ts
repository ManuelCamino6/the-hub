
import "server-only";

import type { TransactionSql } from "postgres";

import { DomainError } from "@/lib/api/domain-error";

import type { ModelMetadata } from "./metadata";

import {
  validateWriteFields,
  type ChangePayload,
  type ChangeFields,
} from "./write-validation";

import {
  validateForeignKeys,
} from "./foreign-keys";

import type {
  WriteOperation,
} from "./write-schemas";

export type PendingChange = {
  id: string;
  sequence: number;
  table_id: string;
  table_name: string;
  record_id: string;
  type: WriteOperation;
  payload: ChangePayload;
};

export type ApplyContext = {
  projectId: string;
  instanceId: string;
  model: ModelMetadata;
};


async function applyCreate(
  tx: TransactionSql,
  context: ApplyContext,
  change: PendingChange,
  fields: ChangeFields
) {
  const { model, projectId, instanceId } =
    context;

  const refId = change.payload.ref_id;

  if (!refId) {
    throw new DomainError(
      "INVALID_RECORD_REFERENCE",
      422
    );
  }

  const record = {
    ...fields,
    id: change.record_id,
    project_id: projectId,
  };

  const [created] = await tx<
    Record<string, unknown>[]
  >`
    insert into data.${tx(model.name)}

    ${tx(record)}

    returning *
  `;

  await validateForeignKeys(
    tx,
    model,
    projectId,
    created as ChangeFields
  );

  await tx`
    insert into data.${tx(`${model.name}_ref`)} (
      id,
      instance_id,
      ref_id
    )

    values (
      ${change.record_id},
      ${instanceId},
      ${refId}
    )
  `;
}


async function applyUpdate(
  tx: TransactionSql,
  context: ApplyContext,
  change: PendingChange,
  fields: ChangeFields
) {
  const { model, projectId } = context;

  const [updated] = await tx<
    Record<string, unknown>[]
  >`
    update data.${tx(model.name)}

    set ${tx(fields)}

    where id = ${change.record_id}
      and project_id = ${projectId}
      and deleted_at is null

    returning *
  `;

  if (!updated) {
    throw new DomainError(
      "RECORD_NOT_FOUND",
      404
    );
  }

  await validateForeignKeys(
    tx,
    model,
    projectId,
    updated as ChangeFields
  );
}


async function applyDelete(
  tx: TransactionSql,
  context: ApplyContext,
  change: PendingChange
) {
  const { model, projectId } = context;

  const [deleted] = await tx<{
    id: string;
  }[]>`
    update data.${tx(model.name)}

    set deleted_at = clock_timestamp()

    where id = ${change.record_id}
      and project_id = ${projectId}
      and deleted_at is null

    returning id
  `;

  if (!deleted) {
    throw new DomainError(
      "RECORD_NOT_FOUND",
      404
    );
  }
}


export async function applyChange(
  tx: TransactionSql,
  context: ApplyContext,
  change: PendingChange
) {
  const { model } = context;

  if (
    model.id !== change.table_id ||
    model.name !== change.table_name
  ) {
    throw new DomainError(
      "MODEL_DEFINITION_CHANGED",
      409
    );
  }

  const fields = validateWriteFields(
    model,
    change.type,
    change.payload.fields
  );

  switch (change.type) {
    case "CREATE":
      await applyCreate(
        tx,
        context,
        change,
        fields
      );
      break;

    case "UPDATE":
      await applyUpdate(
        tx,
        context,
        change,
        fields
      );
      break;

    case "DELETE":
      await applyDelete(
        tx,
        context,
        change
      );
      break;

    default:
      throw new DomainError(
        "INVALID_CHANGE_TYPE",
        422
      );
  }
}
