import "server-only";

import type {
  TransactionSql,
} from "postgres";

import {
  DomainError,
} from "@/lib/api/domain-error";

import type {
  InstanceSync,
} from "./schemas";

type AuthorizedInstance = {
  id: string;
  project_id: string;

  status: InstanceSync["status"];

  operation_status:
    InstanceSync["operation_status"];

  paused_reason: string | null;

  connector_id: string;
  connector_name: string;

  connector_status:
    InstanceSync["connector"]["status"];
};

export async function requireSyncProject(
  tx: TransactionSql,
  userId: string,
  projectId: string
) {
  const [project] = await tx<{
    id: string;
  }[]>`
    select p.id

    from platform.projects p

    join platform.users_per_project m
      on m.project_id = p.id

    where p.id = ${projectId}

      and m.user_id = ${userId}

      and p.type = 'BUSINESS'

      and p.deleted_at is null
  `;

  if (!project) {
    throw new DomainError(
      "NOT_FOUND",
      404
    );
  }

  return project;
}

export async function requireSyncInstance(
  tx: TransactionSql,
  userId: string,
  instanceId: string,
  expectedProjectId?: string
) {
  const [instance] =
    await tx<AuthorizedInstance[]>`
      select
        i.id,
        i.project_id,
        i.status,
        i.operation_status,
        i.paused_reason,

        c.id as connector_id,

        c.name as connector_name,

        c.status as connector_status

      from platform.instances i

      join platform.projects p
        on p.id = i.project_id

      join platform.users_per_project m
        on m.project_id = p.id

      join platform.connectors c
        on c.id = i.connector_id

      where i.id = ${instanceId}

        and (
        ${expectedProjectId ?? null}::uuid is null

        or i.project_id =
            ${expectedProjectId ?? null}::uuid
        )

        and m.user_id = ${userId}

        and p.type = 'BUSINESS'

        and p.deleted_at is null

        and i.deleted_at is null
    `;

  if (!instance) {
    throw new DomainError(
      "NOT_FOUND",
      404
    );
  }

  return instance;
}