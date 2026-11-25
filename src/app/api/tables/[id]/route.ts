
import { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/auth";
import { DomainError } from "@/lib/api/domain-error";

import {
    apiSuccess,
    apiError,
    apiDatabaseError,
} from "@/lib/api/response";

import {
    getModelTable,
} from "@/lib/protocol/admin-service";

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
        return apiError(
            "NOT_FOUND",
            "Model not found.",
            404
        );
    }

    try {
        return apiSuccess(
            await getModelTable(auth.user.id, id)
        );
    } catch (error) {
        if (error instanceof DomainError) {
            return apiError(
                error.code,
                error.message,
                error.status
            );
        }

        return apiDatabaseError(error);
    }
}
