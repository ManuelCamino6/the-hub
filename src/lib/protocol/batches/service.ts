
import "server-only";

import type { TransactionSql } from "postgres";

import { getDatabase } from "@/lib/db";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  authenticateConnector,
} from "@/lib/connectors/auth";

import {
  lockOperationInstance,
  requireOperationalInstance,
} from "../operation-context";

import {
  BatchStateError,
} from "../errors";

import {
  BATCH_TTL_MINUTES,
  type Batch,
  type BatchContext,
} from "./schemas";

export async function beginBatch(
  tokenHash: string,
  instanceId: string
) {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    const {
      connector,
      instance,
    } = await lockOperationInstance(
      tx,
      tokenHash,
      instanceId
    );

    await requireOperationalInstance(
      tx,
      instance,
      connector.status
    );

    const [batch] = await tx<{
      id: string;
      status: "OPEN";
      expires_at: Date;
    }[]>`
      insert into protocol.batches (
        project_id,
        instance_id,
        type,
        status,
        created_at
      )
      values (
        ${instance.project_id},
        ${instance.id},
        'TRANSACTION',
        'OPEN',
        clock_timestamp()
      )

      returning
        id,
        status,
        created_at +
          make_interval(
            mins => ${BATCH_TTL_MINUTES}
          ) as expires_at
    `;

    return batch;
  });
}


export async function lockOwnedBatch(
  tx: TransactionSql,
  tokenHash: string,
  batchId: string
): Promise<BatchContext> {
  const connector =
    await authenticateConnector(
      tx,
      tokenHash
    );

  const [batch] = await tx<BatchContext[]>`
    select
      b.id,
      b.project_id,
      b.instance_id,
      b.type,
      b.status,
      b.created_at,
      b.closed_at,

      (
        clock_timestamp() >=
          b.created_at +
          make_interval(
            mins => ${BATCH_TTL_MINUTES}
          )
      ) as expired

    from protocol.batches b

    join platform.instances i
      on i.id = b.instance_id

    where b.id = ${batchId}
      and i.connector_id = ${connector.id}
      and i.project_id = b.project_id

    for update of b
  `;

  if (!batch) {
    throw new DomainError(
      "BATCH_NOT_FOUND",
      404
    );
  }

  return batch;
}


export async function expireBatchIfNeeded(
  tx: TransactionSql,
  batch: BatchContext
): Promise<BatchContext> {
  if (
    batch.status !== "OPEN" ||
    !batch.expired
  ) {
    return batch;
  }

  const [updated] = await tx<{
    status: "EXPIRED";
    closed_at: string;
  }[]>`
    update protocol.batches

    set
      status = 'EXPIRED',
      closed_at = clock_timestamp()

    where id = ${batch.id}
      and status = 'OPEN'

    returning
      status,
      closed_at
  `;

  return {
    ...batch,
    ...updated,
  };
}


export async function getBatch(
  tokenHash: string,
  batchId: string
): Promise<Batch> {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    const batch = await lockOwnedBatch(
      tx,
      tokenHash,
      batchId
    );

    const current =
      await expireBatchIfNeeded(
        tx,
        batch
      );

    return {
      id: current.id,
      instance_id: current.instance_id,
      type: current.type,
      status: current.status,
      created_at: current.created_at,
      closed_at: current.closed_at,
    };
  });
}


export async function rollbackBatch(
  tokenHash: string,
  batchId: string
) {
  const sql = getDatabase();

  const result = await sql.begin(
    async (tx) => {
      const batch = await lockOwnedBatch(
        tx,
        tokenHash,
        batchId
      );

      if (batch.type !== "TRANSACTION") {
        throw new DomainError(
          "INVALID_BATCH_TYPE",
          409
        );
      }

      const current =
        await expireBatchIfNeeded(
          tx,
          batch
        );

      if (current.status !== "OPEN") {
        return {
          ok: false as const,
          status: current.status,
        };
      }

      await tx`
        update protocol.batches

        set
          status = 'DISCARDED',
          closed_at = clock_timestamp()

        where id = ${batchId}
      `;

      return {
        ok: true as const,
        data: {
          id: batchId,
          status: "DISCARDED" as const,
        },
      };
    }
  );

  if (!result.ok) {
    throw new BatchStateError(
      result.status
    );
  }

  return result.data;
}



export async function lockOperationalBatch(
  tx: TransactionSql,
  tokenHash: string,
  batchId: string
) {
  const [reference] = await tx<{
    instance_id: string;
  }[]>`
    select b.instance_id

    from protocol.batches b

    join platform.instances i
      on i.id = b.instance_id

    join platform.connectors c
      on c.id = i.connector_id

    where b.id = ${batchId}
      and c.token_hash = ${tokenHash}
      and c.deleted_at is null
  `;

  if (!reference) {
    await authenticateConnector(
      tx,
      tokenHash
    );

    throw new DomainError(
      "BATCH_NOT_FOUND",
      404
    );
  }

  const context =
    await lockOperationInstance(
      tx,
      tokenHash,
      reference.instance_id
    );

  const batch = await lockOwnedBatch(
    tx,
    tokenHash,
    batchId
  );

  if (batch.type !== "TRANSACTION") {
    throw new DomainError(
      "INVALID_BATCH_TYPE",
      409
    );
  }

  if (
    batch.project_id !==
      context.instance.project_id ||
    batch.instance_id !==
      context.instance.id
  ) {
    throw new DomainError(
      "INVALID_BATCH_CONTEXT",
      409
    );
  }

  const current =
    await expireBatchIfNeeded(
      tx,
      batch
    );

  if (current.status === "OPEN") {
    await requireOperationalInstance(
      tx,
      context.instance,
      context.connector.status
    );
  }

  return {
    ...context,
    batch: current,
  };
}

