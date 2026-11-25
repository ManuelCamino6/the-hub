
import { NextRequest } from "next/server";

import {
    apiError,
    apiPaginated,
} from "@/lib/api/response";

import {
    getConnectorTokenHash,
} from "@/lib/connectors/auth";

import {
    modelPathSchema,
    listRecordsSchema,
} from "@/lib/protocol/models/schemas";

import {
    listRecords,
} from "@/lib/protocol/models/service";

import {
    protocolApiError,
} from "@/lib/protocol/errors";

type Context = {
    params: Promise<{
        version: string;
        table_name: string;
    }>;
};

export async function GET(
    request: NextRequest,
    { params }: Context
) {
    try {
        const tokenHash =
            getConnectorTokenHash(request);

        const path = modelPathSchema.safeParse(
            await params
        );

        if (!path.success) {
            return apiError(
                "MODEL_NOT_FOUND",
                "Model not found.",
                404
            );
        }

        const query = listRecordsSchema.safeParse(
            Object.fromEntries(
                request.nextUrl.searchParams
            )
        );

        if (!query.success) {
            return apiError(
                "VALIDATION_ERROR",
                "Invalid query parameters.",
                422
            );
        }

        const result = await listRecords(
            tokenHash,
            path.data.version,
            path.data.table_name,
            query.data
        );

        const response = apiPaginated(
            result.data,
            result.next_cursor
        );

        response.headers.set(
            "Cache-Control",
            "no-store"
        );

        return response;
    } catch (error) {
        return protocolApiError(error);
    }
}
