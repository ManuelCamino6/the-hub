import "server-only";

import { DomainError } from "@/lib/api/domain-error";

export function requireHumanRequest(
  request: Request
) {
  if (
    request.headers.has("authorization")
  ) {
    throw new DomainError(
      "UNAUTHORIZED",
      401
    );
  }
}

export function requireBiMutationOrigin(
  request: Request
) {
  const origin =
    request.headers.get("origin");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL;

  if (
    !origin ||
    !appUrl ||
    origin !== new URL(appUrl).origin
  ) {
    throw new DomainError(
      "FORBIDDEN",
      403
    );
  }
}