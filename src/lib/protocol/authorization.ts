
import "server-only";

import type { TransactionSql } from "postgres";

import { DomainError } from "@/lib/api/domain-error";

export async function requireSuperadmin(
  tx: TransactionSql,
  userId: string
) {
  const [admin] = await tx`
    select user_id
    from platform.superadmins
    where user_id = ${userId}
    for share
  `;

  if (!admin) {
    throw new DomainError(
      "FORBIDDEN",
      403
    );
  }
}

export async function requireModelReader(
  tx: TransactionSql,
  userId: string
) {
  const [result] = await tx<{
    allowed: boolean;
  }[]>`
    select (
      exists (
        select 1
        from platform.superadmins
        where user_id = ${userId}
      )

      or exists (
        select 1
        from platform.users_per_project m
        join platform.projects p
          on p.id = m.project_id
        where m.user_id = ${userId}
          and p.type = 'DEVELOPMENT'
          and p.deleted_at is null
      )
    ) as allowed
  `;

  if (!result.allowed) {
    throw new DomainError(
      "FORBIDDEN",
      403
    );
  }
}
