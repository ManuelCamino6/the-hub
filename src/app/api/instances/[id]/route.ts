
import { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/auth";

import {
  apiSuccess,
  apiError,
  apiDatabaseError,
} from "@/lib/api/response";

import { DomainError } from "@/lib/api/domain-error";

import {
  getInstance,
  updateInstance,
} from "@/lib/instances/service";

import {
  updateInstanceSchema,
} from "@/lib/instances/schemas";

type Context = {
  params: Promise<{ id: string }>;
};

function handleError(error: unknown) {
  if (error instanceof DomainError) {
    return apiError(
      error.code,
      error.message,
      error.status
    );
  }

  return apiDatabaseError(error);
}

export async function GET(
  _request: NextRequest,
  { params }: Context
) {
  const auth = await requireApiUser();

  if (!auth.ok) return auth.response;

  const { id } = await params;

  if (!z.uuid().safeParse(id).success) {
    return apiError(
      "NOT_FOUND",
      "Instance not found.",
      404
    );
  }

  try {
    const instance = await getInstance(
      auth.user.id,
      id
    );

    const response = apiSuccess(instance);

    response.headers.set(
      "Cache-Control",
      "no-store"
    );

    return response;
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: Context
) {
  const auth = await requireApiUser();

  if (!auth.ok) return auth.response;

  const { id } = await params;

  if (!z.uuid().safeParse(id).success) {
    return apiError(
      "NOT_FOUND",
      "Instance not found.",
      404
    );
  }

  const body = await request.json()
    .catch(() => null);

  const parsed =
    updateInstanceSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid instance definition.",
      422
    );
  }

  try {
    const result = await updateInstance(
      auth.user.id,
      id,
      parsed.data
    );

    return apiSuccess(result);
  } catch (error) {
    return handleError(error);
  }
}
