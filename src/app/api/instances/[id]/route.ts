
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
  deleteInstance,
  getInstance,
  updateInstance,
} from "@/lib/instances/service";

import {
  updateInstanceSchema,
} from "@/lib/instances/schemas";


import {
  hasConnectorAuthorization,
  getConnectorTokenHash,
} from "@/lib/connectors/auth";

import {
  getConnectorInstance,
} from "@/lib/instances/connector-service";

import {
  getDevelopmentInstallation,
} from "@/lib/instances/development-service";


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
  request: NextRequest,
  { params }: Context
) {
  const { id } = await params;

  try {
    if (hasConnectorAuthorization(request)) {
      const tokenHash =
        getConnectorTokenHash(request);

      if (!z.uuid().safeParse(id).success) {
        return apiError(
          "NOT_FOUND",
          "Instance not found.",
          404
        );
      }

      const instance = await getConnectorInstance(
        tokenHash,
        id
      );

      const response = apiSuccess(instance);

      response.headers.set(
        "Cache-Control",
        "no-store"
      );

      return response;
    }

    const auth = await requireApiUser();

    if (!auth.ok) return auth.response;

    if (!z.uuid().safeParse(id).success) {
      return apiError(
        "NOT_FOUND",
        "Instance not found.",
        404
      );
    }

    let result;

    try {
      result = await getInstance(
        auth.user.id,
        id
      );
    } catch (error) {
      if (
        !(error instanceof DomainError) ||
        error.status !== 404
      ) {
        throw error;
      }

      result = await getDevelopmentInstallation(
        auth.user.id,
        id
      );
    }

    const response = apiSuccess(result);

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

  if (request.headers.has("authorization")) {
    return apiError(
      "HUMAN_SESSION_REQUIRED",
      "This operation requires a user session.",
      401
    );
  }
  
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


export async function DELETE(
  request: NextRequest,
  { params }: Context
) {

  if (request.headers.has("authorization")) {
    return apiError(
      "HUMAN_SESSION_REQUIRED",
      "This operation requires a user session.",
      401
    );
  }

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
    const result = await deleteInstance(
      auth.user.id,
      id
    );

    return apiSuccess(result);
  } catch (error) {
    return handleError(error);
  }
}