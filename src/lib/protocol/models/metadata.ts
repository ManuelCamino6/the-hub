
import "server-only";

import type { TransactionSql } from "postgres";

import {
  DomainError,
} from "@/lib/api/domain-error";

import type {
  ColumnDefinition,
} from "@/lib/protocol/schemas";

export type ModelMetadata = {
  id: string;
  name: string;
  version_id: string;
  version: number;
  columns: ColumnDefinition[];
};

export async function getModelMetadata(
  tx: TransactionSql,
  version: number,
  tableName: string
): Promise<ModelMetadata> {
  const [model] = await tx<
    Omit<ModelMetadata, "columns">[]
  >`
    select
      t.id,
      t.name,
      t.version_id,
      v.number as version

    from protocol.tables t

    join protocol.versions v
      on v.id = t.version_id

    where v.active = true
      and v.number = ${version}
      and t.name = ${tableName}
      and t.deleted_at is null
  `;

  if (!model) {
    throw new DomainError(
      "MODEL_NOT_FOUND",
      404
    );
  }

  const columns = await tx<
    ColumnDefinition[]
  >`
    select
      name,
      description,
      type,
      foreign_key,
      constant,
      nullable,
      default_value,
      possible_values

    from protocol.columns

    where table_id = ${model.id}

    order by created_at, name
  `;

  return {
    ...model,
    columns,
  };
}

export function modelColumnMap(
  model: ModelMetadata
) {
  return new Map(
    model.columns.map((column) => [
      column.name,
      column,
    ])
  );
}


export function modelIdentifier(
  value: string
): string {
  if (
    !/^[a-z][a-z0-9_]{0,62}$/.test(value)
  ) {
    throw new DomainError(
      "INVALID_SQL_IDENTIFIER",
      422
    );
  }

  return `"${value}"`;
}

export function modelDataTable(
  model: ModelMetadata
): string {
  return `data.${modelIdentifier(model.name)}`;
}

export function modelReferenceTable(
  model: ModelMetadata
): string {
  return `data.${modelIdentifier(
    `${model.name}_ref`
  )}`;
}
