import {
  requireApiUser,
} from "@/lib/api/auth";

import {
  apiError,
  apiPaginated,
  apiDatabaseError,
} from "@/lib/api/response";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  listNewsSchema,
} from "@/lib/news/schemas";

import {
  listNews,
} from "@/lib/news/service";

export async function GET(
  request: Request
) {
  if (
    request.headers.has("authorization")
  ) {
    return apiError(
      "UNAUTHORIZED",
      "Human session required.",
      401
    );
  }

  const auth = await requireApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);

  const parsed = listNewsSchema.safeParse(
    Object.fromEntries(url.searchParams)
  );

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid news query.",
      422
    );
  }

  try {
    const result = await listNews(
      auth.user.id,
      parsed.data
    );

    const response = apiPaginated(
      result.data,
      result.next_cursor
    );

    response.headers.set(
      "Cache-Control",
      "no-store"
    );

    return response;

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