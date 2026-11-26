import type { NextRequest } from "next/server";

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
  checkoutSchema,
} from "@/lib/billing/schemas";

import {
  recoverCheckout,
} from "@/lib/billing/reconciliation/recovery";

export const maxDuration = 60;

export async function POST(
  request: NextRequest
) {
  const auth = await requireApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = checkoutSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid project.",
      422
    );
  }

  try {
    const result = await recoverCheckout(
      auth.user.id,
      parsed.data.project_id
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