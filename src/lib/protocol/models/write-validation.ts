
import "server-only";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  validateColumnValue,
} from "@/lib/protocol/values";

import {
  modelColumnMap,
  type ModelMetadata,
} from "./metadata";

import type {
  ModelValue,
} from "./schemas";

import type {
  WriteItem,
  WriteOperation,
} from "./write-schemas";

export type ChangeFields = Record<
  string,
  ModelValue
>;

export type ChangePayload = {
  ref_id: string | null;
  fields: ChangeFields;
};

const transportFields = new Set([
  "id",
  "ref_id",
  "client_operation_id",
]);

export function validateWriteFields(
  model: ModelMetadata,
  operation: WriteOperation,
  item: WriteItem
): ChangeFields {
  const columns = modelColumnMap(model);

  const fields: ChangeFields =
    Object.create(null);

  if (
    operation === "CREATE" &&
    Object.hasOwn(item, "id")
  ) {
    throw new DomainError(
      "RECORD_ID_NOT_ALLOWED",
      422
    );
  }

  for (const [name, value] of
    Object.entries(item)
  ) {
    if (transportFields.has(name)) {
      continue;
    }

    if (operation === "DELETE") {
      throw new DomainError(
        "DELETE_FIELDS_NOT_ALLOWED",
        422
      );
    }

    const column = columns.get(name);

    if (!column) {
      throw new DomainError(
        "INVALID_RECORD_FIELD",
        422
      );
    }

    if (
      operation === "UPDATE" &&
      column.constant
    ) {
      throw new DomainError(
        "CONSTANT_FIELD",
        422
      );
    }

    try {
      fields[name] = validateColumnValue(
        column,
        value
      );
    } catch {
      throw new DomainError(
        "INVALID_RECORD_VALUE",
        422
      );
    }
  }

  if (operation === "CREATE") {
    for (const column of model.columns) {
      const provided = Object.hasOwn(
        fields,
        column.name
      );

      if (
        !provided &&
        !column.nullable &&
        column.default_value === null
      ) {
        throw new DomainError(
          "REQUIRED_RECORD_FIELD",
          422
        );
      }
    }
  }

  if (
    operation === "UPDATE" &&
    Object.keys(fields).length === 0
  ) {
    throw new DomainError(
      "EMPTY_RECORD_UPDATE",
      422
    );
  }

  return fields;
}
