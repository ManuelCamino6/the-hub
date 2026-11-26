import type {
    NextRequest,
} from "next/server";

import {
    timingSafeEqual,
    createHash,
} from "node:crypto";

import {
    apiSuccess,
    apiError,
    apiDatabaseError,
} from "@/lib/api/response";

import {
    processPendingEvents,
} from "@/lib/billing/reconciliation/events";

import {
    reconcileNextSubscription,
} from "@/lib/billing/reconciliation/maintenance";

export const maxDuration = 60;

function authorized(
    request: NextRequest
) {
    const secret =
        process.env.CRON_SECRET;

    if (!secret) {
        return false;
    }

    const expected = createHash(
        "sha256"
    )
        .update(`Bearer ${secret}`)
        .digest();

    const received = createHash(
        "sha256"
    )
        .update(
            request.headers.get(
                "authorization"
            ) ?? ""
        )
        .digest();

    return timingSafeEqual(
        expected,
        received
    );
}

export async function GET(
    request: NextRequest
) {
    if (!authorized(request)) {
        return apiError(
            "UNAUTHORIZED",
            "Unauthorized.",
            401
        );
    }

    try {
        const maintenance =
            request.nextUrl.searchParams.get(
                "task"
            ) === "subscriptions";

        const result = maintenance
            ? await reconcileNextSubscription()
            : await processPendingEvents(1);

        const response =
            apiSuccess(result);

        response.headers.set(
            "Cache-Control",
            "no-store"
        );

        return response;

    } catch (error) {
        return apiDatabaseError(error);
    }
}