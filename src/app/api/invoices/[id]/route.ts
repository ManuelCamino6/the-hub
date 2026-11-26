import { z } from "zod";

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
  getInvoice,
} from "@/lib/billing/invoice-service";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  { params }: Context
) {
  const auth = await requireApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;

  const parsed = z.uuid().safeParse(id);

  if (!parsed.success) {
    return apiError(
      "INVOICE_NOT_FOUND",
      "Invoice not found.",
      404
    );
  }

  try {
    const invoice = await getInvoice(
      auth.user.id,
      parsed.data
    );

    const response = apiSuccess(invoice);

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