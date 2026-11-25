
import "server-only";

import { randomUUID } from "node:crypto";

import { getDatabase } from "@/lib/db";
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
  InstanceDetail,
  InstanceParameterDetail,
  UpdateInstanceInput,
} from "./schemas";

import { isDeepStrictEqual } from "node:util";

import {
  encrypt,
  decrypt,
} from "@/lib/security/encryption";

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


export async function getInstance(
  userId: string,
  instanceId: string
): Promise<InstanceDetail> {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    await tx`
      set transaction isolation level repeatable read
      read only
    `;

    const [instance] = await tx<
      Omit<
        InstanceDetail,
        "parameters" | "models_permissions"
      >[]
    >`
      select
        i.id,
        i.project_id,
        i.connector_id,
        i.name,
        i.status,
        i.operation_status,
        i.paused_reason,
        i.paused_at::text,
        i.created_at::text,
        c.name as connector_name,
        c.status as connector_status,
        (c.deleted_at is not null)
          as connector_deleted
      from platform.instances i
      join platform.projects p
        on p.id = i.project_id
      join platform.connectors c
        on c.id = i.connector_id
      join platform.users_per_project m
        on m.project_id = i.project_id
      where i.id = ${instanceId}
        and m.user_id = ${userId}
        and i.deleted_at is null
        and p.deleted_at is null
        and p.type = 'BUSINESS'
    `;

    if (!instance) {
      throw new DomainError(
        "INSTANCE_NOT_FOUND",
        404
      );
    }

    const parameters = await tx<
      InstanceParameterDetail[]
    >`
      select
        d.key,
        d.type,
        d.required,
        d.encrypted,
        (p.value is not null) as configured,

        case
          when d.encrypted then null
          else p.value
        end as value

      from platform.connectors_parameters d

      left join platform.instances_parameters p
        on p.instance_id = ${instanceId}
        and p.key = d.key
        and p.type = d.type
        and p.encrypted = d.encrypted

      where d.connector_id = ${instance.connector_id}

      order by d.key
    `;

    const permissions = await tx<
      InstancePermission[]
    >`
      select
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

      from platform.effective_instance_permissions
      where instance_id = ${instanceId}
      order by table_id
    `;

    return {
      ...instance,

      parameters: parameters.map((parameter) => {
        if (!parameter.encrypted) {
          return parameter;
        }

        return {
          key: parameter.key,
          type: parameter.type,
          required: parameter.required,
          encrypted: true,
          configured: parameter.configured,
        };
      }),

      models_permissions: permissions,
    };
  });
}


async function lockInstanceForWrite(
  tx: TransactionSql,
  userId: string,
  instanceId: string
) {
  const [reference] = await tx`
    select
      i.project_id,
      i.connector_id,
      c.project_id as development_id

    from platform.instances i

    join platform.connectors c
      on c.id = i.connector_id

    join platform.users_per_project m
      on m.project_id = i.project_id
      and m.user_id = ${userId}

    where i.id = ${instanceId}
      and i.deleted_at is null
  `;

  if (!reference) {
    throw new DomainError(
      "INSTANCE_NOT_FOUND",
      404
    );
  }

  const projects = await tx`
    select id, type, deleted_at
    from platform.projects

    where id in (
      ${reference.project_id},
      ${reference.development_id}
    )

    order by id
    for update
  `;

  const business = projects.find(
    (project) =>
      project.id === reference.project_id
  );

  if (
    !business ||
    business.deleted_at ||
    business.type !== "BUSINESS"
  ) {
    throw new DomainError(
      "PROJECT_NOT_FOUND",
      404
    );
  }

  const [membership] = await tx`
    select role
    from platform.users_per_project
    where project_id = ${reference.project_id}
      and user_id = ${userId}
  `;

  if (!membership) {
    throw new DomainError(
      "INSTANCE_NOT_FOUND",
      404
    );
  }

  if (
    membership.role !== "ADMIN" &&
    membership.role !== "EDITOR"
  ) {
    throw new DomainError("FORBIDDEN", 403);
  }

  const [connector] = await tx`
    select id, status, deleted_at
    from platform.connectors
    where id = ${reference.connector_id}
    for update
  `;

  const [instance] = await tx`
    select *
    from platform.instances
    where id = ${instanceId}
      and deleted_at is null
    for update
  `;

  if (!instance || !connector) {
    throw new DomainError(
      "INSTANCE_NOT_FOUND",
      404
    );
  }

  return {
    instance,
    connector,
  };
}


