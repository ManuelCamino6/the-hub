
import "server-only";

import { getDatabase } from "@/lib/db";
import { DomainError } from "@/lib/api/domain-error";

import {
  decodeCursor,
  paginate,
} from "@/lib/api/pagination";

import type {
  ConnectorInstallation,
  ListInstallationsInput,
} from "./schemas";

type InstallationRow =
  Omit<ConnectorInstallation, "instance_id"> & {
    id: string;
  };

export async function listDevelopmentInstallations(
  userId: string,
  input: ListInstallationsInput
) {
  const sql = getDatabase();
  const cursor = decodeCursor(input.cursor);

  return sql.begin(async (tx) => {
    await tx`
      set transaction isolation level repeatable read
      read only
    `;

    const [connector] = await tx`
      select c.id

      from platform.connectors c

      join platform.projects p
        on p.id = c.project_id

      join platform.users_per_project m
        on m.project_id = p.id

      where c.id = ${input.connector_id}
        and m.user_id = ${userId}
        and c.deleted_at is null
        and p.deleted_at is null
        and p.type = 'DEVELOPMENT'
    `;

    if (!connector) {
      throw new DomainError(
        "CONNECTOR_NOT_FOUND",
        404
      );
    }

    const rows = await tx<InstallationRow[]>`
      select
        i.id,
        i.status,
        i.operation_status,

        to_char(
          i.created_at at time zone 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
        ) as created_at,

        metrics.pending,
        metrics.failed,
        metrics.last_confirmed_at

      from platform.instances i

      join platform.projects p
        on p.id = i.project_id

      cross join lateral (
        select
          count(*) filter (
            where pr.status = 'PENDING'
          )::integer as pending,

          count(*) filter (
            where pr.status = 'FAILED'
          )::integer as failed,

          max(pr.confirmed_at) filter (
            where pr.status = 'OK'
          )::text as last_confirmed_at

        from protocol.propagations pr
        where pr.instance_id = i.id
      ) metrics

      where i.connector_id = ${input.connector_id}
        and i.deleted_at is null
        and p.deleted_at is null
        and p.type = 'BUSINESS'

        and (
          ${input.status ?? null}::text is null
          or i.status::text = ${input.status ?? null}
        )

        and (
          ${cursor?.id ?? null}::uuid is null
          or (i.created_at, i.id) < (
            ${cursor?.created_at ?? null}::timestamptz,
            ${cursor?.id ?? null}::uuid
          )
        )

      order by i.created_at desc, i.id desc
      limit ${input.limit + 1}
    `;

    const result = paginate(rows, input.limit);

    return {
      data: result.data.map(
        ({ id, ...installation }) => ({
          instance_id: id,
          ...installation,
        })
      ),

      next_cursor: result.next_cursor,
    };
  });
}


export async function getDevelopmentInstallation(
  userId: string,
  instanceId: string
): Promise<ConnectorInstallation> {
  const sql = getDatabase();

  const [installation] = await sql<
    ConnectorInstallation[]
  >`
    select
      i.id as instance_id,
      i.status,
      i.operation_status,
      i.created_at::text,

      metrics.pending,
      metrics.failed,
      metrics.last_confirmed_at

    from platform.instances i

    join platform.connectors c
      on c.id = i.connector_id

    join platform.projects d
      on d.id = c.project_id

    join platform.projects b
      on b.id = i.project_id

    join platform.users_per_project m
      on m.project_id = d.id

    cross join lateral (
      select
        count(*) filter (
          where pr.status = 'PENDING'
        )::integer as pending,

        count(*) filter (
          where pr.status = 'FAILED'
        )::integer as failed,

        max(pr.confirmed_at) filter (
          where pr.status = 'OK'
        )::text as last_confirmed_at

      from protocol.propagations pr
      where pr.instance_id = i.id
    ) metrics

    where i.id = ${instanceId}
      and m.user_id = ${userId}
      and i.deleted_at is null
      and c.deleted_at is null
      and d.deleted_at is null
      and b.deleted_at is null
      and d.type = 'DEVELOPMENT'
      and b.type = 'BUSINESS'
  `;

  if (!installation) {
    throw new DomainError(
      "INSTANCE_NOT_FOUND",
      404
    );
  }

  return installation;
}