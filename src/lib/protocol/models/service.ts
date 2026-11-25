
import "server-only";

import {
    getDatabase,
} from "@/lib/db";

import {
    DomainError,
} from "@/lib/api/domain-error";

import {
    decodeCursor,
    paginate,
} from "@/lib/api/pagination";

import {
    lockModelForRead,
} from "@/lib/protocol/locks";

import {
    lockOperationInstance,
    requireOperationalInstance,
} from "@/lib/protocol/operation-context";

import {
    getModelMetadata,
    modelDataTable,
    modelReferenceTable,
    modelIdentifier,
} from "./metadata";

import {
    requireModelPermission,
} from "./permissions";

import {
    parseRecordFilters,
    parseRecordFields,
    buildFilterConditions,
} from "./filters";

import type {
    ListRecordsInput,
    ModelValue,
} from "./schemas";

type RecordRow = {
    id: string;
    created_at: string;
    ref_id: string | null;
    global_ref: string | null;
    fields: Record<string, ModelValue>;
};

export async function listRecords(
    tokenHash: string,
    version: number,
    tableName: string,
    input: ListRecordsInput
) {
    const sql = getDatabase();

    let cursor;

    try {
        cursor = decodeCursor(input.cursor);
    } catch {
        throw new DomainError(
            "INVALID_CURSOR",
            422
        );
    }

    return sql.begin(async (tx) => {
        await lockModelForRead(tx);

        const {
            instance,
            connector,
        } = await lockOperationInstance(
            tx,
            tokenHash,
            input.instance_id
        );

        await requireOperationalInstance(
            tx,
            instance,
            connector.status
        );

        if (
            input.project_id &&
            input.project_id.toLowerCase() !==
            instance.project_id
        ) {
            throw new DomainError(
                "PROJECT_MISMATCH",
                404
            );
        }

        const model = await getModelMetadata(
            tx,
            version,
            tableName
        );

        await requireModelPermission(
            tx,
            instance.id,
            model.id,
            "can_list"
        );

        const fields = parseRecordFields(
            model,
            input.fields
        );

        const filters = parseRecordFilters(
            model,
            input.filters
        );

        const table = modelDataTable(model);
        const refs = modelReferenceTable(model);

        const filterSql = buildFilterConditions(
            filters,
            7
        );

        const conditions = [
            "d.project_id = $1::uuid",
            "d.deleted_at is null",

            `(
        $3::timestamptz is null
        or (
          d.created_at,
          d.id
        ) < (
          $3::timestamptz,
          $4::uuid
        )
      )`,

            ...filterSql.conditions,
        ];

        const selectedFields = fields.length
            ? fields.map((field) => (
                `jsonb_build_object(
                    '${field}',
                    d.${modelIdentifier(field)}
                )`
            )).join(" || ")
            : "'{}'::jsonb";

        const rows = await tx.unsafe<
            RecordRow[]
        >(
            `
        select
          d.id,

          to_char(
            d.created_at at time zone 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
          ) as created_at,

          r.ref_id,

          origin.global_ref,

          ${selectedFields} as fields

        from ${table} d

        left join ${refs} r
          on r.id = d.id
          and r.instance_id = $2::uuid

        left join lateral (
          select
            c.payload ->> 'ref_id'
              as global_ref

          from protocol.changes c

          join protocol.batches b
            on b.id = c.batch_id

          where c.record_id = d.id
            and and c.table_id = $6::uuid
            and c.type = 'CREATE'
            and b.type = 'TRANSACTION'
            and b.status = 'COMMITTED'
            and b.project_id = d.project_id

          order by
            b.closed_at,
            c.sequence

          limit 1
        ) origin on true

        where ${conditions.join(" and ")}

        order by
          d.created_at desc,
          d.id desc

        limit $5::integer
      `,
            [
                instance.project_id,
                instance.id,
                cursor?.created_at ?? null,
                cursor?.id ?? null,
                input.limit + 1,
                model.id,
                ...filterSql.values,
            ]
        );

        const result = paginate(
            rows,
            input.limit
        );

        return {
            data: result.data.map((row) => ({
                id: row.id,
                ...row.fields,
                ref_id: row.ref_id,
                global_ref: row.global_ref,
            })),

            next_cursor: result.next_cursor,
        };
    });
}
