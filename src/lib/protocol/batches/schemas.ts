
import { z } from "zod";

export const batchTypes = [
  "TRANSACTION",
  "SETUP",
  "SETTING",
] as const;

export const batchStatuses = [
  "OPEN",
  "COMMITTED",
  "FAILED",
  "DISCARDED",
  "EXPIRED",
] as const;

export const beginBatchSchema = z.object({
  instance_id: z.uuid(),
}).strict();

export const batchIdSchema = z.uuid();

export const BATCH_TTL_MINUTES = 10;

export type BatchType =
  typeof batchTypes[number];

export type BatchStatus =
  typeof batchStatuses[number];

export type BeginBatchInput =
  z.infer<typeof beginBatchSchema>;

export type Batch = {
  id: string;
  instance_id: string | null;
  type: BatchType;
  status: BatchStatus;
  created_at: string;
  closed_at: string | null;
};

export type BatchContext = Batch & {
  project_id: string;
  expired: boolean;
};
