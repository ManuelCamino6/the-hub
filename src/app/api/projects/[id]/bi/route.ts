import { requireApiUser } from "@/lib/api/auth";

import { DomainError } from "@/lib/api/domain-error";

import {
  projectIdSchema,
} from "@/lib/projects/schemas";

import {
  getBiAccess,
  enableBiAccess,
  disableBiAccess,
} from "@/lib/bi/service";

import {
  biSuccess,
  biError,
} from "@/lib/bi/response";

import {
  requireHumanRequest,
  requireBiMutationOrigin,
} from "@/lib/bi/request";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

async function handle(
  request: Request,
  context: Context,
  operation: "GET" | "POST" | "DELETE"
) {
  try {
    requireHumanRequest(request);

    const auth = await requireApiUser();

    if (!auth.ok) {
      return auth.response;
    }

    if (operation !== "GET") {
      requireBiMutationOrigin(request);
    }

    const { id } = await context.params;

    const parsed =
      projectIdSchema.safeParse(id);

    if (!parsed.success) {
      throw new DomainError(
        "VALIDATION_ERROR",
        422
      );
    }

    const projectId = parsed.data;
    const userId = auth.user.id;

    if (operation === "GET") {
      return biSuccess(
        await getBiAccess(
          userId,
          projectId
        )
      );
    }

    if (operation === "POST") {
      return biSuccess(
        await enableBiAccess(
          userId,
          projectId
        ),
        201
      );
    }

    return biSuccess(
      await disableBiAccess(
        userId,
        projectId
      )
    );
  } catch (error) {
    return biError(error);
  }
}

export function GET(
  request: Request,
  context: Context
) {
  return handle(
    request,
    context,
    "GET"
  );
}

export function POST(
  request: Request,
  context: Context
) {
  return handle(
    request,
    context,
    "POST"
  );
}

export function DELETE(
  request: Request,
  context: Context
) {
  return handle(
    request,
    context,
    "DELETE"
  );
}