import "server-only";

import { getDatabase } from "@/lib/db";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  requireDevelopmentInstallation,
} from "./development-authorization";

import {
  getSyncCounters,
  getInstanceModels,
} from "./metrics";

import type {
  DevelopmentInstanceSync,
  DevelopmentModelSync,
} from "./schemas";

export async function getDevelopmentInstanceSync(
  userId: string,
  connectorId: string,
  instanceId: string,
  expectedProjectId?: string
): Promise<DevelopmentInstanceSync> {
  const sql = getDatabase();

  return sql.begin(
    "isolation level repeatable read read only",

    async (tx) => {
      const installation =
        await requireDevelopmentInstallation(
          tx,
          userId,
          connectorId,
          instanceId,
          expectedProjectId
        );

      const counters =
        await getSyncCounters(
          tx,
          [installation.id]
        );

      const models =
        await getInstanceModels(
          tx,
          installation.id
        );

      return {
        instance_id: installation.id,

        status: installation.status,

        operation_status:
          installation.operation_status,

        ...counters,

        models,
      };
    }
  );
}

export async function getDevelopmentModelSync(
  userId: string,
  connectorId: string,
  instanceId: string,
  tableName: string,
  expectedProjectId?: string
): Promise<DevelopmentModelSync> {
  const installation =
    await getDevelopmentInstanceSync(
      userId,
      connectorId,
      instanceId,
      expectedProjectId
    );

  const model = installation.models.find(
    (item) =>
      item.table_name === tableName
  );

  if (!model) {
    throw new DomainError(
      "NOT_FOUND",
      404
    );
  }

  return {
    instance_id: installation.instance_id,

    instance_status:
      installation.status,

    operation_status:
      installation.operation_status,

    ...model,
  };
}