
import "server-only";

import { DomainError } from "@/lib/api/domain-error";

import {
  apiError,
  apiDatabaseError,
} from "@/lib/api/response";

import type {
  BatchStatus,
} from "./batches/schemas";

export class BatchStateError extends DomainError {
  constructor(
    public readonly batchStatus: BatchStatus
  ) {
    super(
      batchStatus === "EXPIRED"
        ? "BATCH_EXPIRED"
        : "BATCH_CLOSED",
      409
    );
  }
}

export function protocolApiError(
  error: unknown
) {
  if (error instanceof BatchStateError) {
    return apiError(
      error.code,
      `Batch status: ${error.batchStatus}`,
      error.status
    );
  }

  if (error instanceof DomainError) {
    return apiError(
      error.code,
      error.message,
      error.status
    );
  }

  return apiDatabaseError(error);
}
