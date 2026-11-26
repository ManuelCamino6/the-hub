import "server-only";

import { z } from "zod";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  mercadoPagoRequest,
} from "./client";

import {
  authorizedPaymentSchema,
  authorizedPaymentSearchSchema,
  providerPaymentSchema,
} from "./schemas";

function parseResponse<T>(
  schema: z.ZodType<T>,
  value: unknown
): T {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new DomainError(
      "INVALID_PAYMENT_PROVIDER_RESPONSE",
      502
    );
  }

  return parsed.data;
}

export async function getAuthorizedPayment(
  id: string
) {
  const response =
    await mercadoPagoRequest(
      `/authorized_payments/${
        encodeURIComponent(id)
      }`
    );

  return parseResponse(
    authorizedPaymentSchema,
    response
  );
}

export async function getProviderPayment(
  id: string
) {
  const response =
    await mercadoPagoRequest(
      `/v1/payments/${
        encodeURIComponent(id)
      }`
    );

  return parseResponse(
    providerPaymentSchema,
    response
  );
}

export async function findAuthorizedPayments(
  filters: {
    preapproval_id?: string;
    payment_id?: string;
  },
  offset = 0
) {
  const params = new URLSearchParams({
    limit: "20",
    offset: String(offset),
  });

  if (filters.preapproval_id) {
    params.set(
      "preapproval_id",
      filters.preapproval_id
    );
  }

  if (filters.payment_id) {
    params.set(
      "payment_id",
      filters.payment_id
    );
  }

  const response =
    await mercadoPagoRequest(
      `/authorized_payments/search?${params}`
    );

  return parseResponse(
    authorizedPaymentSearchSchema,
    response
  );
}