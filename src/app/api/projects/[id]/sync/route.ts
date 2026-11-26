import {
  requireApiUser,
} from "@/lib/api/auth";

import {
  apiSuccess,
  apiError,
  apiDatabaseError,
} from "@/lib/api/response";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  syncIdSchema,
} from "@/lib/sync/schemas";

import {
  getProjectSync,
} from "@/lib/sync/project-service";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: Context
) {
  if (request.headers.has("authorization")) {
    return apiError(
      "UNAUTHORIZED",
      "Human session required.",
      401
    );
  }

  const auth = await requireApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  if (!syncIdSchema.safeParse(id).success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid project ID.",
      422
    );
  }

  try {
    const result =
      await getProjectSync(
        auth.user.id,
        id
      );

    const response =
      apiSuccess(result);

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