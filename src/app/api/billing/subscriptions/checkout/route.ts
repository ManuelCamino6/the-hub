import type {
  NextRequest,
} from "next/server";

import {
  requireApiUser,
} from "@/lib/api/auth";

import {
  apiError,
  apiSuccess,
  apiDatabaseError,
} from "@/lib/api/response";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  checkoutSchema,
} from "@/lib/billing/schemas";

import {
  createCheckout,
} from "@/lib/billing/checkout-service";

export async function POST(
  request: NextRequest
) {
  const auth = await requireApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  const origin =
    request.headers.get("origin");

  const configuredOrigin =
    process.env.NEXT_PUBLIC_APP_URL;

  if (
    !configuredOrigin ||
    (
      origin &&
      origin !==
        new URL(configuredOrigin).origin
    )
  ) {
    return apiError(
      "INVALID_ORIGIN",
      "Invalid request origin.",
      403
    );
  }

  const body = await request.json()
    .catch(() => null);

  const parsed =
    checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid checkout request.",
      422
    );
  }

  if (
    !auth.user.email ||
    !auth.user.email_confirmed_at
  ) {
    return apiError(
      "VERIFIED_EMAIL_REQUIRED",
      "A verified email is required.",
      422
    );
  }

  try {
    const result = await createCheckout(
      auth.user.id,
      parsed.data.project_id,
      auth.user.email
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