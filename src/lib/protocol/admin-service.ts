
import "server-only";

import type { TransactionSql } from "postgres";

import { getDatabase } from "@/lib/db";
import { DomainError } from "@/lib/api/domain-error";

import {
  requireSuperadmin,
  requireModelReader,
} from "./authorization";

import {
  lockModelForWrite,
  lockModelForRead,
} from "./locks";

import {
  createMaterializedTable,
  addModelForeignKey,
} from "./ddl";

import {
  validateColumnDefinition,
} from "./values";

import {
  decodeCursor,
  paginate,
} from "@/lib/api/pagination";

import type {
  TableDefinition,
  ListTablesInput,
  ColumnDefinition,
} from "./schemas";

async function getActiveVersion(
  tx: TransactionSql
) {
  const [version] = await tx<{
    id: string;
    number: number;
  }[]>`
    select id, number
    from protocol.versions
    where active
  `;

  if (!version) {
    throw new DomainError(
      "MODEL_VERSION_NOT_FOUND",
      404
    );
  }

  return version;
}

export async function createModelTable(
  userId: string,
  input: TableDefinition
) {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    await requireSuperadmin(tx, userId);
    await lockModelForWrite(tx);

    const version = await getActiveVersion(tx);

    const [existing] = await tx`
      select id
      from protocol.tables
      where version_id = ${version.id}
        and name = ${input.name}
    `;

    if (existing) {
      throw new DomainError(
        "MODEL_NAME_ALREADY_EXISTS",
        409
      );
    }

    for (const column of input.columns) {
      validateColumnDefinition(column);
    }

    const [table] = await tx<{
      id: string;
    }[]>`
      insert into protocol.tables (
        version_id,
        name,
        description
      )
      values (
        ${version.id},
        ${input.name},
        ${input.description}
      )
      returning id
    `;

    for (const column of input.columns) {
      await tx`
        insert into protocol.columns (
          table_id,
          name,
          description,
          type,
          foreign_key,
          constant,
          nullable,
          default_value,
          possible_values
        )
        values (
          ${table.id},
          ${column.name},
          ${column.description},
          ${column.type},
          ${column.foreign_key},
          ${column.constant},
          ${column.nullable},
          ${column.default_value},
          ${
            column.possible_values === null
              ? null
              : tx.array(column.possible_values)
          }::varchar[]
        )
      `;
    }

    await createMaterializedTable(
      tx,
      input.name,
      input.columns
    );

    for (const column of input.columns) {
      if (!column.foreign_key) continue;

      const [target] = await tx<{
        name: string;
      }[]>`
        select name
        from protocol.tables
        where id = ${column.foreign_key}
          and version_id = ${version.id}
          and deleted_at is null
      `;

      if (!target) {
        throw new DomainError(
          "INVALID_FOREIGN_KEY",
          422
        );
      }

      await addModelForeignKey(
        tx,
        input.name,
        column.name,
        target.name
      );
    }

    return {
      id: table.id,
    };
  });
}


type ModelTable = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export async function listModelTables(
  userId: string,
  input: ListTablesInput
) {
  const sql = getDatabase();
  const cursor = decodeCursor(input.cursor);

  return sql.begin(async (tx) => {
    await lockModelForRead(tx);
    await requireModelReader(tx, userId);

    const version = await getActiveVersion(tx);

    const rows = await tx<ModelTable[]>`
      select
        id,
        name,
        description,

        to_char(
          created_at at time zone 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
        ) as created_at

      from protocol.tables

      where version_id = ${version.id}
        and deleted_at is null

        and (
          ${input.name ?? null}::text is null

          or strpos(
            lower(name),
            lower(${input.name ?? ""})
          ) > 0
        )

        and (
          ${cursor?.id ?? null}::uuid is null

          or (created_at, id) < (
            ${cursor?.created_at ?? null}::timestamptz,
            ${cursor?.id ?? null}::uuid
          )
        )

      order by
        protocol.tables.created_at desc,
        id desc

      limit ${input.limit + 1}
    `;

    return paginate(rows, input.limit);
  });
}


export async function getModelTable(
  userId: string,
  tableId: string
) {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    await lockModelForRead(tx);
    await requireModelReader(tx, userId);

    const version = await getActiveVersion(tx);

    const [table] = await tx<ModelTable[]>`
      select
        id,
        name,
        description,

        to_char(
          created_at at time zone 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
        ) as created_at

      from protocol.tables

      where id = ${tableId}
        and version_id = ${version.id}
        and deleted_at is null
    `;

    if (!table) {
      throw new DomainError(
        "MODEL_NOT_FOUND",
        404
      );
    }

    const columns = await tx<
      (ColumnDefinition & { id: string })[]
    >`
      select
        id,
        name,
        description,
        type,
        foreign_key,
        constant,
        nullable,
        default_value,
        possible_values

      from protocol.columns

      where table_id = ${tableId}

      order by created_at, name
    `;

    return {
      ...table,
      columns,
    };
  });
}
