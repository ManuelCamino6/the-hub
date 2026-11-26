import "server-only";

import type {
  TransactionSql,
} from "postgres";

import type {
  SyncCounters,
  ModelSync,
} from "./schemas";

export async function getSyncCounters(
  tx: TransactionSql,
  instanceIds: string[]
): Promise<SyncCounters> {
  const [result] =
    await tx<SyncCounters[]>`
      select
        count(*) filter (
          where p.status = 'PENDING'
        )::int as pending,

        count(*) filter (
          where p.status = 'FAILED'
        )::int as failed,

        count(*) filter (
          where p.status = 'OK'
        )::int as ok_total,

        count(*) filter (
          where p.status = 'EXPIRED'
        )::int as expired_total,

        max(p.confirmed_at) filter (
          where p.status = 'OK'
        )::text as last_confirmed_at,

        max(
          greatest(
            p.created_at,
            p.updated_at
          )
        )::text as last_activity_at

      from protocol.propagations p

      join protocol.changes ch
        on ch.id = p.change_id

      join protocol.batches b
        on b.id = ch.batch_id

      join platform.instances i
        on i.id = p.instance_id

      where p.instance_id =
        any(${instanceIds}::uuid[])

        and i.deleted_at is null

        and b.project_id = i.project_id

        and b.status = 'COMMITTED'

        and ch.type <> 'SETTING'
    `;

  return result;
}

export async function getInstanceModels(
  tx: TransactionSql,
  instanceId: string
): Promise<ModelSync[]> {
  return tx<ModelSync[]>`
    with permissions as (
      select
        table_id,

        can_receive_post,

        can_receive_update,

        can_receive_delete

      from platform.effective_instance_permissions

      where instance_id = ${instanceId}
    ),

    activity as (
      select
        ch.table_id,

        count(*) filter (
          where p.status = 'PENDING'
        )::int as pending,

        count(*) filter (
          where p.status = 'FAILED'
        )::int as failed,

        count(*) filter (
          where p.status = 'OK'
        )::int as ok_total,

        count(*) filter (
          where p.status = 'EXPIRED'
        )::int as expired_total,

        max(p.confirmed_at) filter (
          where p.status = 'OK'
        ) as last_confirmed_at,

        max(
          greatest(
            p.created_at,
            p.updated_at
          )
        ) as last_activity_at

      from protocol.propagations p

      join protocol.changes ch
        on ch.id = p.change_id

      join protocol.batches b
        on b.id = ch.batch_id

      join platform.instances i
        on i.id = p.instance_id

      where p.instance_id = ${instanceId}

        and b.project_id = i.project_id

        and b.status = 'COMMITTED'

        and ch.table_id is not null

        and ch.type <> 'SETTING'

      group by ch.table_id
    )

    select
      t.name as table_name,

      (
        coalesce(pm.can_receive_post, false)

        or coalesce(
          pm.can_receive_update,
          false
        )

        or coalesce(
          pm.can_receive_delete,
          false
        )
      ) as can_receive,

      coalesce(
        pm.can_receive_post,
        false
      ) as can_receive_post,

      coalesce(
        pm.can_receive_update,
        false
      ) as can_receive_update,

      coalesce(
        pm.can_receive_delete,
        false
      ) as can_receive_delete,

      coalesce(a.pending, 0) as pending,

      coalesce(a.failed, 0) as failed,

      coalesce(a.ok_total, 0) as ok_total,

      coalesce(
        a.expired_total,
        0
      ) as expired_total,

      a.last_confirmed_at::text,

      a.last_activity_at::text

    from protocol.tables t

    join protocol.versions v
      on v.id = t.version_id

    left join permissions pm
      on pm.table_id = t.id

    left join activity a
      on a.table_id = t.id

    where v.active = true

      and t.deleted_at is null

      and (
        a.table_id is not null

        or coalesce(
          pm.can_receive_post,
          false
        )

        or coalesce(
          pm.can_receive_update,
          false
        )

        or coalesce(
          pm.can_receive_delete,
          false
        )
      )

    order by t.name
  `;
}