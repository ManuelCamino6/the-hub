
import "server-only";

import { getDatabase } from "@/lib/db";

import { DomainError } from "@/lib/api/domain-error";

import {
  lockModelForRead,
} from "@/lib/protocol/locks";

import {
  BatchStateError,
} from "@/lib/protocol/errors";

import {
  lockOperationalBatch,
} from "./service";

import {
  getModelMetadata,
  type ModelMetadata,
} from "@/lib/protocol/models/metadata";

import {
  requireModelPermission,
} from "@/lib/protocol/models/permissions";

import {
  applyChange,
  type PendingChange,
} from "@/lib/protocol/models/apply-change";

import {
  createPropagations,
} from "@/lib/protocol/propagations/service";

import type {
  ModelPermissionKey,
} from "@/lib/protocol/models/schemas";

import type {
  WriteOperation,
} from "@/lib/protocol/models/write-schemas";

const permissionByOperation: Record<
  WriteOperation,
  ModelPermissionKey
> = {
  CREATE: "can_send_post",
  UPDATE: "can_send_update",
  DELETE: "can_send_delete",
};

export type CommitResult = {
  id: string;
  status: "COMMITTED";
  changes_applied: number;
  propagations_created: number;
};


export async function commitBatch(
  tokenHash: string,
  batchId: string
): Promise<CommitResult> {
  const sql = getDatabase();

  const result = await sql.begin(
    async (tx) => {
      await lockModelForRead(tx);

      const { batch, instance } =
        await lockOperationalBatch(
          tx,
          tokenHash,
          batchId
        );

      if (batch.status !== "OPEN") {
        return {
          kind: "closed" as const,
          status: batch.status,
        };
      }

      try {
        const committed = await tx.savepoint(
          async (sp) => {
            const [version] = await sp<{
              number: number;
            }[]>`
              select number

              from protocol.versions

              where active
            `;

            if (!version) {
              throw new DomainError(
                "ACTIVE_VERSION_NOT_FOUND",
                409
              );
            }

            const changes = await sp<
              PendingChange[]
            >`
              select
                id,
                sequence,
                table_id,
                table_name,
                record_id,
                type,
                payload

              from protocol.changes

              where batch_id = ${batch.id}

              order by sequence asc
            `;

            const models = new Map<
              string,
              ModelMetadata
            >();

            let propagationsCreated = 0;

            for (const change of changes) {
              let model = models.get(
                change.table_id
              );

              if (!model) {
                model = await getModelMetadata(
                  sp,
                  version.number,
                  change.table_name
                );

                if (
                  model.id !== change.table_id
                ) {
                  throw new DomainError(
                    "MODEL_DEFINITION_CHANGED",
                    409
                  );
                }

                models.set(model.id, model);
              }

              await requireModelPermission(
                sp,
                instance.id,
                model.id,
                permissionByOperation[
                  change.type
                ]
              );

              await applyChange(
                sp,
                {
                  projectId: instance.project_id,
                  instanceId: instance.id,
                  model,
                },
                change
              );

              propagationsCreated +=
                await createPropagations(
                  sp,
                  {
                    changeId: change.id,
                    projectId: instance.project_id,
                    originInstanceId: instance.id,
                    tableId: model.id,
                    operation: change.type,
                  }
                );
            }

            await sp`
              update protocol.batches

              set
                status = 'COMMITTED',
                closed_at = clock_timestamp()

              where id = ${batch.id}
                and status = 'OPEN'
            `;

            return {
              id: batch.id,
              status: "COMMITTED" as const,
              changes_applied: changes.length,
              propagations_created:
                propagationsCreated,
            };
          }
        );

        return {
          kind: "committed" as const,
          data: committed,
        };

      } catch (error) {
        // postgres.js ya revirtió el savepoint.
        // Los locks exteriores siguen vigentes.

        const errorCode =
          typeof error === "object" &&
          error !== null &&
          "code" in error
            ? String(error.code)
            : "INTERNAL_ERROR";

        console.error("Batch commit failed", {
          batchId: batch.id,
          code: errorCode,
        });

        await tx`
          update protocol.batches

          set
            status = 'FAILED',
            closed_at = clock_timestamp()

          where id = ${batch.id}
            and status = 'OPEN'
        `;

        return {
          kind: "failed" as const,
        };
      }
    }
  );

  if (result.kind === "closed") {
    throw new BatchStateError(
      result.status
    );
  }

  if (result.kind === "failed") {
    throw new DomainError(
      "BATCH_COMMIT_FAILED",
      409
    );
  }

  return result.data;
}
