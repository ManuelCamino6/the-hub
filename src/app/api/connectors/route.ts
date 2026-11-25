
import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api/auth";

import {
    apiSuccess,
    apiError,
    apiDatabaseError,
} from "@/lib/api/response";

import {
    createConnectorSchema,
} from "@/lib/connectors/schemas";

import {
    createConnector,
} from "@/lib/connectors/service";

import { listConnectorsSchema } from "@/lib/connectors/schemas";
import { listConnectors } from "@/lib/connectors/service";
import { apiPaginated } from "@/lib/api/response";
import { decodeCursor } from "@/lib/api/pagination";

export async function POST(request: NextRequest) {
    const auth = await requireApiUser();

    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => null);
    const parsed = createConnectorSchema.safeParse(body);

    if (!parsed.success) {
        return apiError(
            "VALIDATION_ERROR",
            "Invalid connector definition.",
            422
        );
    }

    try {
        const result = await createConnector(parsed.data);

        const response = apiSuccess(result, 201);

        response.headers.set(
            "Cache-Control",
            "no-store"
        );

        return response;
    } catch (error) {
        return apiDatabaseError(error);
    }
}


export async function GET(request: NextRequest) {
    const auth = await requireApiUser();

    if (!auth.ok) return auth.response;

    const parsed = listConnectorsSchema.safeParse(
        Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!parsed.success) {
        return apiError(
            "VALIDATION_ERROR",
            "Invalid query.",
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
        const result = await listConnectors(parsed.data);

        return apiPaginated(
            result.data,
            result.next_cursor
        );
    } catch (error) {
        return apiDatabaseError(error);
    }
}
