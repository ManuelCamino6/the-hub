import "server-only";

import { z } from "zod";

import { DomainError } from "@/lib/api/domain-error";

const deliveryCursorSchema = z.object({
    delivery_order: z.string()
        .regex(/^[1-9][0-9]{0,18}$/)
        .refine(
            (value) =>
                BigInt(value) <= 9223372036854775807
        ),
}).strict();

export function decodeDeliveryCursor(
    cursor: string
) {
    try {
        const value = JSON.parse(
            Buffer.from(
                cursor,
                "base64url"
            ).toString("utf8")
        );

        return deliveryCursorSchema.parse(value);

    } catch {
        throw new DomainError(
            "INVALID_CURSOR",
            422
        );
    }
}

export function paginateDeliveries<
    T extends { delivery_order: string }
>(
    rows: T[],
    limit: number
) {
    const hasMore = rows.length > limit;

    const page = rows.slice(0, limit);

    const last = page.at(-1);

    const nextCursor = hasMore && last
        ? Buffer.from(
            JSON.stringify({
                delivery_order:
                    last.delivery_order,
            })
        ).toString("base64url")
        : null;

    return {
        data: page.map(
            ({ delivery_order, ...row }) => {
                void delivery_order;
                return row;
            }
        ),
        next_cursor: nextCursor,
    };
}