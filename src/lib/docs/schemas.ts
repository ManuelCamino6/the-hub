import { z } from "zod";

import {
  columnTypes,
} from "@/lib/protocol/schemas";

export const publishedColumnSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),

  type: z.enum(columnTypes),

  nullable: z.boolean(),
  constant: z.boolean(),

  default_value: z.string().nullable(),

  possible_values: z.array(
    z.string()
  ).nullable(),

  foreign_key: z.string().nullable(),
});

export const publishedTableSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),

  columns: z.array(
    publishedColumnSchema
  ),
});

export const publishedModelSchema = z.object({
  version: z.number().int().positive(),

  name: z.string(),

  description: z.string().nullable(),

  tables: z.array(
    publishedTableSchema
  ),
});

export type PublishedColumn =
  z.infer<typeof publishedColumnSchema>;

export type PublishedTable =
  z.infer<typeof publishedTableSchema>;

export type PublishedModel =
  z.infer<typeof publishedModelSchema>;