
import "server-only";

import type { TransactionSql } from "postgres";

import { DomainError } from "@/lib/api/domain-error";

import {
  authenticateConnector,
} from "@/lib/connectors/auth";

import type {
  InstanceStatus,
  InstanceOperationStatus,
} from "@/lib/instances/schemas";

import type {
  ConnectorStatus,
} from "@/lib/connectors/schemas";

export type OperationInstance = {
  id: string;
  project_id: string;
  connector_id: string;
  status: InstanceStatus;
  operation_status: InstanceOperationStatus;
};

export async function lockOperationInstance(
  tx: TransactionSql,
  tokenHash: string,
  instanceId: string
) {
  const [reference] = await tx<{
    project_id: string;
    development_id: string;
  }[]>`
    select
      i.project_id,
      c.project_id as development_id

    from platform.instances i

    join platform.connectors c
      on c.id = i.connector_id

    where i.id = ${instanceId}
      and c.token_hash = ${tokenHash}
      and c.deleted_at is null
  `;

  if (!reference) {
    await authenticateConnector(
      tx,
      tokenHash
    );

    throw new DomainError(
      "INSTANCE_NOT_FOUND",
      404
    );
  }

  await tx`
    select id
    from platform.projects

    where id in (
      ${reference.project_id},
      ${reference.development_id}
    )

    order by id

    for update
  `;

  const connector =
    await authenticateConnector(
      tx,
      tokenHash
    );

  const [instance] = await tx<
    OperationInstance[]
  >`
    select
      i.id,
      i.project_id,
      i.connector_id,
      i.status,
      i.operation_status

    from platform.instances i

    join platform.projects p
      on p.id = i.project_id

    where i.id = ${instanceId}
      and i.connector_id = ${connector.id}
      and i.deleted_at is null
      and p.type = 'BUSINESS'
      and p.deleted_at is null

    for update of i
  `;

  if (!instance) {
    throw new DomainError(
      "INSTANCE_NOT_FOUND",
      404
    );
  }

  return {
    connector,
    instance,
  };
}

export async function requireOperationalInstance(
  tx: TransactionSql,
  instance: OperationInstance,
  connectorStatus: ConnectorStatus
) {
  if (connectorStatus === "IN_DEVELOPMENT") {
    throw new DomainError(
      "CONNECTOR_NOT_OPERATIONAL",
      409
    );
  }

  const [authorization] = await tx<{
    allowed: boolean;
  }[]>`
    select exists (
      select 1
      from platform.connectors c

      where c.id = ${instance.connector_id}
        and c.deleted_at is null

        and (
          c.visibility = 'PUBLIC'

          or exists (
            select 1
            from platform.connectors_permissions cp

            where cp.connector_id = c.id
              and cp.project_id = ${instance.project_id}
          )
        )
    ) as allowed
  `;

  if (
    !authorization.allowed ||
    instance.status === "UNAUTHORIZED"
  ) {
    throw new DomainError(
      "INSTANCE_UNAUTHORIZED",
      403
    );
  }

  if (instance.status !== "OK") {
    throw new DomainError(
      "INSTANCE_INCOMPLETE",
      409
    );
  }

  if (
    instance.operation_status !== "ACTIVE"
  ) {
    throw new DomainError(
      "INSTANCE_PAUSED",
      409
    );
  }
}
