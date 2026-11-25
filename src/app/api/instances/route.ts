
import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api/auth";
import {
  apiSuccess,
  apiError,
  apiDatabaseError,
} from "@/lib/api/response";

import { DomainError } from "@/lib/api/domain-error";
import { createInstanceSchema } from "@/lib/instances/schemas";
import { createInstance } from "@/lib/instances/service";

import { listInstancesSchema } from "@/lib/instances/schemas";
import { listInstances } from "@/lib/instances/service";
import { apiPaginated } from "@/lib/api/response";
import { decodeCursor } from "@/lib/api/pagination";


import {
  hasConnectorAuthorization,
  getConnectorTokenHash,
} from "@/lib/connectors/auth";

import {
  listConnectorInstances,
} from "@/lib/instances/connector-service";

import {
  listDevelopmentInstallations,
} from "@/lib/instances/development-service";

import {
  listInstallationsSchema,
  listConnectorInstancesSchema,
} from "@/lib/instances/schemas";


export async function POST(request: NextRequest) {

  if (request.headers.has("authorization")) {
    return apiError(
      "HUMAN_SESSION_REQUIRED",
      "This operation requires a user session.",
      401
    );
  }
  
  const auth = await requireApiUser();

  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createInstanceSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid instance definition.",
      422
    );
  }

  try {
    const result = await createInstance(
      auth.user.id,
      parsed.data
    );

    const response = apiSuccess(result, 201);

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



export async function GET(request: NextRequest) {
  const query = Object.fromEntries(
    request.nextUrl.searchParams
  );

  try {
    if (hasConnectorAuthorization(request)) {
      const tokenHash =
        getConnectorTokenHash(request);

      const parsed =
        listConnectorInstancesSchema.safeParse(query);

      if (!parsed.success) {
        return apiError(
          "VALIDATION_ERROR",
          "Invalid filters.",
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

      const result =
        await listConnectorInstances(
          tokenHash,
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
    }

    const auth = await requireApiUser();

    if (!auth.ok) return auth.response;

    if (query.connector_id && query.project_id) {
      return apiError(
        "VALIDATION_ERROR",
        "Use only one project or connector filter.",
        422
      );
    }

    if (query.connector_id) {
      const parsed =
        listInstallationsSchema.safeParse(query);

      if (!parsed.success) {
        return apiError(
          "VALIDATION_ERROR",
          "Invalid filters.",
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

      const result =
        await listDevelopmentInstallations(
          auth.user.id,
          parsed.data
        );

      return apiPaginated(
        result.data,
        result.next_cursor
      );
    }

    const parsed =
      listInstancesSchema.safeParse(query);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid filters.",
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

    const result = await listInstances(
      auth.user.id,
      parsed.data
    );

    return apiPaginated(
      result.data,
      result.next_cursor
    );
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