export async function updateInstance(
  userId: string,
  instanceId: string,
  input: UpdateInstanceInput
) {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    const { instance, connector } =
      await lockInstanceForWrite(
        tx,
        userId,
        instanceId
      );

    if (connector.deleted_at) {
      throw new DomainError(
        "CONNECTOR_DELETED",
        409
      );
    }

    const definitions = await tx<
      ParameterDefinition[]
    >`
      select key, type, required, encrypted
      from platform.connectors_parameters
      where connector_id = ${connector.id}
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

      join protocol.tables t
        on t.id = cp.table_id

      join protocol.versions v
        on v.id = t.version_id

      where cp.connector_id = ${connector.id}
        and t.deleted_at is null
        and v.active
    `;

    try {
      validateGrantedPermissions(
        requested,
        input.models_permissions
      );
    } catch {
      throw new DomainError(
        "INVALID_MODEL_PERMISSION"
      );
    }

    const origins = getOriginIds(
      input.models_permissions
    );

    if (origins.length) {
      const validOrigins = await tx`
        select id
        from platform.instances
        where project_id = ${instance.project_id}
          and deleted_at is null
          and id = any(
            ${tx.array(origins)}::uuid[]
          )
      `;

      if (validOrigins.length !== origins.length) {
        throw new DomainError("INVALID_ORIGIN");
      }
    }

    const stored = await tx<{
      key: string;
      value: string | null;
      encrypted: boolean;
      type: ParameterDefinition["type"];
    }[]>`
      select key, value, encrypted, type
      from platform.instances_parameters
      where instance_id = ${instanceId}
    `;

    const storedByKey = new Map(
      stored.map((item) => [item.key, item])
    );

    const incomingByKey = new Map(
      input.parameters.map((item) => [
        item.key,
        item.value,
      ])
    );

    const definitionsByKey = new Map(
      definitions.map((item) => [
        item.key,
        item,
      ])
    );

    for (const parameter of input.parameters) {
      if (!definitionsByKey.has(parameter.key)) {
        throw new DomainError(
          "UNKNOWN_PARAMETER"
        );
      }
    }

    let parametersChanged = false;

    for (const definition of definitions) {
      const previous = storedByKey.get(
        definition.key
      );

      const provided = incomingByKey.has(
        definition.key
      );

      // Un secreto omitido conserva su valor.
      if (!provided && definition.encrypted) {
        continue;
      }

      let normalized: string | null;

      try {
        normalized = normalizeParameter(
          definition,
          incomingByKey.get(definition.key)
        );
      } catch {
        throw new DomainError(
          "INVALID_PARAMETER"
        );
      }

      // No borrar un secreto obligatorio.
      if (
        definition.encrypted &&
        definition.required &&
        normalized === null
      ) {
        throw new DomainError(
          "REQUIRED_SECRET_CANNOT_BE_CLEARED"
        );
      }

      let previousValue = previous?.value ?? null;

      const compatible =
        previous?.type === definition.type &&
        previous?.encrypted === definition.encrypted;

      if (!compatible) {
        previousValue = null;
      }

      if (
        previousValue !== null &&
        definition.encrypted
      ) {
        previousValue = decrypt(
          previousValue,
          `${instanceId}:${definition.key}`
        );
      }

      if (
        previousValue === normalized &&
        compatible
      ) {
        continue;
      }

      if (!previous && normalized === null) {
        continue;
      }

      parametersChanged = true;

      const value =
        normalized !== null &&
        definition.encrypted
          ? encrypt(
              normalized,
              `${instanceId}:${definition.key}`
            )
          : normalized;

      await tx`
        insert into platform.instances_parameters (
          instance_id,
          key,
          value,
          encrypted,
          type
        )
        values (
          ${instanceId},
          ${definition.key},
          ${value},
          ${definition.encrypted},
          ${definition.type}
        )

        on conflict (instance_id, key)
        do update set
          value = excluded.value,
          encrypted = excluded.encrypted,
          type = excluded.type
      `;
    }

    const previousPermissions = await tx<
      InstancePermission[]
    >`
      select
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
      from platform.instances_models_permissions
      where instance_id = ${instanceId}
    `;

    function canonical(
      permissions: InstancePermission[]
    ) {
      return permissions
        .map((permission) => ({
          ...permission,

          can_receive_post_from:
            permission.can_receive_post_from
              ?.slice().sort() ?? null,

          can_receive_update_from:
            permission.can_receive_update_from
              ?.slice().sort() ?? null,

          can_receive_delete_from:
            permission.can_receive_delete_from
              ?.slice().sort() ?? null,
        }))
        .sort((a, b) =>
          a.table_id.localeCompare(b.table_id)
        );
    }

    const permissionsChanged =
      !isDeepStrictEqual(
        canonical(previousPermissions),
        canonical(input.models_permissions)
      );

    if (permissionsChanged) {
      await tx`
        delete from
          platform.instances_models_permissions
        where instance_id = ${instanceId}
      `;

      for (
        const permission of input.models_permissions
      ) {
        await insertPermission(
          tx,
          instanceId,
          permission
        );
      }
    }

    const nameChanged =
      instance.name !== input.name;

    if (nameChanged) {
      await tx`
        update platform.instances
        set name = ${input.name}
        where id = ${instanceId}
      `;
    }

    const [result] = await tx<{
      status: InstanceStatus;
    }[]>`
      select platform.recalculate_instance(
        ${instanceId}::uuid
      ) as status
    `;

    const statusChanged =
      instance.status !== result.status;

    if (
      parametersChanged ||
      permissionsChanged ||
      statusChanged
    ) {
      await tx`
        select platform.emit_instance_setting(
          ${instanceId}::uuid,
          'INSTANCE_UPDATED'
        )
      `;

      await tx`
        insert into platform.news (
          project_id,
          title,
          content
        )
        values (
          ${instance.project_id},
          'INSTANCE_UPDATED',
          ${input.name}
        )
      `;
    }

    return {
      id: instanceId,
      status: result.status,
    };
  });
}


