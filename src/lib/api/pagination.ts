
import "server-only";
import { z } from "zod";

const cursorSchema = z.object({
    id: z.uuid(),
    created_at: z.iso.datetime({ offset: true }),
});

type Cursor = z.infer<typeof cursorSchema>;

export function decodeCursor(
    cursor?: string
): Cursor | null {
    if (!cursor) return null;

    return cursorSchema.parse(
        JSON.parse(
            Buffer.from(cursor, "base64url").toString("utf8")
        )
    );
}

export function paginate<T extends Cursor>(
    rows: T[],
    limit: number
) {
    const data = rows.slice(0, limit);
    const last = data.at(-1);

    const next_cursor =
        rows.length > limit && last
            ? Buffer.from(
                JSON.stringify({
                    id: last.id,
                    created_at: last.created_at,
                })
            ).toString("base64url")
            : null;

    return { data, next_cursor };
}