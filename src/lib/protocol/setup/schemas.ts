import { z } from "zod";

import {
  tableNameSchema,
} from "@/lib/protocol/schemas";

export const setupSchema = z.object({
  models: z.array(tableNameSchema)
    .min(1)
    .max(200)
    .optional(),
}).strict().refine(
  ({ models }) =>
    !models ||
    new Set(models).size === models.length,
  {
    message: "Duplicate models.",
  }
);

export type SetupInput =
  z.infer<typeof setupSchema>;

export type SetupResult = {
  batch_id: string;
  models: string[];
  changes_created: number;
  propagations_created: number;
};