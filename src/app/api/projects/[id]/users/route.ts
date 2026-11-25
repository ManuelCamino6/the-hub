
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

import {
  apiSuccess,
  apiError,
  apiDatabaseError,
  apiPaginated,
} from "@/lib/api/response";

import { decodeCursor } from "@/lib/api/pagination";
import { projectIdSchema } from "@/lib/projects/schemas";

import {
  listMembersSchema,
  upsertMembersSchema,
  removeMembersSchema,
} from "@/lib/projects/member-schemas";

import {
  listMembers,
  upsertMembers,
  removeMembers,
} from "@/lib/projects/member-service";

type Context = {
  params: Promise<{ id: string }>;
};

async function handle(
  request: NextRequest,
  context: Context
) {
  const supabase = await createClient();

  const { data: { user } } =
    await supabase.auth.getUser();

  if (!user) {
    return apiError(
      "UNAUTHENTICATED",
      "Authentication required.",
      401
    );
  }

  const { id } = await context.params;

  if (!projectIdSchema.safeParse(id).success) {
    return apiError(
      "NOT_FOUND",
      "Project not found.",
      404
    );
  }

  try {
    if (request.method === "GET") {
      const parsed = listMembersSchema.safeParse(
        Object.fromEntries(request.nextUrl.searchParams)
      );

      if (!parsed.success) {
        return apiError(
          "VALIDATION_ERROR",
          "Invalid query.",
          422
        );
      }

      try {
        decodeCursor(parsed.data.cursor);
      } catch {
        return apiError(
          "INVALID_CURSOR",
          "Invalid cursor.",
          422
        );
      }

      const result = await listMembers(id, parsed.data);

      return apiPaginated(
        result.data,
        result.next_cursor
      );
    }

    const body = await request.json().catch(() => null);

    if (request.method === "POST") {
      const parsed = upsertMembersSchema.safeParse(body);

      if (!parsed.success) {
        return apiError(
          "VALIDATION_ERROR",
          "Invalid members.",
          422
        );
      }

      return apiSuccess(
        await upsertMembers(id, parsed.data)
      );
    }

    const parsed = removeMembersSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid members.",
        422
      );
    }

    return apiSuccess(
      await removeMembers(id, parsed.data)
    );
  } catch (error) {
    return apiDatabaseError(error);
  }
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;