
import { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/auth";

import {
    apiSuccess,
    apiError,
    apiDatabaseError,
} from "@/lib/api/response";

import {
    updateConnectorSchema,
} from "@/lib/connectors/schemas";

import {
    getConnector,
    updateConnector,
    deleteConnector,
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
        return apiSuccess(await getConnector(id));
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
    const parsed = updateConnectorSchema.safeParse(body);

    if (!parsed.success) {
        return apiError(
            "VALIDATION_ERROR",
            "Invalid connector definition.",
            422
        );
    }

    try {
        return apiSuccess(
            await updateConnector(id, parsed.data)
        );
    } catch (error) {
        return apiDatabaseError(error);
    }
}

export async function DELETE(
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
        return apiSuccess(await deleteConnector(id));
    } catch (error) {
        return apiDatabaseError(error);
    }
}