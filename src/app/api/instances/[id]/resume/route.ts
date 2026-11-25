
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
  resumeInstance,
} from "@/lib/instances/service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(
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
    const result = await resumeInstance(
      auth.user.id,
      id
    );

    return apiSuccess(result);
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

