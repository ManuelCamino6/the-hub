import { z } from "zod";

import { refIdSchema } from "../models/schemas";

export const propagationStatuses = [
  "PENDING",
  "FAILED",
  "OK",
  "EXPIRED",
] as const;

export const changeTypes = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "SETTING",
] as const;

export const listChangesSchema = z.object({
  instance_id: z.uuid().optional(),

  status: z.enum(propagationStatuses)
    .default("PENDING"),

  type: z.enum(changeTypes).optional(),

  limit: z.coerce.number()
    .int()
    .min(1)
    .max(200)
    .default(50),

  cursor: z.string().max(512).optional(),
}).strict();

export const confirmationSchema = z.object({
  id: z.uuid(),

  status: z.enum(["OK", "FAILED"]),

  comments: z.string()
    .trim()
    .max(2000)
    .optional(),

  ref_id: refIdSchema.optional(),
}).strict().refine(
  (value) =>
    value.ref_id === undefined ||
    value.status === "OK",
  {
    message: "ref_id requires OK status.",
  }
);

export const confirmChangesSchema = z.object({
  confirmations: z.array(confirmationSchema)
    .min(1)
    .max(100),
}).strict().refine(
  ({ confirmations }) =>
    new Set(
      confirmations.map((item) => item.id)
    ).size === confirmations.length,
  {
    message: "Duplicate propagation IDs.",
  }
);

export type ListChangesInput =
  z.infer<typeof listChangesSchema>;

export type ConfirmChangesInput =
  z.infer<typeof confirmChangesSchema>;

export type PropagationStatus =
  typeof propagationStatuses[number];

export type ChangeType =
  typeof changeTypes[number];

export type Propagation = {
  id: string;
  instance_id: string;
  change_id: string;
  batch_id: string;
  table_name: string | null;
  record_id: string | null;
  type: ChangeType;
  status: PropagationStatus;
  created_at: string;
};