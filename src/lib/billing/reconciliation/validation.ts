import "server-only";

import {
  DomainError,
} from "@/lib/api/domain-error";

import type {
  AuthorizedPayment,
  ProviderPayment,
  MercadoPagoSubscription,
} from "../mercadopago/schemas";

export type LocalSubscription = {
  id: string;
  project_id: string;

  provider_subscription_id:
    string | null;

  amount_minor: number;
  currency: string;

  frequency: number;

  frequency_type:
    | "days"
    | "months";
};

export function validateRemoteSubscription(
  local: LocalSubscription,
  remote: MercadoPagoSubscription
) {
  if (
    remote.external_reference !== local.id ||

    (
      local.provider_subscription_id !== null &&

      local.provider_subscription_id !==
        remote.id
    ) ||

    remote.auto_recurring.currency_id !==
      local.currency ||

    Math.round(
      remote.auto_recurring
        .transaction_amount * 100
    ) !== local.amount_minor ||

    remote.auto_recurring.frequency !==
      local.frequency ||

    remote.auto_recurring.frequency_type !==
      local.frequency_type
  ) {
    throw new DomainError(
      "SUBSCRIPTION_DATA_MISMATCH",
      409
    );
  }
}

export function validateRecurringPayment(
  local: LocalSubscription,
  remote: MercadoPagoSubscription,
  authorized: AuthorizedPayment,
  payment: ProviderPayment
) {
  if (
    authorized.preapproval_id !==
      remote.id ||

    authorized.payment?.id !==
      payment.id ||

    authorized.currency_id !==
      local.currency ||

    payment.currency_id !==
      local.currency ||

    Math.round(
      authorized.transaction_amount * 100
    ) !== local.amount_minor ||

    Math.round(
      payment.transaction_amount * 100
    ) !== local.amount_minor
  ) {
    throw new DomainError(
      "PAYMENT_DATA_MISMATCH",
      409
    );
  }

  const expectedMode =
    process.env.MERCADOPAGO_LIVE_MODE;

  if (
    expectedMode !== "true" &&
    expectedMode !== "false"
  ) {
    throw new DomainError(
      "PAYMENT_MODE_NOT_CONFIGURED",
      503
    );
  }

  if (
    payment.live_mode !==
      (expectedMode === "true")
  ) {
    throw new DomainError(
      "PAYMENT_MODE_MISMATCH",
      409
    );
  }
}

export function isAccreditedPayment(
  payment: ProviderPayment
) {
  return (
    payment.status === "approved" &&
    payment.status_detail === "accredited" &&
    payment.date_approved !== null &&
    payment.transaction_amount_refunded === 0
  );
}