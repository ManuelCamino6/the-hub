import type { NextRequest } from "next/server";

import {
  requireApiUser,
} from "@/lib/api/auth";

import {
  apiError,
  apiPaginated,
  apiDatabaseError,
} from "@/lib/api/response";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  decodeCursor,
} from "@/lib/api/pagination";

import {
  listInvoicesSchema,
} from "@/lib/billing/schemas";

import {
  listInvoices,
} from "@/lib/billing/invoice-service";

export async function GET(
  request: NextRequest
) {
  const auth = await requireApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  const parsed =
    listInvoicesSchema.safeParse(
      Object.fromEntries(
        request.nextUrl.searchParams
      )
    );

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid query.",
      422
    );
  }

  if (parsed.data.cursor) {
    try {
      decodeCursor(parsed.data.cursor);
    } catch {
      return apiError(
        "INVALID_CURSOR",
        "Invalid cursor.",
        422
      );
    }
  }

  try {
    const result = await listInvoices(
      auth.user.id,
      parsed.data
    );

    const response = apiPaginated(
      result.data,
      result.next_cursor
    );

    response.headers.set(
      "Cache-Control",
      "no-store"
    );

    return response;

  } catch (error) {
    if (error instanceof DomainError) {
      return apiError(
        error.code,
        error.message,
        error.status
      );
    }

    return apiDatabaseError(error);
  }
}