
import "server-only";

import type { TransactionSql } from "postgres";

import { DomainError } from "@/lib/api/domain-error";

import type { ModelMetadata } from "./metadata";
import type { ChangeFields } from "./write-validation";

export async function validateForeignKeys(
  tx: TransactionSql,
  model: ModelMetadata,
  projectId: string,
  fields: ChangeFields
) {
  for (const column of model.columns) {
    if (!column.foreign_key) {
      continue;
    }

    if (!Object.hasOwn(fields, column.name)) {
      continue;
    }

    const value = fields[column.name];

    if (value === null) {
      continue;
    }

    const [target] = await tx<{
      name: string;
    }[]>`
      select t.name

      from protocol.tables t

      join protocol.versions v
        on v.id = t.version_id

      where t.id = ${column.foreign_key}
        and t.deleted_at is null
        and v.active
    `;

    if (!target) {
      throw new DomainError(
        "FOREIGN_MODEL_NOT_FOUND",
        409
      );
    }

    const [record] = await tx<{
      id: string;
    }[]>`
      select id

      from data.${tx(target.name)}

      where id = ${value}::uuid
        and project_id = ${projectId}
        and deleted_at is null
    `;

    if (!record) {
      throw new DomainError(
        "INVALID_FOREIGN_REFERENCE",
        422
      );
    }
  }
}
