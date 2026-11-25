
import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api/auth";
import { DomainError } from "@/lib/api/domain-error";

import {
    apiSuccess,
    apiError,
    apiPaginated,
    apiDatabaseError,
} from "@/lib/api/response";

import { decodeCursor } from "@/lib/api/pagination";

import {
    tableDefinitionSchema,
    listTablesSchema,
} from "@/lib/protocol/schemas";

import {
    createModelTable,
    listModelTables,
} from "@/lib/protocol/admin-service";

function handleError(error: unknown) {
    if (error instanceof DomainError) {
        return apiError(
            error.code,
            error.message,
            error.status
        );
    }

    return apiDatabaseError(error);
}

export async function GET(request: NextRequest) {
    const auth = await requireApiUser();

    if (!auth.ok) return auth.response;

    const parsed = listTablesSchema.safeParse(
        Object.fromEntries(
            request.nextUrl.searchParams
        )
    );

    if (!parsed.success) {
        return apiError(
            "VALIDATION_ERROR",
            "Invalid filters.",
            422
        );
    }

    try {
        decodeCursor(parsed.data.cursor);
    } catch {
        return apiError(
            "INVALID_CURSOR",
            "Invalid cursor.",
            422
        );
    }

    try {
        const result = await listModelTables(
            auth.user.id,
            parsed.data
        );

        return apiPaginated(
            result.data,
            result.next_cursor
        );
    } catch (error) {
        return handleError(error);
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireApiUser();

    if (!auth.ok) return auth.response;

    const body = await request.json()
        .catch(() => null);

    const parsed =
        tableDefinitionSchema.safeParse(body);

    if (!parsed.success) {
        return apiError(
            "VALIDATION_ERROR",
            "Invalid model definition.",
            422
        );
    }

    try {
        const result = await createModelTable(
            auth.user.id,
            parsed.data
        );

        return apiSuccess(result, 201);
    } catch (error) {
        return handleError(error);
    }
}
