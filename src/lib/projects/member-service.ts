
import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
    decodeCursor,
    paginate,
} from "@/lib/api/pagination";

import type {
    ListMembersInput,
    UpsertMembersInput,
    RemoveMembersInput,
    ProjectMember,
} from "./member-schemas";

export async function listMembers(
    projectId: string,
    input: ListMembersInput
) {
    const supabase = await createClient();
    const cursor = decodeCursor(input.cursor);

    const { data, error } = await supabase.rpc(
        "list_project_members",
        {
            p_project_id: projectId,
            p_limit: input.limit + 1,
            p_cursor_created_at: cursor?.created_at ?? null,
            p_cursor_id: cursor?.id ?? null,
        }
    );

    if (error) throw error;

    return paginate(
        (data ?? []) as ProjectMember[],
        input.limit
    );
}

export async function upsertMembers(
    projectId: string,
    input: UpsertMembersInput
) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "upsert_project_members",
        {
            p_project_id: projectId,
            p_users: input.users,
        }
    );

    if (error) throw error;

    return data as {
        added: string[];
        invited: string[];
    };
}

export async function removeMembers(
    projectId: string,
    input: RemoveMembersInput
) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "remove_project_members",
        {
            p_project_id: projectId,
            p_users: input.users,
        }
    );

    if (error) throw error;

    return data as {
        removed: string[];
    };
}
