import "server-only";

import { getDatabase } from "@/lib/db";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  decodeCursor,
  paginate,
} from "@/lib/api/pagination";

import type {
  ListNewsInput,
  News,
} from "./schemas";

export async function listNews(
  userId: string,
  input: ListNewsInput
) {
  const sql = getDatabase();

  let cursor;

  try {
    cursor = decodeCursor(input.cursor);
  } catch {
    throw new DomainError(
      "INVALID_CURSOR",
      422
    );
  }

  return sql.begin(
    "isolation level repeatable read read only",

    async (tx) => {
      const [membership] = await tx`
        select p.id

        from platform.projects p

        join platform.users_per_project m
          on m.project_id = p.id

        where p.id = ${input.project_id}

          and m.user_id = ${userId}

          and p.deleted_at is null
      `;

      if (!membership) {
        throw new DomainError(
          "NOT_FOUND",
          404
        );
      }

      const rows = await tx<News[]>`
        select
          n.id,
          n.title,
          n.content,

          to_char(
            n.created_at at time zone 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
          ) as created_at

        from platform.news n

        where n.project_id = ${input.project_id}

          and n.deleted_at is null

          ${
            cursor
              ? tx`
                  and (n.created_at, n.id) < (
                    ${cursor.created_at}::timestamptz,
                    ${cursor.id}::uuid
                  )
                `
              : tx``
          }

        order by
          n.created_at desc,
          n.id desc

        limit ${input.limit + 1}
      `;

      return paginate(
        rows,
        input.limit
      );
    }
  );
}