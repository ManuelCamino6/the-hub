
import { z } from "zod";

export type ParameterDefinition = {
  key: string;
  type: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN";
  required: boolean;
  encrypted: boolean;
};

export function normalizeParameter(
  definition: ParameterDefinition,
  value: unknown
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  switch (definition.type) {
    case "TEXT": {
      if (typeof value !== "string") {
        throw new Error("INVALID_PARAMETER");
      }

      if (value.length > 10000) {
        throw new Error("INVALID_PARAMETER");
      }

      return value.trim() === "" ? null : value;
    }

    case "NUMBER": {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value)
      ) {
        throw new Error("INVALID_PARAMETER");
      }

      return String(value);
    }

    case "DATE": {
      const parsed = z.iso.date().safeParse(value);

      if (!parsed.success) {
        throw new Error("INVALID_PARAMETER");
      }

      return parsed.data;
    }

    case "BOOLEAN": {
      if (typeof value !== "boolean") {
        throw new Error("INVALID_PARAMETER");
      }

      return String(value);
    }
  }
}
