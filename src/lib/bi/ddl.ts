import "server-only";

import type { TransactionSql } from "postgres";

import {
  dataTable,
  identifier,
} from "@/lib/protocol/ddl";

import type {
  ColumnDefinition,
} from "@/lib/protocol/schemas";

function analyticsView(name: string) {
  return `analytics.${identifier(name)}`;
}

export async function createAnalyticsView(
  tx: TransactionSql,
  tableName: string,
  columns: ColumnDefinition[]
) {
  const table = dataTable(tableName);
  const view = analyticsView(tableName);

  const exposedColumns = [
    "id",
    ...columns.map((column) => column.name),
    "created_at",
  ]
    .map(identifier)
    .join(", ");

  await tx.unsafe(`
    drop policy if exists bi_select
    on ${table}
  `);

  await tx.unsafe(`
    create policy bi_select
    on ${table}
    for select
    to hub_bi_reader
    using (
      project_id = (
        select platform.bi_project_id()
      )
      and deleted_at is null
    )
  `);

  await tx.unsafe(`
    grant select (${exposedColumns})
    on ${table}
    to hub_bi_reader
  `);

  await tx.unsafe(`
    create view ${view}
    with (security_invoker = true)
    as
    select ${exposedColumns}
    from ${table}
  `);

  await tx.unsafe(`
    revoke all on ${view}
    from public, anon, authenticated
  `);

  await tx.unsafe(`
    grant select on ${view}
    to hub_bi_reader
  `);
}

export async function dropAnalyticsView(
  tx: TransactionSql,
  tableName: string
) {
  await tx.unsafe(`
    drop view if exists
    ${analyticsView(tableName)}
  `);
}