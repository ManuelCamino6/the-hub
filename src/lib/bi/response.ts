import "server-only";

import {
  apiError,
  apiSuccess,
} from "@/lib/api/response";

import { DomainError } from "@/lib/api/domain-error";

export function biSuccess(
  data: unknown,
  status = 200
) {
  const response = apiSuccess(
    data,
    status
  );

  response.headers.set(
    "Cache-Control",
    "no-store"
  );

  return response;
}

export function biError(error: unknown) {
  const response =
    error instanceof DomainError
      ? apiError(
          error.code,
          error.code,
          error.status
        )
      : apiError(
          "INTERNAL_ERROR",
          "Unexpected error.",
          500
        );

  response.headers.set(
    "Cache-Control",
    "no-store"
  );

  return response;
}