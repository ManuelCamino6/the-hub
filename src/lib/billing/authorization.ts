import "server-only";

import type { TransactionSql } from "postgres";

import { DomainError } from "@/lib/api/domain-error";

type BillingProject = {
  id: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  deleted_at: Date | null;
};

export async function requireBillingProject(
  tx: TransactionSql,
  userId: string,
  projectId: string,
  options: {
    adminOnly?: boolean;
    allowDeleted?: boolean;
  } = {}
) {
  const [project] = await tx<BillingProject[]>`
    select
      p.id,
      m.role,
      p.deleted_at

    from platform.projects p

    join platform.users_per_project m
      on m.project_id = p.id

    where p.id = ${projectId}
      and m.user_id = ${userId}
      and p.type = 'BUSINESS'
  `;

  if (!project) {
    throw new DomainError(
      "PROJECT_NOT_FOUND",
      404
    );
  }

  if (
    project.deleted_at &&
    (
      !options.allowDeleted ||
      project.role !== "ADMIN"
    )
  ) {
    throw new DomainError(
      "PROJECT_NOT_FOUND",
      404
    );
  }

  if (
    options.adminOnly &&
    project.role !== "ADMIN"
  ) {
    throw new DomainError(
      "FORBIDDEN",
      403
    );
  }

  return project;
}