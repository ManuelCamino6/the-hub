
import "server-only";

import { randomUUID } from "node:crypto";

import { getDatabase } from "@/lib/db";
import { encrypt } from "@/lib/security/encryption";
import { DomainError } from "@/lib/api/domain-error";

import {
  normalizeParameter,
  type ParameterDefinition,
} from "./parameters";

import {
  validateGrantedPermissions,
  getOriginIds,
} from "./permissions";

import type {
  CreateInstanceInput,
  InstanceStatus,
  InstancePermission,
} from "./schemas";

import type {
  ModelPermission,
} from "@/lib/connectors/schemas";

import type { TransactionSql } from "postgres";

export async function createInstance(
  userId: string,
  input: CreateInstanceInput
) {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    // Bloquear los proyectos involucrados.
    const projects = await tx`
      select p.id, p.type, p.deleted_at
      from platform.projects p
      where p.id = ${input.project_id}
        or p.id = (
          select c.project_id
          from platform.connectors c
          where c.id = ${input.connector_id}
        )
      order by p.id
      for update
    `;

    const business = projects.find(
      (project) => project.id === input.project_id
    );

    if (
      !business ||
      business.type !== "BUSINESS" ||
      business.deleted_at
    ) {
      throw new DomainError("PROJECT_NOT_FOUND", 404);
    }

    const [membership] = await tx`
      select role
      from platform.users_per_project
      where project_id = ${input.project_id}
        and user_id = ${userId}
    `;

    if (!membership) {
      throw new DomainError("PROJECT_NOT_FOUND", 404);
    }

    if (membership.role === "VIEWER") {
      throw new DomainError("FORBIDDEN", 403);
    }

    // Coordinar con las modificaciones del conector.
    const [connector] = await tx`
      select id
      from platform.connectors
      where id = ${input.connector_id}
        and deleted_at is null
      for update
    `;

    if (!connector) {
      throw new DomainError("CONNECTOR_NOT_FOUND", 404);
    }

    const [availability] = await tx`
      select platform.connector_available_for(
        ${input.project_id}::uuid,
        ${input.connector_id}::uuid
      ) as available
    `;

    if (!availability.available) {
      throw new DomainError("CONNECTOR_NOT_AVAILABLE", 409);
    }

    const definitions = await tx<ParameterDefinition[]>`
      select key, type, required, encrypted
      from platform.connectors_parameters
      where connector_id = ${input.connector_id}
    `;

    const requested = await tx<ModelPermission[]>`
      select
        cp.table_id,
        cp.can_list,
        cp.can_send_post,
        cp.can_receive_post,
        cp.can_send_update,
        cp.can_receive_update,
        cp.can_send_delete,
        cp.can_receive_delete
      from platform.connectors_models_permissions cp
      join protocol.tables t on t.id = cp.table_id
      join protocol.versions v on v.id = t.version_id
      where cp.connector_id = ${input.connector_id}
        and t.deleted_at is null
        and v.active
    `;

    try {
      validateGrantedPermissions(
        requested,
        input.models_permissions
      );
    } catch {
      throw new DomainError("INVALID_MODEL_PERMISSION");
    }

    const definitionsByKey = new Map(
      definitions.map((item) => [item.key, item])
    );

    const instanceId = randomUUID();

    const parameters: {
      instance_id: string;
      key: string;
      value: string | null;
      encrypted: boolean;
      type: ParameterDefinition["type"];
    }[] = [];

    for (const parameter of input.parameters) {
      const definition =
        definitionsByKey.get(parameter.key);

      if (!definition) {
        throw new DomainError("UNKNOWN_PARAMETER");
      }

      let value: string | null;

      try {
        value = normalizeParameter(
          definition,
          parameter.value
        );
      } catch {
        throw new DomainError("INVALID_PARAMETER");
      }

      if (value !== null && definition.encrypted) {
        value = encrypt(
          value,
          `${instanceId}:${definition.key}`
        );
      }

      parameters.push({
        instance_id: instanceId,
        key: definition.key,
        value,
        encrypted: definition.encrypted,
        type: definition.type,
      });
    }

    const origins = getOriginIds(
      input.models_permissions
    );

    if (origins.length) {
      const validOrigins = await tx`
        select id
        from platform.instances
        where project_id = ${input.project_id}
          and deleted_at is null
          and id = any(${tx.array(origins)}::uuid[])
      `;

      if (validOrigins.length !== origins.length) {
        throw new DomainError("INVALID_ORIGIN");
      }
    }

    await tx`
      insert into platform.instances (
        id, project_id, connector_id, name
      )
      values (
        ${instanceId},
        ${input.project_id},
        ${input.connector_id},
        ${input.name}
      )
    `;

    if (parameters.length) {
      await tx`
        insert into platform.instances_parameters
        ${tx(
          parameters,
          "instance_id",
          "key",
          "value",
          "encrypted",
          "type"
        )}
      `;
    }

    for (const permission of input.models_permissions) {
      await insertPermission(
        tx,
        instanceId,
        permission
      );
    }

    const [result] = await tx<{
      status: InstanceStatus;
    }[]>`
      select platform.recalculate_instance(
        ${instanceId}::uuid
      ) as status
    `;

    await tx`
      select platform.emit_instance_setting(
        ${instanceId}::uuid,
        'INSTANCE_CREATED'
      )
    `;

    return {
      id: instanceId,
      status: result.status,
    };
  });
}

