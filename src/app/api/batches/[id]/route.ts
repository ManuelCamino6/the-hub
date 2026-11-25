
import { NextRequest } from "next/server";

import {
    apiSuccess,
    apiError,
} from "@/lib/api/response";

import {
    getConnectorTokenHash,
} from "@/lib/connectors/auth";

import {
    batchIdSchema,
} from "@/lib/protocol/batches/schemas";

import {
    getBatch,
} from "@/lib/protocol/batches/service";

import {
    protocolApiError,
} from "@/lib/protocol/errors";

type Context = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(
    request: NextRequest,
    { params }: Context
) {
    try {
        const tokenHash =
            getConnectorTokenHash(request);

        const { id } = await params;

        if (!batchIdSchema.safeParse(id).success) {
            return apiError(
                "BATCH_NOT_FOUND",
                "Batch not found.",
                404
            );
        }

        const result = await getBatch(
            tokenHash,
            id
        );

        const response = apiSuccess(result);

        response.headers.set(
            "Cache-Control",
            "no-store"
        );

        return response;
    } catch (error) {
        return protocolApiError(error);
    }
}
