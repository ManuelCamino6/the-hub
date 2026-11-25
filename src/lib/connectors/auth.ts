
import "server-only";

import { createHash } from "node:crypto";
import type { TransactionSql } from "postgres";

import { DomainError } from "@/lib/api/domain-error";

export function hasConnectorAuthorization(
  request: Request
): boolean {
  return request.headers.has("authorization");
}

export function getConnectorTokenHash(
  request: Request
): string {
  const authorization =
    request.headers.get("authorization");

  const match = authorization?.match(
    /^Bearer (hub_[a-f0-9]{64})$/i
  );

  if (!match) {
    throw new DomainError(
      "INVALID_CONNECTOR_TOKEN",
      401
    );
  }

  return createHash("sha256")
    .update(match[1])
    .digest("hex");
}

export async function authenticateConnector(
  tx: TransactionSql,
  tokenHash: string
) {
  const [connector] = await tx<{
    id: string;
    project_id: string;
    status:
      | "IN_DEVELOPMENT"
      | "AVAILABLE"
      | "DEPRECATED";
  }[]>`
    select
      c.id,
      c.project_id,
      c.status

    from platform.connectors c

    join platform.projects p
      on p.id = c.project_id

    where c.token_hash = ${tokenHash}
      and c.deleted_at is null
      and p.deleted_at is null
      and p.type = 'DEVELOPMENT'

    for share of c
  `;

  if (!connector) {
    throw new DomainError(
      "INVALID_CONNECTOR_TOKEN",
      401
    );
  }

  return connector;
}
