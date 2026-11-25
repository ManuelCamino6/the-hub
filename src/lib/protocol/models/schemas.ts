
import { z } from "zod";

import {
  tableNameSchema,
} from "@/lib/protocol/schemas";

export const modelPathSchema = z.object({
  version: z.string()
    .regex(/^[1-9][0-9]{0,4}$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(32767)),

  table_name: tableNameSchema,
});

export const listRecordsSchema = z.object({
  instance_id: z.uuid(),

  project_id: z.uuid().optional(),

  filters: z.string()
    .max(20000)
    .optional(),

  fields: z.string()
    .max(7000)
    .optional(),

  limit: z.coerce.number()
    .int()
    .min(1)
    .max(200)
    .default(50),

  cursor: z.string()
    .max(512)
    .optional(),
}).strict();

export const refIdSchema = z.string()
  .min(1)
  .max(255)
  .refine((value) => (
    value.trim().length > 0 &&
    !value.includes("\0")
  ));

export const recordReferenceSchema = z.object({
  id: z.uuid().optional(),
  ref_id: refIdSchema.optional(),
}).strict().refine(
  (value) => Boolean(
    value.id || value.ref_id
  ),
  {
    message: "id or ref_id is required.",
  }
);

export const modelPermissionKeys = [
  "can_list",
  "can_send_post",
  "can_receive_post",
  "can_send_update",
  "can_receive_update",
  "can_send_delete",
  "can_receive_delete",
] as const;

export type ModelPermissionKey =
  typeof modelPermissionKeys[number];

export type ListRecordsInput =
  z.infer<typeof listRecordsSchema>;

export type RecordReference =
  z.infer<typeof recordReferenceSchema>;

export type ModelPath =
  z.infer<typeof modelPathSchema>;

export type ModelValue =
  string | number | boolean | null;
