import "server-only";

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import {
  DomainError,
} from "@/lib/api/domain-error";

type SignatureInput = {
  signature: string | null;
  requestId: string | null;
  resourceId: string | null;
};

function invalidSignature(): never {
  throw new DomainError(
    "INVALID_WEBHOOK_SIGNATURE",
    401
  );
}

export function verifyWebhookSignature(
  input: SignatureInput
) {
  const secret =
    process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!secret) {
    throw new DomainError(
      "WEBHOOK_NOT_CONFIGURED",
      503
    );
  }

  if (
    !input.signature ||
    !input.requestId ||
    !input.resourceId
  ) {
    invalidSignature();
  }

  const entries = input.signature
    .split(",")
    .map((part) => part.trim());

  const timestamps = entries.filter(
    (part) => part.startsWith("ts=")
  );

  const signatures = entries.filter(
    (part) => part.startsWith("v1=")
  );

  if (
    timestamps.length !== 1 ||
    signatures.length !== 1
  ) {
    invalidSignature();
  }

  const ts = timestamps[0].slice(3);

  const v1 = signatures[0].slice(3);

  if (
    !/^\d{10,13}$/.test(ts) ||
    !/^[a-f0-9]{64}$/i.test(v1) ||
    !/^[a-zA-Z0-9_-]{1,255}$/.test(
      input.resourceId
    ) ||
    !/^[a-zA-Z0-9_-]{1,255}$/.test(
      input.requestId
    )
  ) {
    invalidSignature();
  }

  const manifest =
    `id:${input.resourceId.toLowerCase()};` +
    `request-id:${input.requestId};` +
    `ts:${ts};`;

  const expected = createHmac(
    "sha256",
    secret
  )
    .update(manifest)
    .digest();

  const received =
    Buffer.from(v1, "hex");

  if (
    received.length !== expected.length ||
    !timingSafeEqual(
      expected,
      received
    )
  ) {
    invalidSignature();
  }
}