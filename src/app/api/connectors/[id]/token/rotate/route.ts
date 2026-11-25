
import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api/auth";
import { projectIdSchema } from "@/lib/projects/schemas";

import {
  apiSuccess,
  apiError,
  apiDatabaseError,
} from "@/lib/api/response";

import {
  rotateConnectorToken,
} from "@/lib/connectors/service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: NextRequest,
  context: Context
) {
  const auth = await requireApiUser();

  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  if (!projectIdSchema.safeParse(id).success) {
    return apiError(
      "NOT_FOUND",
      "Connector not found.",
      404
    );
  }

  try {
    const result = await rotateConnectorToken(id);
    const response = apiSuccess(result);

    response.headers.set(
      "Cache-Control",
      "no-store"
    );

    return response;
  } catch (error) {
    return apiDatabaseError(error);
  }
}
