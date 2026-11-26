import type { NextRequest } from "next/server";

import { z } from "zod";

import {
  apiError,
  apiSuccess,
} from "@/lib/api/response";

import {
  getConnectorTokenHash,
} from "@/lib/connectors/auth";

import {
  protocolApiError,
} from "@/lib/protocol/errors";

import {
  setupSchema,
} from "@/lib/protocol/setup/schemas";

import {
  setupInstance,
} from "@/lib/protocol/setup/service";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: Context
) {
  try {
    const tokenHash =
      getConnectorTokenHash(request);

    const { id } = await params;

    const instanceId =
      z.uuid().safeParse(id);

    if (!instanceId.success) {
      return apiError(
        "INSTANCE_NOT_FOUND",
        "Instance not found.",
        404
      );
    }

    const body = await request.json()
      .catch(() => null);

    const parsed =
      setupSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid setup configuration.",
        422
      );
    }

    const result = await setupInstance(
      tokenHash,
      instanceId.data,
      parsed.data
    );

    const response = apiSuccess(result);

    response.headers.set(
      "Cache-Control",
      "no-store"
    );

    return response;

  } catch (error) {
    return protocolApiError(error);
  }
}