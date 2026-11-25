
import { z } from "zod";
import { DomainError } from "@/lib/api/domain-error";

import type {
  ColumnType,
  ColumnDefinition,
} from "./schemas";

export type ModelValue =
  string | number | boolean | null;

export function normalizeModelValue(
  type: ColumnType,
  value: unknown
): ModelValue {
  if (value === null) return null;

  switch (type) {
    case "INT":
      if (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= -2147483648 &&
        value <= 2147483647
      ) {
        return value;
      }
      break;

    case "FLOAT":
      if (
        typeof value === "number" &&
        Number.isFinite(value)
      ) {
        return value;
      }
      break;

    case "BOOLEAN":
      if (typeof value === "boolean") {
        return value;
      }
      break;

    case "UUID":
      if (z.uuid().safeParse(value).success) {
        return (value as string).toLowerCase();
      }
      break;

    case "TIMESTAMPTZ":
      if (
        typeof value === "string" &&
        z.iso.datetime({
          offset: true,
        }).safeParse(value).success &&
        Number.isFinite(Date.parse(value))
      ) {
        return new Date(value).toISOString();
      }
      break;

    case "VARCHAR":
    case "TEXT":
      if (
        typeof value === "string" &&
        !value.includes("\0")
      ) {
        return value;
      }
      break;
  }

  throw new DomainError(
    "INVALID_MODEL_VALUE",
    422
  );
}

export function parseMetadataValue(
  type: ColumnType,
  value: string
): ModelValue {
  switch (type) {
    case "INT":
      if (!/^-?\d+$/.test(value)) {
        break;
      }

      return normalizeModelValue(
        type,
        Number(value)
      );

    case "FLOAT":
      if (
        !/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
          .test(value)
      ) {
        break;
      }

      return normalizeModelValue(
        type,
        Number(value)
      );

    case "BOOLEAN":
      if (value === "true") return true;
      if (value === "false") return false;
      break;

    default:
      return normalizeModelValue(type, value);
  }

  throw new DomainError(
    "INVALID_METADATA_VALUE",
    422
  );
}

export function validateColumnDefinition(
  column: ColumnDefinition
) {
  const allowed = column.possible_values?.map(
    (value) => parseMetadataValue(
      column.type,
      value
    )
  );

  if (
    allowed &&
    new Set(allowed).size !== allowed.length
  ) {
    throw new DomainError(
      "DUPLICATE_POSSIBLE_VALUES",
      422
    );
  }

  if (column.default_value !== null) {
    const value = parseMetadataValue(
      column.type,
      column.default_value
    );

    if (allowed && !allowed.includes(value)) {
      throw new DomainError(
        "INVALID_DEFAULT_VALUE",
        422
      );
    }
  }
}

export function validateColumnValue(
  column: ColumnDefinition,
  value: unknown
): ModelValue {
  const normalized = normalizeModelValue(
    column.type,
    value
  );

  if (normalized === null) {
    if (!column.nullable) {
      throw new DomainError(
        "NULL_NOT_ALLOWED",
        422
      );
    }

    return null;
  }

  if (column.possible_values) {
    const allowed = column.possible_values.map(
      (item) => parseMetadataValue(
        column.type,
        item
      )
    );

    if (!allowed.includes(normalized)) {
      throw new DomainError(
        "VALUE_NOT_ALLOWED",
        422
      );
    }
  }

  return normalized;
}
