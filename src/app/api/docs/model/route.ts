import {
  apiSuccess,
  apiError,
  apiDatabaseError,
} from "@/lib/api/response";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  getPublishedModel,
} from "@/lib/docs/model-service";

export async function GET() {
  try {
    const model =
      await getPublishedModel();

    const response =
      apiSuccess(model);

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