import { requireApiUser } from "@/lib/api/auth";

import { DomainError } from "@/lib/api/domain-error";

import {
  projectIdSchema,
} from "@/lib/projects/schemas";

import {
  rotateBiAccess,
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

export async function POST(
  request: Request,
  context: Context
) {
  try {
    requireHumanRequest(request);

    const auth = await requireApiUser();

    if (!auth.ok) {
      return auth.response;
    }

    requireBiMutationOrigin(request);

    const { id } = await context.params;

    const parsed =
      projectIdSchema.safeParse(id);

    if (!parsed.success) {
      throw new DomainError(
        "VALIDATION_ERROR",
        422
      );
    }

    return biSuccess(
      await rotateBiAccess(
        auth.user.id,
        parsed.data
      )
    );
  } catch (error) {
    return biError(error);
  }
}