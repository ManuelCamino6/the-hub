
import { z } from "zod";

import { refIdSchema } from "./schemas";

export const writeOperations = [
  "CREATE",
  "UPDATE",
  "DELETE",
] as const;

export const clientOperationIdSchema = z.string()
  .min(1)
  .max(255)
  .refine((value) =>
    value.trim().length > 0 &&
    !value.includes("\0")
  );

const dynamicValueSchema = z.union([
  z.string().max(100000),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const createRecordSchema = z.object({
  ref_id: refIdSchema,

  client_operation_id:
    clientOperationIdSchema.optional(),
}).catchall(dynamicValueSchema);

export const updateRecordSchema = z.object({
  id: z.uuid().optional(),

  ref_id: refIdSchema.optional(),

  client_operation_id:
    clientOperationIdSchema.optional(),
}).catchall(dynamicValueSchema).refine(
  (value) => Boolean(
    value.id || value.ref_id
  ),
  {
    message: "id or ref_id is required.",
  }
);

export const deleteRecordSchema = z.object({
  id: z.uuid().optional(),

  ref_id: refIdSchema.optional(),

  client_operation_id:
    clientOperationIdSchema.optional(),
}).strict().refine(
  (value) => Boolean(
    value.id || value.ref_id
  ),
  {
    message: "id or ref_id is required.",
  }
);

export const createRecordsSchema = z.object({
  batch_id: z.uuid(),

  payload: z.array(createRecordSchema)
    .min(1)
    .max(100),
}).strict();

export const updateRecordsSchema = z.object({
  batch_id: z.uuid(),

  payload: z.array(updateRecordSchema)
    .min(1)
    .max(100),
}).strict();

export const deleteRecordsSchema = z.object({
  batch_id: z.uuid(),

  payload: z.array(deleteRecordSchema)
    .min(1)
    .max(100),
}).strict();

export type WriteOperation =
  typeof writeOperations[number];

export type WriteItem = {
  id?: string;
  ref_id?: string;
  client_operation_id?: string;
} & Record<string, unknown>;

export type WriteRecordsInput = {
  batch_id: string;
  payload: WriteItem[];
};

export type RegisteredChange = {
  id: string;
  ref_id: string | null;
  change_id: string;
};
