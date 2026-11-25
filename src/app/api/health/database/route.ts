
import { getDatabase } from "@/lib/db";
import { requireApiUser } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireApiUser();

  if (!auth.ok) return auth.response;

  try {
    const sql = getDatabase();

    await sql`select 1`;

    return Response.json({
      data: { connected: true },
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Database unavailable.",
        },
      },
      { status: 503 }
    );
  }
}
