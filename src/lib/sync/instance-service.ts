import "server-only";

import { getDatabase } from "@/lib/db";

import {
    DomainError,
} from "@/lib/api/domain-error";

import {
    requireSyncInstance,
} from "./authorization";

import {
    getSyncCounters,
    getInstanceModels,
} from "./metrics";

import type {
    InstanceSync,
    InstanceModelSync,
} from "./schemas";

export async function getInstanceSync(
    userId: string,
    instanceId: string,
    expectedProjectId?: string
): Promise<InstanceSync> {
    const sql = getDatabase();

    return sql.begin(
        "isolation level repeatable read read only",

        async (tx) => {
            const instance =
                await requireSyncInstance(
                    tx,
                    userId,
                    instanceId,
                    expectedProjectId
                );

            const counters =
                await getSyncCounters(
                    tx,
                    [instanceId]
                );

            const models =
                await getInstanceModels(
                    tx,
                    instanceId
                );

            return {
                instance_id: instance.id,

                status: instance.status,

                operation_status:
                    instance.operation_status,

                paused_reason:
                    instance.paused_reason,

                connector: {
                    id: instance.connector_id,

                    name: instance.connector_name,

                    status: instance.connector_status,
                },

                ...counters,

                models,
            };
        }
    );
}

export async function getInstanceModelSync(
    userId: string,
    instanceId: string,
    tableName: string,
    expectedProjectId?: string
): Promise<InstanceModelSync> {
    const instance =
        await getInstanceSync(
            userId,
            instanceId,
            expectedProjectId
        );

    const model = instance.models.find(
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
        instance_id: instance.instance_id,

        instance_status:
            instance.status,

        operation_status:
            instance.operation_status,

        ...model,
    };
}