
import "server-only";

import type { TransactionSql } from "postgres";

import type {
  WriteOperation,
} from "@/lib/protocol/models/write-schemas";

type PropagationInput = {
  changeId: string;
  projectId: string;
  originInstanceId: string;
  tableId: string;
  operation: WriteOperation;
};

export async function createPropagations(
  tx: TransactionSql,
  input: PropagationInput
): Promise<number> {
  const result = await tx`
    insert into protocol.propagations (
      change_id,
      instance_id,
      status
    )

    select
      ${input.changeId},
      i.id,
      'PENDING'

    from platform.instances i

    join platform.connectors c
      on c.id = i.connector_id

    join platform.projects owner
      on owner.id = c.project_id

    join platform.effective_instance_permissions ep
      on ep.instance_id = i.id
      and ep.table_id = ${input.tableId}

    where i.project_id = ${input.projectId}

      and i.id <> ${input.originInstanceId}

      and i.deleted_at is null
      and i.status = 'OK'
      and i.operation_status = 'ACTIVE'

      and c.deleted_at is null
      and c.status in (
        'AVAILABLE',
        'DEPRECATED'
      )

      and owner.deleted_at is null
      and owner.type = 'DEVELOPMENT'

      and (
        c.visibility = 'PUBLIC'

        or exists (
          select 1

          from platform.connectors_permissions cp

          where cp.connector_id = c.id
            and cp.project_id = i.project_id
        )
      )

      and (
        case ${input.operation}::text

          when 'CREATE' then
            ep.can_receive_post

            and (
              ep.can_receive_post_from is null

              or ${input.originInstanceId}::uuid
                = any(ep.can_receive_post_from)
            )

          when 'UPDATE' then
            ep.can_receive_update

            and (
              ep.can_receive_update_from is null

              or ${input.originInstanceId}::uuid
                = any(ep.can_receive_update_from)
            )

          when 'DELETE' then
            ep.can_receive_delete

            and (
              ep.can_receive_delete_from is null

              or ${input.originInstanceId}::uuid
                = any(ep.can_receive_delete_from)
            )

          else false

        end
      )

    returning id
  `;

  return result.length;
}
