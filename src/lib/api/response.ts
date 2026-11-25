
import { NextResponse } from "next/server";

export function apiSuccess<T>(
  data: T,
  status = 200
) {
  return NextResponse.json(
    { data },
    { status }
  );
}

export function apiError(
  code: string,
  message: string,
  status: number,
  field?: string
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(field ? { field } : {}),
      },
    },
    { status }
  );
}

export function apiPaginated<T>(
  data: T[],
  nextCursor: string | null
) {
  return NextResponse.json({
    data,
    next_cursor: nextCursor,
  });
}
