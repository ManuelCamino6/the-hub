import "server-only";

import type { TransactionSql } from "postgres";

import { DomainError } from "@/lib/api/domain-error";

import {
  getBiUsername,
} from "./credentials";

import {
  sqlLiteral,
} from "@/lib/protocol/ddl";

function roleIdentifier(projectId: string) {
  const username = getBiUsername(projectId);

  return `"${username}"`;
}

export async function createBiRole(
  tx: TransactionSql,
  projectId: string,
  password: string
) {
  const role = roleIdentifier(projectId);

  await tx.unsafe(`
    create role ${role}
    with
      login
      inherit
      nosuperuser
      nocreatedb
      nocreaterole
      noreplication
      nobypassrls
      connection limit 2
      password ${sqlLiteral(password)}
  `);

  await tx.unsafe(`
    grant hub_bi_reader
    to ${role}
    with inherit true, set false
  `);

  await tx.unsafe(`
    alter role ${role}
    set search_path = analytics, pg_catalog
  `);

  await tx.unsafe(`
    alter role ${role}
    set default_transaction_read_only = on
  `);

  await tx.unsafe(`
    alter role ${role}
    set statement_timeout = '30s'
  `);

  await tx.unsafe(`
    alter role ${role}
    set idle_in_transaction_session_timeout = '15s'
  `);

  await tx.unsafe(`
    alter role ${role}
    set idle_session_timeout = '5min'
  `);

  await tx.unsafe(`
    alter role ${role}
    set work_mem = '4MB'
  `);
}

export async function activateBiRole(
  tx: TransactionSql,
  projectId: string,
  password: string
) {
  const role = roleIdentifier(projectId);

  await tx.unsafe(`
    alter role ${role}
    login
    password ${sqlLiteral(password)}
  `);
}

export async function disableBiRole(
  tx: TransactionSql,
  projectId: string
) {
  const role = roleIdentifier(projectId);

  await tx.unsafe(`
    alter role ${role}
    nologin password null
  `);
}

export async function biRoleExists(
  tx: TransactionSql,
  projectId: string
) {
  const username = getBiUsername(projectId);

  const [result] = await tx<{
    exists: boolean;
  }[]>`
    select exists (
      select 1
      from pg_roles
      where rolname = ${username}
    ) as exists
  `;

  return result.exists;
}

export async function requireBiRole(
  tx: TransactionSql,
  projectId: string
) {
  if (!(await biRoleExists(tx, projectId))) {
    throw new DomainError(
      "BI_ROLE_NOT_FOUND",
      409
    );
  }
}