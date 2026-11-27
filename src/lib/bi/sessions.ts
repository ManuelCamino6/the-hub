import "server-only";

import { getDatabase } from "@/lib/db";

import { getBiUsername } from "./credentials";

export async function terminateBiSessions(
  projectId: string
) {
  const sql = getDatabase();

  const username = getBiUsername(projectId);

  const results = await sql<{
    pid: number;
    terminated: boolean;
  }[]>`
    select
      pid,
      pg_terminate_backend(pid, 5000)
        as terminated

    from pg_stat_activity

    where usename = ${username}
      and backend_type = 'client backend'
      and pid <> pg_backend_pid()
  `;

  return {
    requested: results.length,

    terminated: results.filter(
      (result) => result.terminated
    ).length,

    complete: results.every(
      (result) => result.terminated
    ),
  };
}