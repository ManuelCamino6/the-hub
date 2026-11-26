
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
  commitBatch,
} from "@/lib/protocol/batches/commit-service";

import {
  protocolApiError,
} from "@/lib/protocol/errors";

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

    const parsed = z.uuid().safeParse(id);

    if (!parsed.success) {
      return apiError(
        "BATCH_NOT_FOUND",
        "Batch not found.",
        404
      );
    }

    const result = await commitBatch(
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
