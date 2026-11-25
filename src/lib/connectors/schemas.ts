
import { z } from "zod";

export const connectorStatuses = [
  "IN_DEVELOPMENT",
  "AVAILABLE",
  "DEPRECATED",
] as const;

export const connectorVisibilities = [
  "PRIVATE",
  "PUBLIC",
] as const;

export const parameterTypes = [
  "TEXT",
  "NUMBER",
  "DATE",
  "BOOLEAN",
] as const;

export const permissionKeys = [
  "can_list",
  "can_send_post",
  "can_receive_post",
  "can_send_update",
  "can_receive_update",
  "can_send_delete",
  "can_receive_delete",
] as const;

export const connectorStatusSchema =
  z.enum(connectorStatuses);

export const connectorVisibilitySchema =
  z.enum(connectorVisibilities);

export const parameterSchema = z.object({
  key: z.string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{0,62}$/),

  type: z.enum(parameterTypes),
  required: z.boolean(),
  encrypted: z.boolean(),
}).strict();

export const modelPermissionSchema = z.object({
  table_id: z.uuid(),
  can_list: z.boolean(),
  can_send_post: z.boolean(),
  can_receive_post: z.boolean(),
  can_send_update: z.boolean(),
  can_receive_update: z.boolean(),
  can_send_delete: z.boolean(),
  can_receive_delete: z.boolean(),
}).strict();

export const connectorDefinitionSchema = z.object({
  name: z.string().trim().min(1).max(120),

  description: z.string()
    .trim()
    .max(2000)
    .optional(),

  parameters: z.array(parameterSchema)
    .max(100)
    .refine(
      (items) =>
        new Set(items.map((item) => item.key)).size ===
        items.length,
      { message: "DUPLICATE_PARAMETER" }
    ),

  models_permissions: z.array(modelPermissionSchema)
    .max(200)
    .refine(
      (items) =>
        new Set(
          items.map((item) => item.table_id)
        ).size === items.length,
      { message: "DUPLICATE_MODEL" }
    ),
}).strict();

export const createConnectorSchema =
  connectorDefinitionSchema.extend({
    project_id: z.uuid(),
  }).strict();

export const updateConnectorSchema =
  connectorDefinitionSchema.extend({
    status: connectorStatusSchema,
  }).strict();

export const connectorDistributionSchema = z.object({
  visibility: connectorVisibilitySchema,
  project_ids: z.array(z.uuid())
    .max(200)
    .refine(
      (items) => new Set(items).size === items.length
    ),
}).strict();

export const listConnectorsSchema = z.object({
  project_id: z.uuid(),
  name: z.string().trim().max(120).optional(),
  status: connectorStatusSchema.optional(),
  visibility: connectorVisibilitySchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().max(512).optional(),
});

export type ConnectorStatus = z.infer<
  typeof connectorStatusSchema
>;

export type ConnectorVisibility = z.infer<
  typeof connectorVisibilitySchema
>;

export type ConnectorParameter = z.infer<
  typeof parameterSchema
>;

export type ModelPermission = z.infer<
  typeof modelPermissionSchema
>;

export type CreateConnectorInput = z.infer<
  typeof createConnectorSchema
>;

export type UpdateConnectorInput = z.infer<
  typeof updateConnectorSchema
>;

export type ConnectorDistributionInput = z.infer<
  typeof connectorDistributionSchema
>;

export type ListConnectorsInput = z.infer<
  typeof listConnectorsSchema
>;

export type Connector = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  status: ConnectorStatus;
  visibility: ConnectorVisibility;
  created_at: string;
};

export type ConnectorDetail = Connector & {
  parameters: ConnectorParameter[];
  models_permissions: ModelPermission[];
};