export async function getInstalledConnectorDefinition(
  userId: string,
  instanceId: string
) {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    await tx`
      set transaction isolation level repeatable read
      read only
    `;

    const [connector] = await tx`
      select
        c.id,
        c.name,
        c.description,
        c.status,
        c.visibility,
        c.created_at::text,
        null::text as image_url

      from platform.instances i

      join platform.connectors c
        on c.id = i.connector_id

      join platform.projects p
        on p.id = i.project_id

      join platform.users_per_project m
        on m.project_id = p.id

      where i.id = ${instanceId}
        and m.user_id = ${userId}
        and m.role in ('ADMIN', 'EDITOR')
        and p.type = 'BUSINESS'
        and p.deleted_at is null
        and i.deleted_at is null
        and c.deleted_at is null
    `;

    if (!connector) {
      throw new DomainError(
        "CONNECTOR_NOT_FOUND",
        404
      );
    }

    const parameters = await tx<
      ParameterDefinition[]
    >`
      select key, type, required, encrypted
      from platform.connectors_parameters
      where connector_id = ${connector.id}
      order by key
    `;

    const models_permissions = await tx<
      ModelPermission[]
    >`
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

      join protocol.tables t
        on t.id = cp.table_id

      join protocol.versions v
        on v.id = t.version_id

      where cp.connector_id = ${connector.id}
        and t.deleted_at is null
        and v.active
    `;

    return {
      id: connector.id,
      name: connector.name,
      description: connector.description,
      status: connector.status,
      visibility: connector.visibility,
      created_at: connector.created_at,
      image_url: null,
      parameters,
      models_permissions,
    };
  });
}