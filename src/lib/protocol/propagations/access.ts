import "server-only";

import type { TransactionSql } from "postgres";

export function propagationAccess(
  tx: TransactionSql
) {
  return tx`
    i.deleted_at is null

    and business.deleted_at is null
    and business.type = 'BUSINESS'

    and c.deleted_at is null

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
      ch.type = 'SETTING'

      or (
        i.status = 'OK'
        and i.operation_status = 'ACTIVE'

        and c.status in (
          'AVAILABLE',
          'DEPRECATED'
        )

        and exists (
          select 1

          from platform.effective_instance_permissions ep

          where ep.instance_id = i.id
            and ep.table_id = ch.table_id

            and case ch.type

              when 'CREATE' then
                ep.can_receive_post
                and (
                  b.type = 'SETUP'
                  or ep.can_receive_post_from is null
                  or b.instance_id =
                    any(ep.can_receive_post_from)
                )

              when 'UPDATE' then
                ep.can_receive_update
                and (
                  ep.can_receive_update_from is null
                  or b.instance_id =
                    any(ep.can_receive_update_from)
                )

              when 'DELETE' then
                ep.can_receive_delete
                and (
                  ep.can_receive_delete_from is null
                  or b.instance_id =
                    any(ep.can_receive_delete_from)
                )

              else false

            end
        )
      )
    )
  `;
}