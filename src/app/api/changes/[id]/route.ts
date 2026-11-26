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
  getChange,
} from "@/lib/protocol/propagations/pull-service";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: Context
) {
  try {
    const tokenHash =
      getConnectorTokenHash(request);

    const { id } = await params;

    const parsed = z.uuid().safeParse(id);

    if (!parsed.success) {
      return apiError(
        "PROPAGATION_NOT_FOUND",
        "Propagation not found.",
        404
      );
    }

    const result = await getChange(
      tokenHash,
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