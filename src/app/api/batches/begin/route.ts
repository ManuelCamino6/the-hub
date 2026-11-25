
import { NextRequest } from "next/server";

import {
    apiSuccess,
    apiError,
} from "@/lib/api/response";

import {
    getConnectorTokenHash,
} from "@/lib/connectors/auth";

import {
    beginBatchSchema,
} from "@/lib/protocol/batches/schemas";

import {
    beginBatch,
} from "@/lib/protocol/batches/service";

import {
    protocolApiError,
} from "@/lib/protocol/errors";

export async function POST(
    request: NextRequest
) {
    try {
        const tokenHash =
            getConnectorTokenHash(request);

        const body = await request.json()
            .catch(() => null);

        const parsed =
            beginBatchSchema.safeParse(body);

        if (!parsed.success) {
            return apiError(
                "VALIDATION_ERROR",
                "Invalid instance_id.",
                422
            );
        }

        const result = await beginBatch(
            tokenHash,
            parsed.data.instance_id
        );

        const response = apiSuccess(
            result,
            201
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
