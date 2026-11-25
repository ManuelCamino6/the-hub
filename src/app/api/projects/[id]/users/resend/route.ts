
import { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/auth";

import {
    apiSuccess,
    apiError,
    apiDatabaseError,
} from "@/lib/api/response";

import {
    deliverProjectInvitation,
} from "@/lib/projects/invitation-service";

const resendSchema = z.object({
    email: z.string()
        .trim()
        .toLowerCase()
        .pipe(z.email()),
}).strict();

type Context = {
    params: Promise<{ id: string }>;
};

export async function POST(
    request: NextRequest,
    { params }: Context
) {
    const auth = await requireApiUser();

    if (!auth.ok) return auth.response;

    const { id } = await params;

    if (!z.uuid().safeParse(id).success) {
        return apiError(
            "NOT_FOUND",
            "Project not found.",
            404
        );
    }

    const body = await request.json()
        .catch(() => null);

    const parsed = resendSchema.safeParse(body);

    if (!parsed.success) {
        return apiError(
            "VALIDATION_ERROR",
            "Invalid email.",
            422
        );
    }

    try {
        const result = await deliverProjectInvitation(
            id,
            parsed.data.email,
            true
        );

        if (result.status === "SKIPPED") {
            return apiError(
                "INVITATION_NOT_AVAILABLE",
                "Invitation unavailable or recently sent.",
                409
            );
        }

        if (result.status === "FAILED") {
            return apiError(
                "EMAIL_SEND_FAILED",
                "Email could not be sent.",
                502
            );
        }

        return apiSuccess(result);
    } catch (error) {
        return apiDatabaseError(error);
    }
}
