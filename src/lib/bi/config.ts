import "server-only";

import { z } from "zod";

const biConfigSchema = z.object({
  host: z.string().trim().min(1),

  port: z.coerce.number()
    .int()
    .min(1)
    .max(65535),

  database: z.string().trim().min(1),

  mode: z.enum(["direct", "session"]),

  projectRef: z.string().trim().optional(),
}).refine(
  (value) =>
    value.mode === "direct" ||
    Boolean(value.projectRef)
);

export function getBiConfig() {
  if (process.env.BI_ENABLED !== "true") {
    return null;
  }

  const result = biConfigSchema.safeParse({
    host: process.env.BI_HOST,
    port: process.env.BI_PORT ?? "5432",
    database: process.env.BI_DATABASE ?? "postgres",
    mode: process.env.BI_CONNECTION_MODE ?? "session",
    projectRef: process.env.BI_POOLER_PROJECT_REF,
  });

  if (!result.success) {
    return null;
  }

  return {
    ...result.data,
    schema: "analytics" as const,
    ssl: true as const,
  };
}

export function getBiConnectionUsername(
  username: string,
  mode: "direct" | "session",
  projectRef?: string
) {
  if (mode === "direct") {
    return username;
  }

  if (!projectRef) {
    throw new Error("BI_POOLER_PROJECT_REF is missing.");
  }

  return `${username}.${projectRef}`;
}