import { z } from "zod";

import {
    tableNameSchema,
} from "@/lib/protocol/schemas";

import type {
    Instance,
} from "@/lib/instances/schemas";

import type {
    ConnectorStatus,
} from "@/lib/connectors/schemas";

export const syncIdSchema = z.uuid();

export const syncTableNameSchema =
    tableNameSchema;

export type SyncCounters = {
    pending: number;
    failed: number;
    ok_total: number;
    expired_total: number;
    last_confirmed_at: string | null;
    last_activity_at: string | null;
};

export type ModelSync = SyncCounters & {
    table_name: string;

    can_receive: boolean;

    can_receive_post: boolean;
    can_receive_update: boolean;
    can_receive_delete: boolean;
};

export type ProjectModelSync = {
    table_name: string;
    instances_total: number;
    pending: number;
    failed: number;
    last_confirmed_at: string | null;
};

export type ProjectSync = {
    project_id: string;

    instances_total: number;
    instances_ok: number;
    instances_incomplete: number;
    instances_unauthorized: number;
    instances_paused: number;

    pending_total: number;
    failed_total: number;

    last_confirmed_at: string | null;

    operational: boolean;

    models: ProjectModelSync[];
    ok_total: number;
    expired_total: number;

    last_activity_at: string | null;
};

export type InstanceSync = SyncCounters & {
    instance_id: string;

    status: Instance["status"];

    operation_status:
    Instance["operation_status"];

    paused_reason: string | null;

    connector: {
        id: string;
        name: string;
        status: ConnectorStatus;
    };

    models: ModelSync[];
};

export type InstanceModelSync =
    ModelSync & {
        instance_id: string;

        instance_status:
        Instance["status"];

        operation_status:
        Instance["operation_status"];
    };

export type DevelopmentInstanceSync =
    SyncCounters & {
        instance_id: string;

        status: Instance["status"];

        operation_status:
        Instance["operation_status"];

        models: ModelSync[];
    };

export type DevelopmentModelSync =
    ModelSync & {
        instance_id: string;

        instance_status:
        Instance["status"];

        operation_status:
        Instance["operation_status"];
    };