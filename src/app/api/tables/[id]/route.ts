
import { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/auth";
import { DomainError } from "@/lib/api/domain-error";

import {
  apiSuccess,
  apiError,
  apiDatabaseError,
} from "@/lib/api/response";

import {
  tableDefinitionSchema,
} from "@/lib/protocol/schemas";

import {
  getModelTable,
  updateModelTable,
  deleteModelTable,
} from "@/lib/protocol/admin-service";

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

  const databaseError = error as {
    code?: string;
  } | null;

  switch (databaseError?.code) {
    case "2BP01":
      return apiError(
        "MODEL_HAS_DEPENDENCIES",
        "Model has dependent objects.",
        409
      );

    case "23502":
    case "23503":
    case "23514":
    case "22P02":
    case "22003":
    case "42846":
      return apiError(
        "INCOMPATIBLE_MODEL_DEFINITION",
        "Model definition is incompatible with existing data.",
        422
      );
  }

  return apiDatabaseError(error);
}

async function handle(
  request: NextRequest,
  { params }: Context
) {
  const auth = await requireApiUser();

  if (!auth.ok) return auth.response;

  const { id } = await params;

  if (!z.uuid().safeParse(id).success) {
    return apiError(
      "NOT_FOUND",
      "Model not found.",
      404
    );
  }

  try {
    if (request.method === "GET") {
      return apiSuccess(
        await getModelTable(
          auth.user.id,
          id
        )
      );
    }

    if (request.method === "PUT") {
      const body = await request.json()
        .catch(() => null);

      const parsed =
        tableDefinitionSchema.safeParse(body);

      if (!parsed.success) {
        return apiError(
          "VALIDATION_ERROR",
          "Invalid model definition.",
          422
        );
      }

      return apiSuccess(
        await updateModelTable(
          auth.user.id,
          id,
          parsed.data
        )
      );
    }

    return apiSuccess(
      await deleteModelTable(
        auth.user.id,
        id
      )
    );
  } catch (error) {
    return handleError(error);
  }
}

export const GET = handle;
export const PUT = handle;
export const DELETE = handle;
