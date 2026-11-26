import "server-only";

import { z } from "zod";

import { DomainError } from "@/lib/api/domain-error";

const planSchema = z.object({
  code: z.string().min(1).max(50),

  amount_minor: z.coerce.number()
    .int()
    .positive()
    .max(2147483647),

  frequency: z.coerce.number()
    .int()
    .positive(),

  frequency_type: z.enum([
    "days",
    "months",
  ]),
});

export function getBillingPlan() {
  const parsed = planSchema.safeParse({
    code: process.env.BILLING_PLAN_CODE,

    amount_minor:
      process.env.BILLING_AMOUNT_MINOR,

    frequency:
      process.env.BILLING_FREQUENCY,

    frequency_type:
      process.env.BILLING_FREQUENCY_TYPE,
  });

  if (!parsed.success) {
    throw new DomainError(
      "BILLING_NOT_CONFIGURED",
      503
    );
  }

  return {
    ...parsed.data,
    currency: "ARS" as const,
    provider: "mercadopago" as const,
  };
}

export function isCheckoutEnabled() {
  return (
    process.env.BILLING_CHECKOUT_ENABLED ===
    "true"
  );
}

export function getBillingReturnUrl(
  projectId: string
) {
  const baseUrl =
    process.env.BILLING_RETURN_BASE_URL;

  if (!baseUrl) {
    throw new DomainError(
      "BILLING_NOT_CONFIGURED",
      503
    );
  }

  let url: URL;

  try {
    url = new URL(baseUrl);

  } catch {
    throw new DomainError(
      "BILLING_NOT_CONFIGURED",
      503
    );
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password
  ) {
    throw new DomainError(
      "BILLING_NOT_CONFIGURED",
      503
    );
  }

  return new URL(
    `/p/${projectId}/billing/return`,
    url.origin
  ).toString();
}