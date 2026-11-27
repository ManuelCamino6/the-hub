import "server-only";

import type { Sql, TransactionSql } from "postgres";

import { DomainError } from "@/lib/api/domain-error";

export async function requireBiAdmin(
    sql: Sql | TransactionSql,
    userId: string,
    projectId: string,
    lock = false
) {
    const [project] = await sql<{
        id: string;
        type: "BUSINESS" | "DEVELOPMENT";
        role: "ADMIN" | "EDITOR" | "VIEWER" | null;
    }[]>`
        select
            p.id,
            p.type,
            m.role

        from platform.projects p

        left join platform.users_per_project m
            on m.project_id = p.id
            and m.user_id = ${userId}

        where p.id = ${projectId}
            and p.deleted_at is null

        ${lock ? sql`for update of p` : sql``}
    `;

    if (!project || !project.role) {
        throw new DomainError(
            "PROJECT_NOT_FOUND",
            404
        );
    }

    if (project.type !== "BUSINESS") {
        throw new DomainError(
            "INVALID_PROJECT_TYPE",
            422
        );
    }

    if (project.role !== "ADMIN") {
        throw new DomainError(
            "FORBIDDEN",
            403
        );
    }

    return project;
}