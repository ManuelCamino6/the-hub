import "server-only";

import type {
  TransactionSql,
} from "postgres";

import {
  DomainError,
} from "@/lib/api/domain-error";

import type {
  DevelopmentInstanceSync,
} from "./schemas";

type AuthorizedInstallation = {
  id: string;

  status:
    DevelopmentInstanceSync["status"];

  operation_status:
    DevelopmentInstanceSync["operation_status"];
};

export async function requireDevelopmentInstallation(
  tx: TransactionSql,
  userId: string,
  connectorId: string,
  instanceId: string,
  expectedProjectId?: string
): Promise<AuthorizedInstallation> {
  const [installation] =
    await tx<AuthorizedInstallation[]>`
      select
        i.id,
        i.status,
        i.operation_status

      from platform.instances i

      join platform.connectors c
        on c.id = i.connector_id

      join platform.projects development
        on development.id = c.project_id

      join platform.users_per_project m
        on m.project_id = development.id

      join platform.projects business
        on business.id = i.project_id

      where i.id = ${instanceId}

        and c.id = ${connectorId}

        and (
          ${expectedProjectId ?? null}::uuid is null

          or development.id =
            ${expectedProjectId ?? null}::uuid
        )

        and m.user_id = ${userId}

        and development.type = 'DEVELOPMENT'

        and development.deleted_at is null

        and business.type = 'BUSINESS'

        and business.deleted_at is null

        and c.deleted_at is null

        and i.deleted_at is null
    `;

  if (!installation) {
    throw new DomainError(
      "NOT_FOUND",
      404
    );
  }

  return installation;
}