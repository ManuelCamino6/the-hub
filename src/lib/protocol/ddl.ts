
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

export function columnTypeSql(type: ColumnType) {
  return sqlTypes[type];
}

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
  const type = columnTypeSql(column.type);

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


export async function dropColumnConstraints(
  tx: TransactionSql,
  tableName: string,
  columnName: string
) {
  const constraints = await tx<{
    name: string;
  }[]>`
    select c.conname as name

    from pg_constraint c

    join pg_class t
      on t.oid = c.conrelid

    join pg_namespace n
      on n.oid = t.relnamespace

    join pg_attribute a
      on a.attrelid = t.oid
      and a.attnum = any(c.conkey)

    where n.nspname = 'data'
      and t.relname = ${tableName}
      and a.attname = ${columnName}
      and c.contype in ('c', 'f')
  `;

  for (const constraint of constraints) {
    await tx.unsafe(`
      alter table ${dataTable(tableName)}
      drop constraint ${identifier(constraint.name)}
    `);
  }
}


export async function alterModelColumn(
  tx: TransactionSql,
  tableName: string,
  previous: ColumnDefinition,
  next: ColumnDefinition
) {
  validateColumnDefinition(next);

  const table = dataTable(tableName);
  const column = identifier(next.name);
  const type = columnTypeSql(next.type);

  await dropColumnConstraints(
    tx,
    tableName,
    previous.name
  );

  await tx.unsafe(`
    alter table ${table}
    alter column ${column}
    drop default
  `);

  if (previous.type !== next.type) {
    await tx.unsafe(`
      alter table ${table}
      alter column ${column}
      type ${type}
      using ${column}::${type}
    `);
  }

  if (next.default_value !== null) {
    const value = parseMetadataValue(
      next.type,
      next.default_value
    );

    await tx.unsafe(`
      alter table ${table}
      alter column ${column}
      set default ${sqlLiteral(value)}::${type}
    `);
  }

  await tx.unsafe(`
    alter table ${table}
    alter column ${column}
    ${next.nullable ? "drop" : "set"} not null
  `);

  if (next.possible_values) {
    const values = next.possible_values.map(
      (value) => {
        const parsed = parseMetadataValue(
          next.type,
          value
        );

        return `${sqlLiteral(parsed)}::${type}`;
      }
    );

    await tx.unsafe(`
      alter table ${table}
      add check (
        ${column} in (${values.join(", ")})
      )
    `);
  }
}


export async function addModelColumn(
  tx: TransactionSql,
  tableName: string,
  column: ColumnDefinition
) {
  await tx.unsafe(`
    alter table ${dataTable(tableName)}
    add column ${columnSql(column)}
  `);
}

export async function dropModelColumn(
  tx: TransactionSql,
  tableName: string,
  columnName: string
) {
  await tx.unsafe(`
    alter table ${dataTable(tableName)}
    drop column ${identifier(columnName)}
  `);
}

export async function renameMaterializedTable(
  tx: TransactionSql,
  previousName: string,
  nextName: string
) {
  await tx.unsafe(`
    alter table ${dataTable(previousName)}
    rename to ${identifier(nextName)}
  `);

  await tx.unsafe(`
    alter table ${dataTable(`${previousName}_ref`)}
    rename to ${identifier(`${nextName}_ref`)}
  `);
}

export async function dropMaterializedTable(
  tx: TransactionSql,
  tableName: string
) {
  await tx.unsafe(`
    drop table ${dataTable(`${tableName}_ref`)}
  `);

  await tx.unsafe(`
    drop table ${dataTable(tableName)}
  `);
}
