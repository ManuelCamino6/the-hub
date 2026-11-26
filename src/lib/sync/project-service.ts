import "server-only";

import { getDatabase } from "@/lib/db";

import {
    hasActiveSubscription,
} from "@/lib/billing/access";

import {
    requireSyncProject,
} from "./authorization";

import {
    getSyncCounters,
} from "./metrics";

import type {
    ProjectSync,
    ProjectModelSync,
} from "./schemas";

type ProjectInstance = {
    id: string;

    status:
    | "OK"
    | "INCOMPLETE"
    | "UNAUTHORIZED";

    operation_status:
    | "ACTIVE"
    | "PAUSED";
};

export async function getProjectSync(
    userId: string,
    projectId: string
): Promise<ProjectSync> {
    const sql = getDatabase();

    return sql.begin(
        "isolation level repeatable read read only",

        async (tx) => {
            await requireSyncProject(
                tx,
                userId,
                projectId
            );

            const instances =
                await tx<ProjectInstance[]>`
          select
            id,
            status,
            operation_status

          from platform.instances

          where project_id = ${projectId}

            and deleted_at is null
        `;

            const instanceIds =
                instances.map(
                    (instance) => instance.id
                );

            const counters =
                await getSyncCounters(
                    tx,
                    instanceIds
                );

            const models =
                await tx<ProjectModelSync[]>`
          with permissions as (
            select
              table_id,
              instance_id

            from platform.effective_instance_permissions

            where instance_id =
              any(${instanceIds}::uuid[])

              and (
                can_receive_post

                or can_receive_update

                or can_receive_delete
              )
          ),

          activity as (
            select
              ch.table_id,

              p.instance_id,

              count(*) filter (
                where p.status = 'PENDING'
              )::int as pending,

              count(*) filter (
                where p.status = 'FAILED'
              )::int as failed,

              max(p.confirmed_at) filter (
                where p.status = 'OK'
              ) as last_confirmed_at

            from protocol.propagations p

            join protocol.changes ch
              on ch.id = p.change_id

            join protocol.batches b
              on b.id = ch.batch_id

            where p.instance_id =
              any(${instanceIds}::uuid[])

              and b.project_id =
                ${projectId}

              and b.status = 'COMMITTED'

              and ch.table_id is not null

              and ch.type <> 'SETTING'

            group by
              ch.table_id,
              p.instance_id
          ),

          scope as (
            select
              table_id,
              instance_id

            from permissions

            union

            select
              table_id,
              instance_id

            from activity
          )

          select
            t.name as table_name,

            count(
              distinct s.instance_id
            )::int as instances_total,

            coalesce(
              sum(a.pending),
              0
            )::int as pending,

            coalesce(
              sum(a.failed),
              0
            )::int as failed,

            max(
              a.last_confirmed_at
            )::text as last_confirmed_at

          from scope s

          join protocol.tables t
            on t.id = s.table_id

          join protocol.versions v
            on v.id = t.version_id

          left join activity a
            on a.table_id = s.table_id

            and a.instance_id =
              s.instance_id

          where v.active = true

            and t.deleted_at is null

          group by
            t.id,
            t.name

          order by t.name
        `;

            const operational =
                await hasActiveSubscription(
                    tx,
                    projectId
                );

            return {
                project_id: projectId,

                instances_total:
                    instances.length,

                instances_ok:
                    instances.filter(
                        (i) => i.status === "OK"
                    ).length,

                instances_incomplete:
                    instances.filter(
                        (i) => i.status === "INCOMPLETE"
                    ).length,

                instances_unauthorized:
                    instances.filter(
                        (i) => i.status === "UNAUTHORIZED"
                    ).length,

                instances_paused:
                    instances.filter(
                        (i) => i.operation_status === "PAUSED"
                    ).length,

                pending_total:
                    counters.pending,

                failed_total:
                    counters.failed,

                last_confirmed_at:
                    counters.last_confirmed_at,

                operational,

                models,

                ok_total:
                    counters.ok_total,

                expired_total:
                    counters.expired_total,

                last_activity_at:
                    counters.last_activity_at,
            };
        }
    );
}