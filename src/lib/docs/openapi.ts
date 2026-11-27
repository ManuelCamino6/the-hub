import { z } from "zod";

import {
    beginBatchSchema,
} from "@/lib/protocol/batches/schemas";

import {
    setupSchema,
} from "@/lib/protocol/setup/schemas";

import {
    listRecordsSchema,
} from "@/lib/protocol/models/schemas";

import {
    createRecordsSchema,
    updateRecordsSchema,
    deleteRecordsSchema,
} from "@/lib/protocol/models/write-schemas";

import {
    listChangesSchema,
    confirmChangesSchema,
} from "@/lib/protocol/propagations/schemas";

import {
    publishedModelSchema,
} from "./schemas";

import {
    errorResponseSchema,
    beginResponseSchema,
    batchResponseSchema,
    commitResponseSchema,
    rollbackResponseSchema,
    setupResponseSchema,
    registeredChangesResponseSchema,
    modelRecordsResponseSchema,
    propagationsResponseSchema,
    propagationDetailResponseSchema,
    confirmationResponseSchema,
    installationsResponseSchema,
    successSchema,
    connectorInstanceResponseSchema,
} from "./response-schemas";

function jsonSchema(
    schema: z.ZodType,
    io: "input" | "output" = "input"
) {
    return z.toJSONSchema(schema, {
        target: "draft-2020-12",
        io,
    });
}

function content(
    schema: z.ZodType,
    io: "input" | "output" = "input",
    example?: unknown
) {
    return {
        "application/json": {
            schema: jsonSchema(schema, io),

            ...(example !== undefined
                ? { example }
                : {}),
        },
    };
}

function pathParameter(
    name: string,
    schema: z.ZodType = z.uuid()
) {
    return {
        name,
        in: "path",
        required: true,
        schema: jsonSchema(schema),
    };
}

function queryParameters(schema: z.ZodType) {
    const definition = jsonSchema(schema);

    const properties =
        definition.properties ?? {};

    const required = new Set(
        definition.required ?? []
    );

    return Object.entries(properties).map(
        ([name, schema]) => ({
            name,
            in: "query",
            required: required.has(name),
            schema,
        })
    );
}

type OperationInput = {
    operationId: string;
    summary: string;
    description: string;
    tag: string;
    parameters?: object[];
    body?: z.ZodType;
    response: z.ZodType;
    status?: number;
    public?: boolean;
    errors?: number[];
    requestExample?: unknown;
    responseExample?: unknown;
};

const errorDescriptions: Record<number, string> = {
    400: "Invalid request",
    401: "Authentication required",
    403: "Operation not permitted",
    404: "Resource not found",
    409: "Conflict or invalid operational state",
    422: "Validation failed",
    500: "Internal server error",
    503: "Published model unavailable",
};

function operation(input: OperationInput) {
    const responses: Record<string, object> = {
        [input.status ?? 200]: {
            description: "Successful response",
            content: content(
                input.response,
                "output",
                input.responseExample
            ),
        },
    };

    for (
        const status of input.errors ??
        [401, 403, 404, 409, 422, 500]
    ) {
        responses[String(status)] = {
            description: errorDescriptions[status],
            content: content(errorResponseSchema, "output"),
        };
    }

    return {
        operationId: input.operationId,
        summary: input.summary,
        description: input.description,
        tags: [input.tag],

        security: input.public
            ? []
            : [{ connectorBearer: [] }],

        ...(input.parameters?.length
            ? { parameters: input.parameters }
            : {}),

        ...(input.body
            ? {
                requestBody: {
                    required: true,

                    content: content(
                        input.body,
                        "input",
                        input.requestExample
                    ),
                },
            }
            : {}),

        responses,
    };
}

const batchId = pathParameter("batch_id");
const instanceId = pathParameter("instance_id");

const modelParameters = [
    pathParameter(
        "version",
        z.number().int().positive()
    ),

    pathParameter(
        "table_name",
        z.string().regex(/^[a-z][a-z0-9_]*$/)
    ),
];

const exampleIds = {
    instance: "10000000-0000-4000-8000-000000000001",
    batch: "20000000-0000-4000-8000-000000000001",
    record: "30000000-0000-4000-8000-000000000001",
    propagation: "40000000-0000-4000-8000-000000000001",
} as const;

