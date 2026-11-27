import { z } from "zod";

const uuid = z.uuid();
const timestamp = z.string();
const count = z.number().int().nonnegative();

export function successSchema<T extends z.ZodType>(
    data: T
) {
    return z.object({ data });
}

export function paginatedSchema<T extends z.ZodType>(
    item: T
) {
    return z.object({
        data: z.array(item),
        next_cursor: z.string().nullable(),
    });
}

export const errorResponseSchema = z.object({
    error: z.object({
        code: z.string(),
        message: z.string(),
        field: z.string().optional(),
    }),
});

export const batchStatusSchema = z.enum([
    "OPEN",
    "COMMITTED",
    "FAILED",
    "DISCARDED",
    "EXPIRED",
]);

export const beginResponseSchema = successSchema(
    z.object({
        id: uuid,
        status: z.literal("OPEN"),
        expires_at: timestamp,
    })
);

export const batchResponseSchema = successSchema(
    z.object({
        id: uuid,
        instance_id: uuid,
        type: z.enum([
            "TRANSACTION",
            "SETUP",
            "SETTING",
        ]),
        status: batchStatusSchema,
        created_at: timestamp,
        closed_at: timestamp.nullable(),
    })
);

export const commitResponseSchema = successSchema(
    z.object({
        id: uuid,
        status: z.literal("COMMITTED"),
        changes_applied: count,
        propagations_created: count,
    })
);

export const rollbackResponseSchema = successSchema(
    z.object({
        id: uuid,
        status: z.literal("DISCARDED"),
    })
);

export const setupResponseSchema = successSchema(
    z.object({
        batch_id: uuid,
        models: z.array(z.string()),
        changes_created: count,
        propagations_created: count,
    })
);

export const registeredChangesResponseSchema =
    successSchema(
        z.array(
            z.object({
                id: uuid,
                ref_id: z.string().nullable(),
                change_id: uuid,
            })
        )
    );

export const modelRecordSchema = z.object({
    id: uuid,
    ref_id: z.string().nullable().optional(),
    global_ref: z.string().nullable().optional(),
}).catchall(z.unknown());

export const modelRecordsResponseSchema =
    paginatedSchema(modelRecordSchema);

export const propagationStatusSchema = z.enum([
    "PENDING",
    "FAILED",
    "OK",
    "EXPIRED",
]);

export const changeTypeSchema = z.enum([
    "CREATE",
    "UPDATE",
    "DELETE",
    "SETTING",
]);

export const propagationSchema = z.object({
    id: uuid,
    instance_id: uuid,
    change_id: uuid,
    batch_id: uuid,
    table_name: z.string().nullable(),
    record_id: uuid.nullable(),
    type: changeTypeSchema,
    status: propagationStatusSchema,
    created_at: timestamp,
});

export const propagationsResponseSchema =
    paginatedSchema(propagationSchema);

export const propagationDetailResponseSchema =
    successSchema(
        propagationSchema
            .omit({ created_at: true })
            .extend({
                origin_instance_id: uuid.nullable(),
                payload: z.record(
                    z.string(),
                    z.unknown()
                ),
                global_ref: z.string().nullable(),
                refs: z.object({
                    origin: z.string().nullable(),
                    destination: z.string().nullable(),
                }),
            })
    );

export const confirmationResponseSchema =
    successSchema(
        z.object({
            updated: z.array(
                z.object({
                    id: uuid,
                    status: z.enum(["OK", "FAILED"]),
                })
            ),
        })
    );

export const connectorInstallationSchema = z.object({
    id: uuid,
    project_id: uuid,
    connector_id: uuid,

    name: z.string(),
    connector_name: z.string(),

    status: z.enum([
        "OK",
        "INCOMPLETE",
        "UNAUTHORIZED",
    ]),

    operation_status: z.enum([
        "ACTIVE",
        "PAUSED",
    ]),

    paused_reason: z.string().nullable(),

    created_at: timestamp,
});

export const installationsResponseSchema =
    paginatedSchema(connectorInstallationSchema);

const connectorParameterBaseSchema = z.object({
    key: z.string(),

    type: z.enum([
        "TEXT",
        "NUMBER",
        "DATE",
        "BOOLEAN",
    ]),

    required: z.boolean(),
});

export const connectorParameterResponseSchema =
    z.union([
        connectorParameterBaseSchema.extend({
            encrypted: z.boolean(),
            value: z.string().nullable(),
        }),

        connectorParameterBaseSchema.extend({
            encrypted: z.literal(true),
            configured: z.boolean(),
        }),
    ]);

const permissionOriginsSchema =
    z.array(uuid).nullable();

export const effectivePermissionResponseSchema =
    z.object({
        table_id: uuid,
        table_name: z.string(),
        can_list: z.boolean(),

        can_send_post: z.boolean(),
        can_receive_post: z.boolean(),
        can_receive_post_from: permissionOriginsSchema,

        can_send_update: z.boolean(),
        can_receive_update: z.boolean(),
        can_receive_update_from: permissionOriginsSchema,

        can_send_delete: z.boolean(),
        can_receive_delete: z.boolean(),
        can_receive_delete_from: permissionOriginsSchema,
    });

export const connectorInstanceResponseSchema =
    successSchema(
        connectorInstallationSchema.extend({
            parameters: z.array(
                connectorParameterResponseSchema
            ),

            models_permissions: z.array(
                effectivePermissionResponseSchema
            ),
        })
    );