import {
  buildOpenApi,
} from "@/lib/docs/openapi";

export function GET() {
  return Response.json(
    buildOpenApi(),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}