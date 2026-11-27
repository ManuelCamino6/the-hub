import {
    buildOpenApi,
} from "@/lib/docs/openapi";

export function GET() {
    return new Response(
        JSON.stringify(buildOpenApi(), null, 2),
        {
            headers: {
                "Content-Type":
                    "application/yaml; charset=utf-8",

                "Content-Disposition":
                    'inline; filename="openapi.yaml"',

                "Cache-Control": "no-store",
            },
        }
    );
}