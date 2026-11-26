
import { NextResponse } from "next/server";

export function apiSuccess<T>(
    data: T,
    status = 200
) {
    return NextResponse.json(
        { data },
        { status }
    );
}

export function apiError(
    code: string,
    message: string,
    status: number,
    field?: string
) {
    return NextResponse.json(
        {
            error: {
                code,
                message,
                ...(field ? { field } : {}),
            },
        },
        { status }
    );
}

export function apiPaginated<T>(
    data: T[],
    nextCursor: string | null
) {
    return NextResponse.json({
        data,
        next_cursor: nextCursor,
    });
}


export function apiDatabaseError(error: unknown) {
    const code =
        typeof error === "object" &&
            error !== null &&
            "code" in error
            ? error.code
            : null;

    switch (code) {

        case "P0001": {
            const message =
                typeof error === "object" &&
                    error !== null &&
                    "message" in error
                    ? error.message
                    : null;

            if (message === "SUBSCRIPTION_MUST_BE_CANCELLED") {
                return apiError(
                    "SUBSCRIPTION_MUST_BE_CANCELLED",
                    "Cancel the subscription before deleting the project.",
                    409
                );
            }

            if (message === "LAST_ADMIN") {
                return apiError(
                    "LAST_ADMIN",
                    "The project must have at least one administrator.",
                    409
                );
            }

            if (message === "SELF_ROLE_CHANGE") {
                return apiError(
                    "SELF_ROLE_CHANGE",
                    "You cannot change your own role.",
                    409
                );
            }

            return apiError(
                "CONFLICT",
                "The operation could not be completed.",
                409
            );
        }

        case "P0002":
            return apiError(
                "NOT_FOUND",
                "Resource not found.",
                404
            );

        case "42501":
            return apiError(
                "FORBIDDEN",
                "Access denied.",
                403
            );

        case "22023":
            return apiError(
                "VALIDATION_ERROR",
                "Invalid input.",
                422
            );

        default:
            return apiError(
                "INTERNAL_ERROR",
                "Unexpected server error.",
                500
            );
    }
}
