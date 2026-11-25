
import { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/api/auth";
import { decodeCursor } from "@/lib/api/pagination";

import {
  apiError,
  apiDatabaseError,
  apiPaginated,
} from "@/lib/api/response";

import {
  listProtocolTables,
} from "@/lib/protocol/service";

const querySchema = z.object({
  project_id: z.uuid(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().max(512).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireApiUser();

  if (!auth.ok) return auth.response;

  const parsed = querySchema.safeParse(
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

  try {
    const result = await listProtocolTables(
      parsed.data.project_id,
      parsed.data.limit,
      parsed.data.cursor
    );

    return apiPaginated(
      result.data,
      result.next_cursor
    );
  } catch (error) {
    return apiDatabaseError(error);
  }
}
