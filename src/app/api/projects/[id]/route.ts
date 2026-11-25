
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

import {
    apiSuccess,
    apiError,
    apiDatabaseError,
} from "@/lib/api/response";

import {
    projectIdSchema,
    updateProjectSchema,
} from "@/lib/projects/schemas";

import {
    getProject,
    updateProject,
    deleteProject,
} from "@/lib/projects/service";

type Context = {
    params: Promise<{ id: string }>;
};

async function authorize(context: Context) {
    const supabase = await createClient();

    const { data: { user } } =
        await supabase.auth.getUser();

    if (!user) {
        return {
            error: apiError(
                "UNAUTHENTICATED",
                "Authentication required.",
                401
            ),
        };
    }

    const { id } = await context.params;

    if (!projectIdSchema.safeParse(id).success) {
        return {
            error: apiError(
                "NOT_FOUND",
                "Project not found.",
                404
            ),
        };
    }

    return { id };
}

export async function GET(
    _request: NextRequest,
    context: Context
) {
    const auth = await authorize(context);

    if (auth.error) return auth.error;

    try {
        const project = await getProject(auth.id!);

        if (!project) {
            return apiError(
                "NOT_FOUND",
                "Project not found.",
                404
            );
        }

        return apiSuccess(project);
    } catch (error) {
        return apiDatabaseError(error);
    }
}

export async function PUT(
    request: NextRequest,
    context: Context
) {
    const auth = await authorize(context);

    if (auth.error) return auth.error;

    const body = await request.json().catch(() => null);
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
        return apiError(
            "VALIDATION_ERROR",
            "Invalid project data.",
            422
        );
    }

    try {
        return apiSuccess(
            await updateProject(
                auth.id!,
                parsed.data.name
            )
        );
    } catch (error) {
        return apiDatabaseError(error);
    }
}

export async function DELETE(
    _request: NextRequest,
    context: Context
) {
    const auth = await authorize(context);

    if (auth.error) return auth.error;

    try {
        return apiSuccess(
            await deleteProject(auth.id!)
        );
    } catch (error) {
        return apiDatabaseError(error);
    }
}