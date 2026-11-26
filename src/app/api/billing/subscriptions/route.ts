import type { NextRequest } from "next/server";

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
  subscriptionQuerySchema,
} from "@/lib/billing/schemas";

import {
  getSubscription,
} from "@/lib/billing/subscription-service";

export async function GET(
  request: NextRequest
) {
  const auth = await requireApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  const parsed =
    subscriptionQuerySchema.safeParse(
      Object.fromEntries(
        request.nextUrl.searchParams
      )
    );

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid project.",
      422
    );
  }

  try {
    const subscription =
      await getSubscription(
        auth.user.id,
        parsed.data.project_id
      );

    const response =
      apiSuccess(subscription);

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