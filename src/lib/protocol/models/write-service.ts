
import "server-only";

import { randomUUID } from "node:crypto";

import type { TransactionSql } from "postgres";

import {
  getDatabase,
} from "@/lib/db";

import {
  getBatch,
} from "@/lib/protocol/batches/service";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  lockModelForRead,
} from "@/lib/protocol/locks";

import {
  lockOperationalBatch,
} from "@/lib/protocol/batches/service";

import {
  BatchStateError,
} from "@/lib/protocol/errors";

import {
  BATCH_TTL_MINUTES,
} from "@/lib/protocol/batches/schemas";

import {
  getModelMetadata,
  type ModelMetadata,
} from "./metadata";

import {
  requireModelPermission,
} from "./permissions";

import {
  requireUnusedReference,
  resolveBatchRecord,
} from "./pending-records";

import {
  validateWriteFields,
  type ChangePayload,
} from "./write-validation";

import {
  createRequestHash,
  findIdempotentChange,
} from "./idempotency";

import {
  recordReferenceSchema,
  refIdSchema,
  type ModelPermissionKey,
} from "./schemas";

import type {
  WriteOperation,
  WriteItem,
  WriteRecordsInput,
  RegisteredChange,
} from "./write-schemas";

const permissionByOperation: Record<
  WriteOperation,
  ModelPermissionKey
> = {
  CREATE: "can_send_post",
  UPDATE: "can_send_update",
  DELETE: "can_send_delete",
};

const MAX_BATCH_CHANGES = 10000;

type RegistrationContext = {
  batchId: string;
  projectId: string;
  instanceId: string;
  model: ModelMetadata;
};


async function registerSingleChange(
  tx: TransactionSql,
  context: RegistrationContext,
  operation: WriteOperation,
  item: WriteItem,
  sequence: number
): Promise<{
  result: RegisteredChange;
  inserted: boolean;
}> {
  const requestHash = createRequestHash(
    context.model.id,
    operation,
    item
  );

  if (item.client_operation_id) {
    const existing =
      await findIdempotentChange(
        tx,
        context.batchId,
        item.client_operation_id,
        requestHash
      );

    if (existing) {
      return {
        result: existing,
        inserted: false,
      };
    }
  }

  if (sequence > MAX_BATCH_CHANGES) {
    throw new DomainError(
      "BATCH_CHANGE_LIMIT",
      409
    );
  }

  const fields = validateWriteFields(
    context.model,
    operation,
    item
  );

  let recordId: string;
  let refId: string | null;

  if (operation === "CREATE") {
    const reference = refIdSchema.safeParse(
      item.ref_id
    );

    if (!reference.success) {
      throw new DomainError(
        "INVALID_RECORD_REFERENCE",
        422
      );
    }

    await requireUnusedReference(
      tx,
      context.model,
      context.batchId,
      context.instanceId,
      reference.data
    );

    recordId = randomUUID();
    refId = reference.data;
  } else {
    const reference =
      recordReferenceSchema.safeParse({
        id: item.id,
        ref_id: item.ref_id,
      });

    if (!reference.success) {
      throw new DomainError(
        "INVALID_RECORD_REFERENCE",
        422
      );
    }

    const record = await resolveBatchRecord(
      tx,
      context.model,
      context.batchId,
      context.projectId,
      context.instanceId,
      reference.data
    );

    recordId = record.id;
    refId = record.ref_id;
  }

  const payload: ChangePayload = {
    ref_id: refId,
    fields,
  };

  const [change] = await tx<{
    id: string;
  }[]>`
    insert into protocol.changes (
      batch_id,
      sequence,
      client_operation_id,
      table_id,
      table_name,
      record_id,
      type,
      payload,
      request_hash
    )

    values (
      ${context.batchId},
      ${sequence},
      ${item.client_operation_id ?? null},
      ${context.model.id},
      ${context.model.name},
      ${recordId},
      ${operation},
      ${JSON.stringify(payload)}::jsonb,
      ${requestHash}
    )

    returning id
  `;

  return {
    result: {
      id: recordId,
      ref_id: refId,
      change_id: change.id,
    },
    inserted: true,
  };
}


export async function registerModelChanges(
  tokenHash: string,
  version: number,
  tableName: string,
  operation: WriteOperation,
  input: WriteRecordsInput
) {
  const sql = getDatabase();

  const result = await sql.begin(
    async (tx) => {
      await lockModelForRead(tx);

      const {
        batch,
        instance,
      } = await lockOperationalBatch(
        tx,
        tokenHash,
        input.batch_id
      );

      if (batch.status !== "OPEN") {
        return {
          ok: false as const,
          status: batch.status,
        };
      }

      const model = await getModelMetadata(
        tx,
        version,
        tableName
      );

      await requireModelPermission(
        tx,
        instance.id,
        model.id,
        permissionByOperation[operation]
      );

      const [last] = await tx<{
        sequence: number;
      }[]>`
        select coalesce(
          max(sequence),
          0
        )::integer as sequence

        from protocol.changes

        where batch_id = ${batch.id}
      `;

      let sequence = last.sequence;

      const changes: RegisteredChange[] = [];

      const context: RegistrationContext = {
        batchId: batch.id,
        projectId: instance.project_id,
        instanceId: instance.id,
        model,
      };

      for (const item of input.payload) {
        const registered =
          await registerSingleChange(
            tx,
            context,
            operation,
            item,
            sequence + 1
          );

        if (registered.inserted) {
          sequence++;
        }

        changes.push(registered.result);
      }

      const [expiration] = await tx<{
        expired: boolean;
      }[]>`
        select (
          clock_timestamp() >=
          created_at + make_interval(
            mins => ${BATCH_TTL_MINUTES}
          )
        ) as expired

        from protocol.batches

        where id = ${batch.id}
      `;

      if (expiration.expired) {
        throw new BatchStateError(
          "EXPIRED"
        );
      }

      return {
        ok: true as const,
        data: changes,
      };
    }
  ).catch(async (error: unknown) => {
    if (
      error instanceof BatchStateError &&
      error.batchStatus === "EXPIRED"
    ) {
      await persistExpiredBatch(
        tokenHash,
        input.batch_id
      );
    }

    throw error;
  });

  if (!result.ok) {
    throw new BatchStateError(
      result.status
    );
  }

  return result.data;
}

async function persistExpiredBatch(
  tokenHash: string,
  batchId: string
) {
  await getBatch(
    tokenHash,
    batchId
  );
}