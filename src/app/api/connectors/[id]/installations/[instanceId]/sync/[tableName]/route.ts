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
  syncTableNameSchema,
} from "@/lib/sync/schemas";

import {
  getDevelopmentModelSync,
} from "@/lib/sync/development-service";

type Context = {
  params: Promise<{
    id: string;
    instanceId: string;
    tableName: string;
  }>;
};

export async function GET(
  request: Request,
  context: Context
) {
  if (
    request.headers.has("authorization")
  ) {
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

  const {
    id,
    instanceId,
    tableName,
  } = await context.params;

  if (
    !syncIdSchema.safeParse(id).success ||

    !syncIdSchema.safeParse(
      instanceId
    ).success ||

    !syncTableNameSchema.safeParse(
      tableName
    ).success
  ) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid connector, installation or model.",
      422
    );
  }

  try {
    const result =
      await getDevelopmentModelSync(
        auth.user.id,
        id,
        instanceId,
        tableName
      );

    const response = apiSuccess(result);

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