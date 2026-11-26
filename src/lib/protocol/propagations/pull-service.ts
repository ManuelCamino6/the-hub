import "server-only";

import { getDatabase } from "@/lib/db";

import { DomainError } from "@/lib/api/domain-error";

import {
  decodeDeliveryCursor,
  paginateDeliveries,
} from "./pagination";

import {
  getPropagationReferences,
} from "./reference-service";

import {
  authenticateConnector,
} from "@/lib/connectors/auth";

import {
  lockModelForRead,
} from "@/lib/protocol/locks";

import { propagationAccess } from "./access";

import type {
  ListChangesInput,
  Propagation,
} from "./schemas";

type PropagationDetailRow = Propagation & {
  project_id: string;
  origin_instance_id: string | null;
  table_id: string | null;
  payload: unknown;
};

export async function getChange(
  tokenHash: string,
  propagationId: string
) {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    await lockModelForRead(tx);

    const connector =
      await authenticateConnector(
        tx,
        tokenHash
      );

    const [change] = await tx<
      PropagationDetailRow[]
    >`
      select
        p.id,
        p.instance_id,
        p.change_id,
        ch.batch_id,
        ch.table_id,
        ch.table_name,
        ch.record_id,
        ch.type,
        p.status,
        p.created_at,

        b.project_id,

        case
          when b.type = 'TRANSACTION'
          then b.instance_id
          else null
        end as origin_instance_id,

        coalesce(
          ch.applied_payload,
          ch.payload
        ) as payload

      from protocol.propagations p

      join protocol.changes ch
        on ch.id = p.change_id

      join protocol.batches b
        on b.id = ch.batch_id

      join platform.instances i
        on i.id = p.instance_id

      join platform.connectors c
        on c.id = i.connector_id

      join platform.projects business
        on business.id = i.project_id

      join platform.projects owner
        on owner.id = c.project_id

      where p.id = ${propagationId}
        and c.id = ${connector.id}
        and b.project_id = i.project_id
        and b.status = 'COMMITTED'

        and ${propagationAccess(tx)}
    `;

    if (!change) {
      throw new DomainError(
        "PROPAGATION_NOT_FOUND",
        404
      );
    }

    const refs =
      change.table_id && change.record_id

        ? await getPropagationReferences(
            tx,
            {
              tableId: change.table_id,
              recordId: change.record_id,
              projectId: change.project_id,
              originInstanceId:
                change.origin_instance_id,
              destinationInstanceId:
                change.instance_id,
            }
          )

        : {
            origin: null,
            destination: null,
          };

    let globalRef: string | null = null;

    if (change.table_id && change.record_id) {
      const [origin] = await tx<{
        ref_id: string | null;
      }[]>`
        select
          ch.payload ->> 'ref_id' as ref_id

        from protocol.changes ch

        join protocol.batches b
          on b.id = ch.batch_id

        where ch.table_id = ${change.table_id}
          and ch.record_id = ${change.record_id}

          and b.project_id = ${change.project_id}
          and b.type = 'TRANSACTION'
          and b.status = 'COMMITTED'
          and ch.type = 'CREATE'

        order by
          b.closed_at,
          ch.sequence,
          ch.id

        limit 1
      `;

      globalRef = origin?.ref_id ?? null;
    }

    return {
      id: change.id,
      instance_id: change.instance_id,
      change_id: change.change_id,
      batch_id: change.batch_id,
      origin_instance_id:
        change.origin_instance_id,
      table_name: change.table_name,
      record_id: change.record_id,
      type: change.type,
      payload: change.payload,
      global_ref: globalRef,
      refs,
      status: change.status,
    };
  });
}

export async function listChanges(
  tokenHash: string,
  input: ListChangesInput
) {
  const sql = getDatabase();

  const cursor = input.cursor
    ? decodeDeliveryCursor(input.cursor)
    : null;

  return sql.begin(async (tx) => {
    await lockModelForRead(tx);

    const connector =
      await authenticateConnector(
        tx,
        tokenHash
      );

    const rows = await tx<
      (
        Propagation & {
          delivery_order: string;
        }
      )[]
    >`
      select
        p.id,
        p.instance_id,
        p.change_id,
        ch.batch_id,
        ch.table_name,
        ch.record_id,
        ch.type,
        p.status,

        p.delivery_order::text as delivery_order,

        to_char(
          p.created_at at time zone 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
        ) as created_at

      from protocol.propagations p

      join protocol.changes ch
        on ch.id = p.change_id

      join protocol.batches b
        on b.id = ch.batch_id

      join platform.instances i
        on i.id = p.instance_id

      join platform.connectors c
        on c.id = i.connector_id

      join platform.projects business
        on business.id = i.project_id

      join platform.projects owner
        on owner.id = c.project_id

      where c.id = ${connector.id}
        and b.project_id = i.project_id
        and b.status = 'COMMITTED'

        and p.status = ${input.status}

        and ${propagationAccess(tx)}

        ${
          input.instance_id
            ? tx`and i.id = ${input.instance_id}`
            : tx``
        }

        ${
          input.type
            ? tx`and ch.type = ${input.type}`
            : tx``
        }

        ${
          cursor
            ? tx`
                and p.delivery_order >
                  ${cursor.delivery_order}::bigint
              `
            : tx``
        }

      order by p.delivery_order asc

      limit ${input.limit + 1}
    `;

    return paginateDeliveries(
      rows,
      input.limit
    );
  });
}