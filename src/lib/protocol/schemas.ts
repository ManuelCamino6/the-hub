
import { z } from "zod";

export const columnTypes = [
    "FLOAT",
    "INT",
    "VARCHAR",
    "TIMESTAMPTZ",
    "BOOLEAN",
    "TEXT",
    "UUID",
] as const;

export const columnTypeSchema =
    z.enum(columnTypes);

const reservedColumns = [
    "id",
    "project_id",
    "created_at",
    "deleted_at",
    "ref_id",
    "global_ref",
    "instance_id",
    "client_operation_id",
    "change_id",
    "tableoid",
    "xmin",
    "xmax",
    "cmin",
    "cmax",
    "ctid",
];

export const tableNameSchema = z.string()
    .min(1)
    .max(59)
    .regex(/^[a-z][a-z0-9_]*$/)
    .refine((name) => !name.endsWith("_ref"));

export const columnNameSchema = z.string()
    .min(1)
    .max(63)
    .regex(/^[a-z][a-z0-9_]*$/)
    .refine(
        (name) => !reservedColumns.includes(name)
    );

export const columnDefinitionSchema = z.object({
    name: columnNameSchema,

    description: z.string()
        .trim()
        .max(2000)
        .nullable()
        .default(null),

    type: columnTypeSchema,

    foreign_key: z.uuid()
        .nullable()
        .default(null),

    constant: z.boolean().default(false),

    nullable: z.boolean().default(true),

    default_value: z.string()
        .max(10000)
        .nullable()
        .default(null),

    possible_values: z.array(
        z.string().max(10000)
    )
        .min(1)
        .max(200)
        .nullable()
        .default(null),
}).strict().superRefine((column, context) => {
    if (
        column.foreign_key &&
        column.type !== "UUID"
    ) {
        context.addIssue({
            code: "custom",
            path: ["foreign_key"],
            message: "Foreign keys require UUID.",
        });
    }

    if (
        column.possible_values &&
        new Set(column.possible_values).size !==
        column.possible_values.length
    ) {
        context.addIssue({
            code: "custom",
            path: ["possible_values"],
            message: "Duplicate possible values.",
        });
    }
});

export const tableDefinitionSchema = z.object({
    name: tableNameSchema,

    description: z.string()
        .trim()
        .max(2000)
        .nullable()
        .default(null),

    columns: z.array(columnDefinitionSchema)
        .max(100),
}).strict().superRefine((table, context) => {
    const names = table.columns.map(
        (column) => column.name
    );

    if (new Set(names).size !== names.length) {
        context.addIssue({
            code: "custom",
            path: ["columns"],
            message: "Duplicate column names.",
        });
    }
});

export const listTablesSchema = z.object({
    name: z.string()
        .trim()
        .max(59)
        .optional(),

    limit: z.coerce.number()
        .int()
        .min(1)
        .max(200)
        .default(50),

    cursor: z.string()
        .max(512)
        .optional(),
});

export type ColumnType =
    z.infer<typeof columnTypeSchema>;

export type ColumnDefinition =
    z.infer<typeof columnDefinitionSchema>;

export type TableDefinition =
    z.infer<typeof tableDefinitionSchema>;

export type ListTablesInput =
    z.infer<typeof listTablesSchema>;

export type ModelSummary = {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
};

export type ModelDetail = ModelSummary & {
    columns: (
        ColumnDefinition & {
            id: string;
        }
    )[];
};