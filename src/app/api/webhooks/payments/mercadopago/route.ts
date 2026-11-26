import type {
  NextRequest,
} from "next/server";

import {
  apiError,
  apiSuccess,
  apiDatabaseError,
} from "@/lib/api/response";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  verifyWebhookSignature,
} from "@/lib/billing/mercadopago/webhook-signature";

import {
  webhookSchema,
  isSupportedWebhookType,
} from "@/lib/billing/webhooks/schemas";

import {
  storeWebhookEvent,
} from "@/lib/billing/webhooks/service";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest
) {
  try {
    const resourceId =
      request.nextUrl.searchParams
        .get("data.id");

    verifyWebhookSignature({
      signature:
        request.headers.get("x-signature"),

      requestId:
        request.headers.get("x-request-id"),

      resourceId,
    });

    const body = await request.json()
      .catch(() => null);

    const parsed =
      webhookSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "INVALID_WEBHOOK_EVENT",
        "Invalid webhook event.",
        422
      );
    }

    const event = parsed.data;

    if (
      event.data.id.toLowerCase() !==
      resourceId?.toLowerCase()
    ) {
      return apiError(
        "WEBHOOK_RESOURCE_MISMATCH",
        "Invalid webhook resource.",
        401
      );
    }

    const queryType =
      request.nextUrl.searchParams
        .get("type");

    if (
      queryType &&
      queryType !== event.type
    ) {
      return apiError(
        "WEBHOOK_TYPE_MISMATCH",
        "Invalid webhook type.",
        422
      );
    }

    if (!isSupportedWebhookType(
      event.type
    )) {
      return apiSuccess({
        received: true,
      });
    }

    await storeWebhookEvent(event);

    const response = apiSuccess({
      received: true,
    });

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