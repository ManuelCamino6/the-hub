
import "server-only";

import type { TransactionSql } from "postgres";

import { getDatabase } from "@/lib/db";
import { DomainError } from "@/lib/api/domain-error";

import {
    createMaterializedTable,
    addModelForeignKey,
    addModelColumn,
    alterModelColumn,
    dropModelColumn,
    renameMaterializedTable,
    dropMaterializedTable,
} from "./ddl";

import { isDeepStrictEqual } from "node:util";

import {
    requireSuperadmin,
    requireModelReader,
} from "./authorization";

import {
    lockModelForWrite,
    lockModelForRead,
} from "./locks";

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
    ModelSummary,
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
            await saveModelColumn(
                tx,
                table.id,
                column
            );
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

        const rows = await tx<ModelSummary[]>`
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

        const [table] = await tx<ModelSummary[]>`
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


async function saveModelColumn(
    tx: TransactionSql,
    tableId: string,
    column: ColumnDefinition
) {
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
      ${tableId},
      ${column.name},
      ${column.description},
      ${column.type},
      ${column.foreign_key},
      ${column.constant},
      ${column.nullable},
      ${column.default_value},
      ${column.possible_values === null
            ? null
            : tx.array(column.possible_values)
        }::varchar[]
    )

    on conflict (table_id, name)
    do update set
      description = excluded.description,
      type = excluded.type,
      foreign_key = excluded.foreign_key,
      constant = excluded.constant,
      nullable = excluded.nullable,
      default_value = excluded.default_value,
      possible_values = excluded.possible_values
  `;
}


async function getModelForWrite(
  tx: TransactionSql,
  tableId: string
) {
  const version = await getActiveVersion(tx);

  const [table] = await tx<{
    id: string;
    name: string;
    description: string | null;
  }[]>`
    select
      id,
      name,
      description

    from protocol.tables

    where id = ${tableId}
      and version_id = ${version.id}
      and deleted_at is null

    for update
  `;

  if (!table) {
    throw new DomainError(
      "MODEL_NOT_FOUND",
      404
    );
  }

  const columns = await tx<ColumnDefinition[]>`
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

    where table_id = ${tableId}

    order by name
  `;

  return {
    table,
    columns,
    version,
  };
}


async function resolveForeignKeyTarget(
  tx: TransactionSql,
  versionId: string,
  foreignKey: string
) {
  const [target] = await tx<{
    name: string;
  }[]>`
    select name

    from protocol.tables

    where id = ${foreignKey}
      and version_id = ${versionId}
      and deleted_at is null
  `;

  if (!target) {
    throw new DomainError(
      "INVALID_FOREIGN_KEY",
      422
    );
  }

  return target.name;
}


function physicalDefinition(
  column: ColumnDefinition
) {
  return {
    type: column.type,
    foreign_key: column.foreign_key,
    nullable: column.nullable,
    default_value: column.default_value,

    possible_values:
      column.possible_values === null
        ? null
        : [...column.possible_values].sort(),
  };
}

function hasPhysicalChanges(
  previous: ColumnDefinition,
  next: ColumnDefinition
) {
  return !isDeepStrictEqual(
    physicalDefinition(previous),
    physicalDefinition(next)
  );
}


export async function updateModelTable(
  userId: string,
  tableId: string,
  input: TableDefinition
) {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    await requireSuperadmin(tx, userId);
    await lockModelForWrite(tx);

    const {
      table,
      columns,
      version,
    } = await getModelForWrite(tx, tableId);

    const [duplicate] = await tx`
      select id

      from protocol.tables

      where version_id = ${version.id}
        and name = ${input.name}
        and id <> ${tableId}
    `;

    if (duplicate) {
      throw new DomainError(
        "MODEL_NAME_ALREADY_EXISTS",
        409
      );
    }

    for (const column of input.columns) {
      validateColumnDefinition(column);

      if (column.foreign_key) {
        await resolveForeignKeyTarget(
          tx,
          version.id,
          column.foreign_key
        );
      }
    }

    const previousColumns = new Map(
      columns.map((column) => [
        column.name,
        column,
      ])
    );

    const nextColumns = new Map(
      input.columns.map((column) => [
        column.name,
        column,
      ])
    );

    if (table.name !== input.name) {
      await renameMaterializedTable(
        tx,
        table.name,
        input.name
      );
    }

    await tx`
      update protocol.tables
      set
        name = ${input.name},
        description = ${input.description}
      where id = ${tableId}
    `;

    for (const previous of columns) {
      if (nextColumns.has(previous.name)) {
        continue;
      }

      await dropModelColumn(
        tx,
        input.name,
        previous.name
      );

      await tx`
        delete from protocol.columns
        where table_id = ${tableId}
          and name = ${previous.name}
      `;
    }

    const foreignKeysToCreate:
      ColumnDefinition[] = [];

    for (const next of input.columns) {
      const previous =
        previousColumns.get(next.name);

      if (!previous) {
        await addModelColumn(
          tx,
          input.name,
          next
        );

        if (next.foreign_key) {
          foreignKeysToCreate.push(next);
        }
      } else if (
        hasPhysicalChanges(previous, next)
      ) {
        await alterModelColumn(
          tx,
          input.name,
          previous,
          next
        );

        if (next.foreign_key) {
          foreignKeysToCreate.push(next);
        }
      }

      await saveModelColumn(
        tx,
        tableId,
        next
      );
    }

    for (const column of foreignKeysToCreate) {
      const targetName =
        await resolveForeignKeyTarget(
          tx,
          version.id,
          column.foreign_key!
        );

      await addModelForeignKey(
        tx,
        input.name,
        column.name,
        targetName
      );
    }

    return {
      id: tableId,
    };
  });
}



export async function deleteModelTable(
  userId: string,
  tableId: string
) {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    await requireSuperadmin(tx, userId);
    await lockModelForWrite(tx);

    const {
      table,
      version,
    } = await getModelForWrite(tx, tableId);

    const [dependency] = await tx`
      select c.id

      from protocol.columns c

      join protocol.tables t
        on t.id = c.table_id

      where c.foreign_key = ${tableId}
        and t.id <> ${tableId}
        and t.version_id = ${version.id}
        and t.deleted_at is null

      limit 1
    `;

    if (dependency) {
      throw new DomainError(
        "MODEL_HAS_DEPENDENCIES",
        409
      );
    }

    await dropMaterializedTable(
      tx,
      table.name
    );

    await tx`
      update protocol.tables
      set deleted_at = now()
      where id = ${tableId}
    `;

    return {
      id: tableId,
    };
  });
}

export async function getAllModelSummaries(
  userId: string
): Promise<ModelSummary[]> {
  const models: ModelSummary[] = [];

  let cursor: string | undefined;

  do {
    const result = await listModelTables(
      userId,
      {
        limit: 200,
        cursor,
      }
    );

    models.push(...result.data);

    cursor = result.next_cursor ?? undefined;
  } while (cursor);

  return models;
}