export function buildOpenApi() {
    return {
        openapi: "3.1.0",

        info: {
            title: "The Hub Connector API",
            version: "1.0.0",
            description:
                "Transactional synchronization protocol for external connectors.",
        },

        servers: [{ url: "/" }],

        tags: [
            { name: "Documentation" },
            { name: "Installations" },
            { name: "Batches" },
            { name: "Models" },
            { name: "Propagations" },
        ],

        components: {
            securitySchemes: {
                connectorBearer: {
                    type: "http",
                    scheme: "bearer",
                    description:
                        "Connector token issued by The Hub.",
                },
            },
        },

        paths: {
            "/api/instances/{instance_id}": {
                get: operation({
                    operationId: "getInstallation",
                    summary: "Retrieve installation configuration",
                    description:
                        "Returns installation metadata, parameters and effective model permissions. Encrypted parameter values are only available when the installation is operational and authorized.",
                    tag: "Installations",
                    parameters: [instanceId],
                    response: connectorInstanceResponseSchema,
                    errors: [401, 403, 404, 422, 500],
                }),
            },
            "/api/docs/model": {
                get: operation({
                    operationId: "getPublishedModel",
                    summary: "Retrieve published data model",
                    description:
                        "Returns the active protocol version and its published tables, columns and constraints.",
                    tag: "Documentation",
                    public: true,
                    response: successSchema(publishedModelSchema),
                    errors: [500, 503],
                }),
            },
            "/api/instances": {
                get: operation({
                    operationId: "listInstallations",
                    summary: "List connector installations",
                    description:
                        "Returns installations owned by the authenticated connector.",
                    tag: "Installations",
                    response: installationsResponseSchema,
                    parameters: queryParameters(
                        z.object({
                            limit: z.number()
                                .int()
                                .min(1)
                                .max(200)
                                .optional(),

                            cursor: z.string().optional(),
                            status: z.enum([
                                "OK",
                                "INCOMPLETE",
                                "UNAUTHORIZED",
                            ]).optional(),
                        })
                    ),
                }),
            },

            "/api/instances/{instance_id}/setup": {
                post: operation({
                    operationId: "setupInstallation",
                    summary: "Create initial snapshot",
                    description:
                        "Expires previous pending deliveries for selected models and creates a consistent snapshot.",
                    tag: "Installations",
                    parameters: [instanceId],
                    body: setupSchema,
                    response: setupResponseSchema,
                    requestExample: {},
                }),
            },

            "/api/batches/begin": {
                post: operation({
                    operationId: "beginBatch",
                    summary: "Begin transaction",
                    description:
                        "Creates an OPEN batch with a lifetime of 10 minutes.",
                    tag: "Batches",
                    body: beginBatchSchema,
                    response: beginResponseSchema,
                    status: 201,
                    requestExample: {
                        instance_id: exampleIds.instance,
                    },
                }),
            },

            "/api/batches/{batch_id}": {
                get: operation({
                    operationId: "getBatch",
                    summary: "Retrieve batch status",
                    description:
                        "Use this operation to recover the result of an uncertain commit.",
                    tag: "Batches",
                    parameters: [batchId],
                    response: batchResponseSchema,
                }),
            },

            "/api/batches/{batch_id}/commit": {
                post: operation({
                    operationId: "commitBatch",
                    summary: "Commit transaction",
                    description:
                        "Applies all registered changes atomically and generates authorized propagations.",
                    tag: "Batches",
                    parameters: [batchId],
                    response: commitResponseSchema,
                }),
            },

            "/api/batches/{batch_id}/rollback": {
                post: operation({
                    operationId: "rollbackBatch",
                    summary: "Discard transaction",
                    description:
                        "Discards an OPEN batch without applying its changes.",
                    tag: "Batches",
                    parameters: [batchId],
                    response: rollbackResponseSchema,
                }),
            },

            "/api/models/{version}/{table_name}": {
                get: operation({
                    operationId: "listRecords",
                    summary: "List model records",
                    description:
                        "Returns active records within the authorized installation's Business.",
                    tag: "Models",
                    parameters: [
                        ...modelParameters,
                        ...queryParameters(listRecordsSchema),
                    ],
                    response: modelRecordsResponseSchema,
                }),
                post: operation({
                    operationId: "registerCreate",
                    summary: "Register record creation",
                    description:
                        "Registers CREATE changes in an OPEN batch. Records are not inserted until COMMIT.",
                    tag: "Models",
                    parameters: modelParameters,
                    body: createRecordsSchema,
                    response: registeredChangesResponseSchema,
                    status: 201,
                    requestExample: {
                        batch_id: exampleIds.batch,
                        payload: [
                            {
                                ref_id: "external-001",
                                client_operation_id: "create-001",
                                name: "Example",
                            },
                        ],
                    },
                }),

                put: operation({
                    operationId: "registerUpdate",
                    summary: "Register record update",
                    description:
                        "Registers partial UPDATE changes. Omitted fields are preserved.",
                    tag: "Models",
                    parameters: modelParameters,
                    body: updateRecordsSchema,
                    response: registeredChangesResponseSchema,
                    requestExample: {
                        batch_id: exampleIds.batch,
                        payload: [
                            {
                                id: exampleIds.record,
                                client_operation_id: "update-001",
                                name: "Updated example",
                            },
                        ],
                    },
                }),

                delete: operation({
                    operationId: "registerDelete",
                    summary: "Register record deletion",
                    description:
                        "Registers logical DELETE changes. Deletion takes effect only after COMMIT.",
                    tag: "Models",
                    parameters: modelParameters,
                    body: deleteRecordsSchema,
                    response: registeredChangesResponseSchema,
                    requestExample: {
                        batch_id: exampleIds.batch,
                        payload: [
                            {
                                id: exampleIds.record,
                                client_operation_id: "delete-001",
                            },
                        ],
                    },
                }),
            },

            "/api/changes": {
                get: operation({
                    operationId: "listPropagations",
                    summary: "Pull propagations",
                    description:
                        "Returns authorized deliveries. PENDING is the default status.",
                    tag: "Propagations",
                    parameters:
                        queryParameters(listChangesSchema),
                    response: propagationsResponseSchema,
                }),

                post: operation({
                    operationId: "confirmPropagations",
                    summary: "Confirm propagations",
                    description:
                        "Atomically confirms deliveries as OK or FAILED. CREATE confirmations may register a destination reference.",
                    tag: "Propagations",
                    body: confirmChangesSchema,
                    response: confirmationResponseSchema,
                    requestExample: {
                        confirmations: [
                            {
                                id: exampleIds.propagation,
                                status: "OK",
                            },
                        ],
                    },
                }),
            },

            "/api/changes/{propagation_id}": {
                get: operation({
                    operationId: "getPropagation",
                    summary: "Retrieve propagation detail",
                    description:
                        "Returns the authorized payload and record references.",
                    tag: "Propagations",
                    parameters: [
                        pathParameter("propagation_id"),
                    ],
                    response:
                        propagationDetailResponseSchema,
                }),
            },
        },
    };
}