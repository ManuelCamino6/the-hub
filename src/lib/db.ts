
import "server-only";

import postgres from "postgres";

function createDatabase() {
    const url = process.env.DATABASE_URL;

    if (!url) {
        throw new Error("DATABASE_URL is missing.");
    }

    return postgres(url, {
        max: 1,
        prepare: false,
        idle_timeout: 20,
        connect_timeout: 10,
        ssl: "require",
    });
}

let database: ReturnType<typeof createDatabase> | undefined;

export function getDatabase() {
    database ??= createDatabase();

    return database;
}
