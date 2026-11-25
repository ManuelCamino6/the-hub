
import "server-only";

import type { TransactionSql } from "postgres";

import { DomainError } from "@/lib/api/domain-error";

import type {
  ColumnDefinition,
  ColumnType,
} from "./schemas";

import {
  parseMetadataValue,
  validateColumnDefinition,
} from "./values";

const sqlTypes: Record<ColumnType, string> = {
  INT: "integer",
  FLOAT: "double precision",
  VARCHAR: "varchar",
  TEXT: "text",
  BOOLEAN: "boolean",
  TIMESTAMPTZ: "timestamptz",
  UUID: "uuid",
};

export function identifier(value: string) {
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

export function dataTable(name: string) {
  return `data.${identifier(name)}`;
}

export function sqlLiteral(
  value: string | number | boolean | null
) {
  if (value === null) return "NULL";

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new DomainError(
        "INVALID_SQL_LITERAL",
        422
      );
    }

    return String(value);
  }

  if (value.includes("\0")) {
    throw new DomainError(
      "INVALID_SQL_LITERAL",
      422
    );
  }

  return (
    "E'" +
    value
      .replaceAll("\\", "\\\\")
      .replaceAll("'", "''") +
    "'"
  );
}

export function columnSql(
  column: ColumnDefinition
) {
  validateColumnDefinition(column);

  const name = identifier(column.name);
  const type = sqlTypes[column.type];

  let definition = `${name} ${type}`;

  if (column.default_value !== null) {
    const value = parseMetadataValue(
      column.type,
      column.default_value
    );

    definition +=
      ` DEFAULT ${sqlLiteral(value)}::${type}`;
  }

  if (!column.nullable) {
    definition += " NOT NULL";
  }

  if (column.possible_values) {
    const values = column.possible_values.map(
      (value) => {
        const parsed = parseMetadataValue(
          column.type,
          value
        );

        return `${sqlLiteral(parsed)}::${type}`;
      }
    );

    definition +=
      ` CHECK (${name} IN (${values.join(", ")}))`;
  }

  return definition;
}

export async function createMaterializedTable(
  tx: TransactionSql,
  name: string,
  columns: ColumnDefinition[]
) {
  const table = dataTable(name);
  const references = dataTable(`${name}_ref`);

  const definitions = [
    "id uuid primary key default gen_random_uuid()",

    "project_id uuid not null " +
      "references platform.projects(id)",

    "created_at timestamptz not null default now()",

    "deleted_at timestamptz",

    "unique(project_id, id)",

    ...columns.map(columnSql),
  ];

  await tx.unsafe(`
    create table ${table} (
      ${definitions.join(",\n")}
    )
  `);

  await tx.unsafe(`
    create table ${references} (
      id uuid not null
        references ${table}(id),

      instance_id uuid not null
        references platform.instances(id),

      ref_id varchar not null,

      primary key(instance_id, ref_id),

      unique(id, instance_id)
    )
  `);

  await tx.unsafe(`
    create index on ${table}
      (project_id, created_at desc, id desc)
      where deleted_at is null
  `);

  await tx.unsafe(`
    alter table ${table}
      enable row level security
  `);

  await tx.unsafe(`
    alter table ${references}
      enable row level security
  `);

  await tx.unsafe(`
    revoke all on ${table}
    from public, anon, authenticated
  `);

  await tx.unsafe(`
    revoke all on ${references}
    from public, anon, authenticated
  `);
}


export async function addModelForeignKey(
  tx: TransactionSql,
  tableName: string,
  columnName: string,
  targetTableName: string
) {
  await tx.unsafe(`
    alter table ${dataTable(tableName)}

    add foreign key (
      project_id,
      ${identifier(columnName)}
    )

    references ${dataTable(targetTableName)} (
      project_id,
      id
    )
  `);
}