async function insertPermission(
  tx: TransactionSql,
  instanceId: string,
  permission: InstancePermission
) {
  function origins(value: string[] | null) {
    return value === null
      ? null
      : tx.array(value);
  }

  await tx`
    insert into platform.instances_models_permissions (
      instance_id,
      table_id,
      can_list,
      can_send_post,
      can_receive_post,
      can_receive_post_from,
      can_send_update,
      can_receive_update,
      can_receive_update_from,
      can_send_delete,
      can_receive_delete,
      can_receive_delete_from
    )
    values (
      ${instanceId},
      ${permission.table_id},
      ${permission.can_list},
      ${permission.can_send_post},
      ${permission.can_receive_post},
      ${origins(permission.can_receive_post_from)}::uuid[],
      ${permission.can_send_update},
      ${permission.can_receive_update},
      ${origins(permission.can_receive_update_from)}::uuid[],
      ${permission.can_send_delete},
      ${permission.can_receive_delete},
      ${origins(permission.can_receive_delete_from)}::uuid[]
    )
  `;
}


import {
  decodeCursor,
  paginate,
} from "@/lib/api/pagination";

import type {
  Instance,
  ListInstancesInput,
} from "./schemas";

export async function listInstances(
  userId: string,
  input: ListInstancesInput
) {
  const sql = getDatabase();
  const cursor = decodeCursor(input.cursor);

  const [membership] = await sql`
    select m.role
    from platform.users_per_project m
    join platform.projects p
      on p.id = m.project_id
    where m.user_id = ${userId}
      and p.id = ${input.project_id}
      and p.type = 'BUSINESS'
      and p.deleted_at is null
  `;

  if (!membership) {
    throw new DomainError("PROJECT_NOT_FOUND", 404);
  }

  const rows = await sql<Instance[]>`
    select
      i.id,
      i.project_id,
      i.connector_id,
      c.name as connector_name,
      i.name,
      i.status,
      i.operation_status,
      to_char(
        i.created_at at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
      ) as created_at
    from platform.instances i
    join platform.connectors c
      on c.id = i.connector_id
    join platform.projects p
      on p.id = i.project_id
    join platform.users_per_project m
      on m.project_id = p.id
      and m.user_id = ${userId}
    where i.project_id = ${input.project_id}
      and i.deleted_at is null
      and p.deleted_at is null
      and p.type = 'BUSINESS'

      ${input.name
        ? sql`and strpos(
            lower(i.name),
            lower(${input.name})
          ) > 0`
        : sql``}

      ${input.status
        ? sql`and i.status = ${input.status}`
        : sql``}

      ${cursor
        ? sql`and (i.created_at, i.id) <
            (
              ${cursor.created_at}::timestamptz,
              ${cursor.id}::uuid
            )`
        : sql``}

    order by i.created_at desc, i.id desc
    limit ${input.limit + 1}
  `;

  return paginate(rows, input.limit);
}