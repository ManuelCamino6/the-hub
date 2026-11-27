
import "server-only";

import { getDatabase } from "@/lib/db";
import { DomainError } from "@/lib/api/domain-error";

import {
  authenticateConnector,
} from "@/lib/connectors/auth";

import {
  decodeCursor,
  paginate,
} from "@/lib/api/pagination";

import { decrypt } from "@/lib/security/encryption";

import type {
  ConnectorInstance,
  InstancePermission,
  ListConnectorInstancesInput,
} from "./schemas";

export async function listConnectorInstances(
  tokenHash: string,
  input: ListConnectorInstancesInput
) {
  const sql = getDatabase();
  const cursor = decodeCursor(input.cursor);

  return sql.begin(async (tx) => {
    const connector =
      await authenticateConnector(tx, tokenHash);

    const rows = await tx<ConnectorInstance[]>`
      select
        i.id,
        i.project_id,
        i.connector_id,
        i.name,
        i.status,
        i.operation_status,
        i.paused_reason,
        c.name as connector_name,

        to_char(
          i.created_at at time zone 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
        ) as created_at

      from platform.instances i

      join platform.projects p
        on p.id = i.project_id

      join platform.connectors c
        on c.id = i.connector_id

      where i.connector_id = ${connector.id}
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

    return paginate(rows, input.limit);
  });
}

export async function getConnectorInstance(
  tokenHash: string,
  instanceId: string
) {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    const connector =
      await authenticateConnector(tx, tokenHash);

    const [instance] = await tx<ConnectorInstance[]>`
      select
        i.id,
        i.project_id,
        i.connector_id,
        i.name,
        i.status,
        i.operation_status,
        i.paused_reason,
        c.name as connector_name,
        i.created_at::text

      from platform.instances i

      join platform.projects p
        on p.id = i.project_id

      join platform.connectors c
        on c.id = i.connector_id

      where i.id = ${instanceId}
        and i.connector_id = ${connector.id}
        and i.deleted_at is null
        and p.deleted_at is null
        and p.type = 'BUSINESS'

      for share of i
    `;

    if (!instance) {
      throw new DomainError(
        "INSTANCE_NOT_FOUND",
        404
      );
    }

    if (instance.status === "UNAUTHORIZED") {
      throw new DomainError(
        "INSTANCE_UNAUTHORIZED",
        403
      );
    }

    const [authorization] = await tx<{
      allowed: boolean;
    }[]>`
      select exists (
        select 1
        from platform.connectors c
        where c.id = ${connector.id}
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

    if (!authorization.allowed) {
      throw new DomainError(
        "INSTANCE_UNAUTHORIZED",
        403
      );
    }

    const parameters = await tx<{
      key: string;
      type: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN";
      required: boolean;
      encrypted: boolean;
      value: string | null;
    }[]>`
      select
        d.key,
        d.type,
        d.required,
        d.encrypted,
        p.value

      from platform.connectors_parameters d

      left join platform.instances_parameters p
        on p.instance_id = ${instanceId}
        and p.key = d.key
        and p.type = d.type
        and p.encrypted = d.encrypted

      where d.connector_id = ${connector.id}

      order by d.key
    `;

    const permissions = await tx<
      (InstancePermission & {
        table_name: string;
      })[]
    >`
      select
        t.name as table_name,
        ep.can_list,
        ep.can_send_post,
        ep.can_receive_post,
        ep.can_receive_post_from,
        ep.can_send_update,
        ep.can_receive_update,
        ep.can_receive_update_from,
        ep.can_send_delete,
        ep.can_receive_delete,
        ep.can_receive_delete_from

      from platform.effective_instance_permissions ep

      join protocol.tables t
        on t.id = ep.table_id

      join protocol.versions v
        on v.id = t.version_id

      where ep.instance_id = ${instanceId}
        and t.deleted_at is null
        and v.active

      order by ep.table_id
    `;

    const canReadSecrets =
      instance.status === "OK" &&
      instance.operation_status === "ACTIVE" &&
      connector.status !== "IN_DEVELOPMENT";

    return {
      ...instance,

      parameters: parameters.map((parameter) => {
        if (
          parameter.encrypted &&
          !canReadSecrets
        ) {
          return {
            key: parameter.key,
            type: parameter.type,
            required: parameter.required,
            encrypted: true,
            configured: parameter.value !== null,
          };
        }

        const value =
          parameter.encrypted &&
            parameter.value !== null
            ? decrypt(
              parameter.value,
              `${instanceId}:${parameter.key}`
            )
            : parameter.value;

        return {
          ...parameter,
          value,
        };
      }),

      models_permissions: permissions,
    };
  });
}
