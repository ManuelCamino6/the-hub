
import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
    projectCursorSchema,
    type CreateProjectInput,
    type ListProjectsInput,
    type Project,
} from "./schemas";

export async function createProject(
    input: CreateProjectInput
) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "create_project",
        {
            p_name: input.name,
            p_type: input.type,
        }
    );

    if (error) {
        throw error;
    }

    return { id: data as string };
}

export async function listProjects(
    input: ListProjectsInput
) {
    const supabase = await createClient();

    const cursor = input.cursor
        ? projectCursorSchema.parse(
            JSON.parse(
                Buffer.from(
                    input.cursor,
                    "base64url"
                ).toString("utf8")
            )
        )
        : null;

    const { data, error } = await supabase.rpc(
        "list_projects",
        {
            p_name: input.name ?? null,
            p_type: input.type ?? null,
            p_limit: input.limit + 1,
            p_cursor_created_at:
                cursor?.created_at ?? null,
            p_cursor_id: cursor?.id ?? null,
        }
    );

    if (error) {
        throw error;
    }

    const rows = (data ?? []) as Project[];
    const projects = rows.slice(0, input.limit);
    const last = projects.at(-1);

    const nextCursor =
        rows.length > input.limit && last
            ? Buffer.from(
                JSON.stringify({
                    created_at: last.created_at,
                    id: last.id,
                })
            ).toString("base64url")
            : null;

    return {
        data: projects,
        next_cursor: nextCursor,
    };
}


export async function getProject(id: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .rpc("get_project", {
            p_project_id: id,
        })
        .maybeSingle();

    if (error) throw error;

    return data as Project | null;
}

export async function updateProject(
    id: string,
    name: string
) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "update_project",
        {
            p_project_id: id,
            p_name: name,
        }
    );

    if (error) throw error;

    return { id: data as string };
}

export async function deleteProject(id: string) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "delete_project",
        {
            p_project_id: id,
        }
    );

    if (error) throw error;

    return { id: data as string };
}
