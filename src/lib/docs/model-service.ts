import "server-only";

import { connection } from "next/server";

import { getDatabase } from "@/lib/db";

import {
  lockModelForRead,
} from "@/lib/protocol/locks";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  publishedModelSchema,
} from "./schemas";

import type {
  PublishedModel,
  PublishedColumn,
  PublishedTable,
} from "./schemas";

type VersionRow = {
  id: string;
  number: number;
  name: string;
  description: string | null;
};

type TableRow = {
  id: string;
  name: string;
  description: string | null;
};

type ColumnRow = PublishedColumn & {
  table_id: string;
};

export async function getPublishedModel():
  Promise<PublishedModel> {

  await connection();

  const sql = getDatabase();

  return sql.begin(async (tx) => {
    await lockModelForRead(tx);

    const [version] = await tx<VersionRow[]>`
      select
        id,
        number,
        name,
        description

      from protocol.versions

      where active = true
    `;

    if (!version) {
      throw new DomainError(
        "MODEL_NOT_AVAILABLE",
        503
      );
    }

    const tables = await tx<TableRow[]>`
      select
        id,
        name,
        description

      from protocol.tables

      where version_id = ${version.id}

        and deleted_at is null

      order by name
    `;

    const columns = await tx<ColumnRow[]>`
      select
        c.table_id,
        c.name,
        c.description,
        c.type,
        c.nullable,
        c.constant,
        c.default_value,
        c.possible_values,

        target.name as foreign_key

      from protocol.columns c

      join protocol.tables t
        on t.id = c.table_id

      left join protocol.tables target
        on target.id = c.foreign_key

        and target.version_id = ${version.id}

        and target.deleted_at is null

      where t.version_id = ${version.id}

        and t.deleted_at is null

      order by
        c.table_id,
        c.created_at,
        c.name
    `;

    const grouped =
      new Map<string, PublishedColumn[]>();

    for (const column of columns) {
      const items =
        grouped.get(column.table_id) ?? [];

      items.push({
        name: column.name,
        description: column.description,
        type: column.type,
        nullable: column.nullable,
        constant: column.constant,
        default_value: column.default_value,
        possible_values: column.possible_values,
        foreign_key: column.foreign_key,
      });

      grouped.set(
        column.table_id,
        items
      );
    }

    const publishedTables:
      PublishedTable[] = tables.map(
        (table) => ({
          name: table.name,
          description: table.description,

          columns:
            grouped.get(table.id) ?? [],
        })
      );

    return publishedModelSchema.parse({
      version: version.number,
      name: version.name,
      description: version.description,
      tables: publishedTables,
    });
  });
}