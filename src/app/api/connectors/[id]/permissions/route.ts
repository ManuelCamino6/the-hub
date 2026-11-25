
import { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/auth";

import {
    apiSuccess,
    apiError,
    apiDatabaseError,
} from "@/lib/api/response";

import {
    connectorDistributionSchema,
} from "@/lib/connectors/schemas";

import {
    getConnectorDistribution,
    updateConnectorDistribution,
} from "@/lib/connectors/service";

type Context = {
    params: Promise<{ id: string }>;
};

export async function GET(
    _request: NextRequest,
    { params }: Context
) {
    const auth = await requireApiUser();

    if (!auth.ok) return auth.response;

    const { id } = await params;

    if (!z.uuid().safeParse(id).success) {
        return apiError("NOT_FOUND", "Connector not found.", 404);
    }

    try {
        return apiSuccess(
            await getConnectorDistribution(id)
        );
    } catch (error) {
        return apiDatabaseError(error);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: Context
) {
    const auth = await requireApiUser();

    if (!auth.ok) return auth.response;

    const { id } = await params;

    if (!z.uuid().safeParse(id).success) {
        return apiError("NOT_FOUND", "Connector not found.", 404);
    }

    const body = await request.json().catch(() => null);

    const parsed =
        connectorDistributionSchema.safeParse(body);

    if (!parsed.success) {
        return apiError(
            "VALIDATION_ERROR",
            "Invalid distribution.",
            422
        );
    }

    try {
        return apiSuccess(
            await updateConnectorDistribution(
                id,
                parsed.data
            )
        );
    } catch (error) {
        return apiDatabaseError(error);
    }
}
