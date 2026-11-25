
import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api/auth";
import {
  apiSuccess,
  apiError,
  apiDatabaseError,
} from "@/lib/api/response";

import { DomainError } from "@/lib/api/domain-error";
import { createInstanceSchema } from "@/lib/instances/schemas";
import { createInstance } from "@/lib/instances/service";

import { listInstancesSchema } from "@/lib/instances/schemas";
import { listInstances } from "@/lib/instances/service";
import { apiPaginated } from "@/lib/api/response";
import { decodeCursor } from "@/lib/api/pagination";

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();

  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createInstanceSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid instance definition.",
      422
    );
  }

  try {
    const result = await createInstance(
      auth.user.id,
      parsed.data
    );

    const response = apiSuccess(result, 201);

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


export async function GET(request: NextRequest) {
  const auth = await requireApiUser();

  if (!auth.ok) return auth.response;

  const parsed = listInstancesSchema.safeParse(
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

  try {
    decodeCursor(parsed.data.cursor);
  } catch {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid cursor.",
      422
    );
  }

  try {
    const result = await listInstances(
      auth.user.id,
      parsed.data
    );

    return apiPaginated(
      result.data,
      result.next_cursor
    );
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

