
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  apiPaginated,
} from "@/lib/api/response";
import {
  createProjectSchema,
  listProjectsSchema,
  projectCursorSchema,
} from "@/lib/projects/schemas";
import {
  createProject,
  listProjects,
} from "@/lib/projects/service";

export async function GET(request: NextRequest) {
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

  const parsed = listProjectsSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid query parameters.",
      422
    );
  }

  if (parsed.data.cursor) {
    try {
      projectCursorSchema.parse(
        JSON.parse(
          Buffer.from(
            parsed.data.cursor,
            "base64url"
          ).toString("utf8")
        )
      );
    } catch {
      return apiError(
        "INVALID_CURSOR",
        "Invalid pagination cursor.",
        422,
        "cursor"
      );
    }
  }

  try {
    const result = await listProjects(parsed.data);

    return apiPaginated(
      result.data,
      result.next_cursor
    );
  } catch {
    return apiError(
      "INTERNAL_ERROR",
      "Unable to list projects.",
      500
    );
  }
}

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid project data.",
      422,
      String(parsed.error.issues[0]?.path[0] ?? "")
    );
  }

  try {
    const result = await createProject(parsed.data);

    return apiSuccess(result, 201);
  } catch {
    return apiError(
      "INTERNAL_ERROR",
      "Unable to create project.",
      500
    );
  }
}
