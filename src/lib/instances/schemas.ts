
import { z } from "zod";

export const instanceStatuses = [
  "OK",
  "INCOMPLETE",
  "UNAUTHORIZED",
] as const;

export const instanceOperationStatuses = [
  "ACTIVE",
  "PAUSED",
] as const;

export const permissionOperations = [
  "can_list",
  "can_send_post",
  "can_receive_post",
  "can_send_update",
  "can_receive_update",
  "can_send_delete",
  "can_receive_delete",
] as const;

export const parameterValueSchema = z.union([
  z.string().max(10000),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const instanceParameterSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/),
  value: parameterValueSchema,
}).strict();

const originsSchema = z.array(z.uuid())
  .max(200)
  .refine(
    (ids) => new Set(ids).size === ids.length
  )
  .nullable();

export const instancePermissionSchema = z.object({
  table_id: z.uuid(),

  can_list: z.boolean(),

  can_send_post: z.boolean(),
  can_receive_post: z.boolean(),
  can_receive_post_from: originsSchema,

  can_send_update: z.boolean(),
  can_receive_update: z.boolean(),
  can_receive_update_from: originsSchema,

  can_send_delete: z.boolean(),
  can_receive_delete: z.boolean(),
  can_receive_delete_from: originsSchema,
}).strict();

export const instanceDefinitionSchema = z.object({
  name: z.string().trim().min(1).max(120),

  parameters: z.array(instanceParameterSchema)
    .max(100)
    .refine(
      (items) =>
        new Set(items.map((item) => item.key)).size
        === items.length
    ),

  models_permissions: z.array(instancePermissionSchema)
    .max(200)
    .refine(
      (items) =>
        new Set(items.map((item) => item.table_id)).size
        === items.length
    ),
}).strict();

export const createInstanceSchema =
  instanceDefinitionSchema.extend({
    project_id: z.uuid(),
    connector_id: z.uuid(),
  });

export const updateInstanceSchema =
  instanceDefinitionSchema;

export type CreateInstanceInput =
  z.infer<typeof createInstanceSchema>;

export type UpdateInstanceInput =
  z.infer<typeof updateInstanceSchema>;

export type InstanceParameter =
  z.infer<typeof instanceParameterSchema>;

export type InstancePermission =
  z.infer<typeof instancePermissionSchema>;

export type InstanceStatus =
  typeof instanceStatuses[number];

export type InstanceOperationStatus =
  typeof instanceOperationStatuses[number];

export type Instance = {
  id: string;
  project_id: string;
  connector_id: string;
  connector_name: string;
  name: string;
  status: InstanceStatus;
  operation_status: InstanceOperationStatus;
  created_at: string;
};


export const listInstancesSchema = z.object({
  project_id: z.uuid(),
  name: z.string().trim().max(120).optional(),
  status: z.enum(instanceStatuses).optional(),
  limit: z.coerce.number()
    .int()
    .min(1)
    .max(200)
    .default(50),
  cursor: z.string().max(512).optional(),
});

export type ListInstancesInput =
  z.infer<typeof listInstancesSchema>;


export type InstanceParameterDetail = {
  key: string;
  type: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN";
  required: boolean;
  encrypted: boolean;
  configured: boolean;
  value?: string | null;
};

export type InstanceDetail = Instance & {
  connector_status:
    | "IN_DEVELOPMENT"
    | "AVAILABLE"
    | "DEPRECATED";

  connector_deleted: boolean;
  paused_reason: string | null;
  paused_at: string | null;

  parameters: InstanceParameterDetail[];
  models_permissions: InstancePermission[];
};


export type ConnectorInstallation = {
  instance_id: string;
  status: InstanceStatus;
  operation_status: InstanceOperationStatus;
  created_at: string;
  pending: number;
  failed: number;
  last_confirmed_at: string | null;
};

export type ConnectorInstance = Instance & {
  paused_reason: string | null;
};

export const listInstallationsSchema = z.object({
  connector_id: z.uuid(),
  status: z.enum(instanceStatuses).optional(),
  limit: z.coerce.number()
    .int()
    .min(1)
    .max(200)
    .default(50),
  cursor: z.string().max(512).optional(),
});

export const listConnectorInstancesSchema = z.object({
  status: z.enum(instanceStatuses).optional(),
  limit: z.coerce.number()
    .int()
    .min(1)
    .max(200)
    .default(50),
  cursor: z.string().max(512).optional(),
});

export type ListInstallationsInput =
  z.infer<typeof listInstallationsSchema>;

export type ListConnectorInstancesInput =
  z.infer<typeof listConnectorInstancesSchema>;
