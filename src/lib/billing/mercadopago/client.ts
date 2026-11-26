import "server-only";

import {
  DomainError,
} from "@/lib/api/domain-error";

const API_URL =
  "https://api.mercadopago.com";

export async function mercadoPagoRequest(
  path: `/${string}`,
  options: {
    method?: "GET" | "POST" | "PUT";
    body?: unknown;
  } = {}
): Promise<unknown> {
  const token =
    process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!token) {
    throw new DomainError(
      "PAYMENT_PROVIDER_NOT_CONFIGURED",
      503
    );
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_URL}${path}`,
      {
        method: options.method ?? "GET",

        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: options.body === undefined
          ? undefined
          : JSON.stringify(options.body),

        cache: "no-store",

        redirect: "error",

        signal: AbortSignal.timeout(10000),
      }
    );

  } catch {
    throw new DomainError(
      "PAYMENT_PROVIDER_UNAVAILABLE",
      502
    );
  }

  if (!response.ok) {
    console.error(
      "Mercado Pago request failed",
      {
        status: response.status,
        method: options.method ?? "GET",
      }
    );

    throw new DomainError(
      "PAYMENT_PROVIDER_ERROR",
      502
    );
  }

  try {
    return await response.json();

  } catch {
    throw new DomainError(
      "INVALID_PAYMENT_PROVIDER_RESPONSE",
      502
    );
  }
}