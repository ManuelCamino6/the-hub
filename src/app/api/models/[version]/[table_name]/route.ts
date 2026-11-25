
import { NextRequest } from "next/server";

import {
  apiSuccess,
} from "@/lib/api/response";

import {
  createRecordsSchema,
  updateRecordsSchema,
  deleteRecordsSchema,
  type WriteOperation,
} from "@/lib/protocol/models/write-schemas";

import {
  registerModelChanges,
} from "@/lib/protocol/models/write-service";

import {
    apiError,
    apiPaginated,
} from "@/lib/api/response";

import {
    getConnectorTokenHash,
} from "@/lib/connectors/auth";

import {
    modelPathSchema,
    listRecordsSchema,
} from "@/lib/protocol/models/schemas";

import {
    listRecords,
} from "@/lib/protocol/models/service";

import {
    protocolApiError,
} from "@/lib/protocol/errors";

type Context = {
    params: Promise<{
        version: string;
        table_name: string;
    }>;
};

export async function GET(
    request: NextRequest,
    { params }: Context
) {
    try {
        const tokenHash =
            getConnectorTokenHash(request);

        const path = modelPathSchema.safeParse(
            await params
        );

        if (!path.success) {
            return apiError(
                "MODEL_NOT_FOUND",
                "Model not found.",
                404
            );
        }

        const query = listRecordsSchema.safeParse(
            Object.fromEntries(
                request.nextUrl.searchParams
            )
        );

        if (!query.success) {
            return apiError(
                "VALIDATION_ERROR",
                "Invalid query parameters.",
                422
            );
        }

        const result = await listRecords(
            tokenHash,
            path.data.version,
            path.data.table_name,
            query.data
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
        return protocolApiError(error);
    }
}


const schemaByOperation = {
  CREATE: createRecordsSchema,
  UPDATE: updateRecordsSchema,
  DELETE: deleteRecordsSchema,
};

async function handleWrite(
  request: NextRequest,
  { params }: Context,
  operation: WriteOperation
) {
  try {
    const tokenHash =
      getConnectorTokenHash(request);

    const path = modelPathSchema.safeParse(
      await params
    );

    if (!path.success) {
      return apiError(
        "MODEL_NOT_FOUND",
        "Model not found.",
        404
      );
    }

    const body = await request.json()
      .catch(() => null);

    const parsed =
      schemaByOperation[operation]
        .safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid model operation.",
        422
      );
    }

    const result = await registerModelChanges(
      tokenHash,
      path.data.version,
      path.data.table_name,
      operation,
      parsed.data
    );

    const response = apiSuccess(
      result,
      operation === "CREATE" ? 201 : 200
    );

    response.headers.set(
      "Cache-Control",
      "no-store"
    );

    return response;
  } catch (error) {
    return protocolApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: Context
) {
  return handleWrite(
    request,
    context,
    "CREATE"
  );
}

export async function PUT(
  request: NextRequest,
  context: Context
) {
  return handleWrite(
    request,
    context,
    "UPDATE"
  );
}

export async function DELETE(
  request: NextRequest,
  context: Context
) {
  return handleWrite(
    request,
    context,
    "DELETE"
  );
}