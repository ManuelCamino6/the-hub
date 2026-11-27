import "server-only";

import { z } from "zod";

const biConfigSchema = z.object({
    host: z.string().trim().min(1),
    port: z.coerce.number().int().min(1).max(65535),
    database: z.string().trim().min(1),
});

export function getBiConfig() {
    if (process.env.BI_ENABLED !== "true") {
        return null;
    }

    const result = biConfigSchema.safeParse({
        host: process.env.BI_HOST,
        port: process.env.BI_PORT ?? "5432",
        database: process.env.BI_DATABASE ?? "postgres",
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