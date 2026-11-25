
import "server-only";

import { z } from "zod";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  normalizeModelValue,
} from "@/lib/protocol/values";

import {
  modelColumnMap,
  modelIdentifier,
  type ModelMetadata,
} from "./metadata";

import type {
  ModelValue,
} from "./schemas";

export type RecordFilter = {
  name: string;
  value: ModelValue;
};

export function parseRecordFilters(
  model: ModelMetadata,
  encoded?: string
): RecordFilter[] {
  if (encoded === undefined) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(encoded);
  } catch {
    throw new DomainError(
      "INVALID_FILTERS",
      422
    );
  }

  const result = z.record(
    z.string(),
    z.unknown()
  ).safeParse(parsed);

  if (!result.success) {
    throw new DomainError(
      "INVALID_FILTERS",
      422
    );
  }

  const entries = Object.entries(
    result.data
  );

  if (entries.length > 20) {
    throw new DomainError(
      "TOO_MANY_FILTERS",
      422
    );
  }

  const columns = modelColumnMap(model);

  return entries.map(([name, value]) => {
    if (name === "id") {
      const id = z.uuid().safeParse(value);

      if (!id.success) {
        throw new DomainError(
          "INVALID_FILTER_VALUE",
          422
        );
      }

      return {
        name,
        value: id.data.toLowerCase(),
      };
    }

    const column = columns.get(name);

    if (!column) {
      throw new DomainError(
        "INVALID_FILTER_FIELD",
        422
      );
    }

    if (value === null) {
      return {
        name,
        value: null,
      };
    }

    try {
      return {
        name,
        value: normalizeModelValue(
          column.type,
          value
        ),
      };
    } catch {
      throw new DomainError(
        "INVALID_FILTER_VALUE",
        422
      );
    }
  });
}


export function parseRecordFields(
  model: ModelMetadata,
  encoded?: string
): string[] {
  const allowed = new Set(
    model.columns.map(
      (column) => column.name
    )
  );

  if (encoded === undefined) {
    return [
      ...allowed,
    ];
  }

  const fields = encoded
    .split(",")
    .map((field) => field.trim());

  for (const field of fields) {
    if (
      field !== "id" &&
      field !== "ref_id" &&
      field !== "global_ref" &&
      !allowed.has(field)
    ) {
      throw new DomainError(
        "INVALID_RECORD_FIELD",
        422
      );
    }
  }

  return [...new Set(fields)].filter(
    (field) =>
      field !== "id" &&
      field !== "ref_id" &&
      field !== "global_ref"
  );
}


export function buildFilterConditions(
  filters: RecordFilter[],
  initialParameter: number
) {
  const conditions: string[] = [];
  const values: ModelValue[] = [];

  for (const filter of filters) {
    const column = modelIdentifier(
      filter.name
    );

    if (filter.value === null) {
      conditions.push(
        `d.${column} is null`
      );

      continue;
    }

    const position =
      initialParameter + values.length;

    conditions.push(
      `d.${column} = $${position}`
    );

    values.push(filter.value);
  }

  return {
    conditions,
    values,
  };
}
