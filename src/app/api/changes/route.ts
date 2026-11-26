import type { NextRequest } from "next/server";

import {
  apiError,
  apiSuccess,
  apiPaginated,
} from "@/lib/api/response";

import {
  decodeDeliveryCursor,
} from "@/lib/protocol/propagations/pagination";

import {
  getConnectorTokenHash,
} from "@/lib/connectors/auth";

import {
  protocolApiError,
} from "@/lib/protocol/errors";

import {
  listChangesSchema,
  confirmChangesSchema,
} from "@/lib/protocol/propagations/schemas";

import {
  listChanges,
} from "@/lib/protocol/propagations/pull-service";

import {
  confirmChanges,
} from "@/lib/protocol/propagations/confirmation-service";

export async function GET(
  request: NextRequest
) {
  try {
    const tokenHash =
      getConnectorTokenHash(request);

    const parsed = listChangesSchema.safeParse(
      Object.fromEntries(
        request.nextUrl.searchParams
      )
    );

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid query parameters.",
        422
      );
    }

    if (parsed.data.cursor) {
      try {
        decodeDeliveryCursor(parsed.data.cursor);
      } catch {
        return apiError(
          "INVALID_CURSOR",
          "Invalid cursor.",
          422
        );
      }
    }

    const result = await listChanges(
      tokenHash,
      parsed.data
    );

    const response = apiPaginated(
      result.data,
      result.next_cursor
    );

    response.headers.set(
      "Cache-Control",
      "no-store"
    );

    return response;

  } catch (error) {
    return protocolApiError(error);
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const tokenHash =
      getConnectorTokenHash(request);

    const body = await request.json()
      .catch(() => null);

    const parsed =
      confirmChangesSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid confirmations.",
        422
      );
    }

    const result = await confirmChanges(
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