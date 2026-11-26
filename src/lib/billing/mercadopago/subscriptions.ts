import "server-only";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  mercadoPagoRequest,
} from "./client";

import {
  mercadoPagoSubscriptionSchema,
} from "./schemas";

type CreateSubscriptionInput = {
  reference: string;
  payerEmail: string;
  amountMinor: number;
  currency: "ARS";
  frequency: number;
  frequencyType: "days" | "months";
  backUrl: string;
};

function parseSubscription(
  value: unknown
) {
  const parsed =
    mercadoPagoSubscriptionSchema
      .safeParse(value);

  if (!parsed.success) {
    throw new DomainError(
      "INVALID_PAYMENT_PROVIDER_RESPONSE",
      502
    );
  }

  return parsed.data;
}

export function validateCheckoutUrl(
  value: string | undefined
) {
  if (!value) {
    throw new DomainError(
      "INVALID_CHECKOUT_URL",
      502
    );
  }

  let url: URL;

  try {
    url = new URL(value);

  } catch {
    throw new DomainError(
      "INVALID_CHECKOUT_URL",
      502
    );
  }

  const allowedHosts = [
    "www.mercadopago.com.ar",
    "mercadopago.com.ar",
  ];

  if (
    url.protocol !== "https:" ||
    !allowedHosts.includes(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !==
      "/subscriptions/checkout"
  ) {
    throw new DomainError(
      "INVALID_CHECKOUT_URL",
      502
    );
  }

  return url.toString();
}

export async function createRemoteSubscription(
  input: CreateSubscriptionInput
) {
  const response =
    await mercadoPagoRequest(
      "/preapproval",
      {
        method: "POST",

        body: {
          reason:
            "The Hub - Business",

          external_reference:
            input.reference,

          payer_email:
            input.payerEmail,

          auto_recurring: {
            frequency:
              input.frequency,

            frequency_type:
              input.frequencyType,

            transaction_amount:
              input.amountMinor / 100,

            currency_id:
              input.currency,
          },

          back_url:
            input.backUrl,

          status: "pending",
        },
      }
    );

  const subscription =
    parseSubscription(response);

  if (
    subscription.external_reference !==
      input.reference ||

    subscription.status !== "pending" ||

    subscription.auto_recurring.currency_id !==
      input.currency ||

    Math.round(
      subscription.auto_recurring
        .transaction_amount * 100
    ) !== input.amountMinor ||

    subscription.auto_recurring.frequency !==
      input.frequency ||

    subscription.auto_recurring.frequency_type !==
      input.frequencyType
  ) {
    throw new DomainError(
      "PAYMENT_PROVIDER_DATA_MISMATCH",
      502
    );
  }

  return {
    ...subscription,

    init_point: validateCheckoutUrl(
      subscription.init_point
    ),
  };
}

export async function getRemoteSubscription(
  subscriptionId: string
) {
  const response =
    await mercadoPagoRequest(
      `/preapproval/${
        encodeURIComponent(subscriptionId)
      }`
    );

  return parseSubscription(response);
}

export async function cancelRemoteSubscription(
  subscriptionId: string
) {
  const response =
    await mercadoPagoRequest(
      `/preapproval/${
        encodeURIComponent(subscriptionId)
      }`,
      {
        method: "PUT",
        body: {
          status: "canceled",
        },
      }
    );

  return parseSubscription(response);
}