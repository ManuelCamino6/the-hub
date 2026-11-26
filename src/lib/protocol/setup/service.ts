import "server-only";

import { getDatabase } from "@/lib/db";

import { DomainError } from "@/lib/api/domain-error";

import {
  lockModelForRead,
} from "@/lib/protocol/locks";

import {
  lockOperationInstance,
  requireOperationalInstance,
} from "@/lib/protocol/operation-context";

import type {
  SetupInput,
  SetupResult,
} from "./schemas";

type SetupModel = {
  id: string;
  name: string;
};

export async function setupInstance(
  tokenHash: string,
  instanceId: string,
  input: SetupInput
): Promise<SetupResult> {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    await lockModelForRead(tx);

    const { instance, connector } =
      await lockOperationInstance(
        tx,
        tokenHash,
        instanceId
      );

    await requireOperationalInstance(
      tx,
      instance,
      connector.status
    );

    const availableModels =
      await tx<SetupModel[]>`
        select
          t.id,
          t.name

        from protocol.tables t

        join protocol.versions v
          on v.id = t.version_id

        join platform.effective_instance_permissions ep
          on ep.table_id = t.id

        where v.active
          and t.deleted_at is null
          and ep.instance_id = ${instance.id}
          and ep.can_receive_post

        order by t.name
      `;

    const models = input.models
      ? availableModels.filter(
          (model) =>
            input.models!.includes(model.name)
        )
      : availableModels;

    if (
      input.models &&
      models.length !== input.models.length
    ) {
      throw new DomainError(
        "SETUP_MODEL_NOT_ALLOWED",
        403
      );
    }

    if (models.length === 0) {
      throw new DomainError(
        "NO_SETUP_MODELS",
        422
      );
    }

    const modelIds = models.map(
      (model) => model.id
    );

    await tx`
      update protocol.propagations p

      set
        status = 'EXPIRED',
        updated_at = clock_timestamp()

      from protocol.changes ch,
           protocol.batches b

      where p.change_id = ch.id
        and ch.batch_id = b.id

        and b.project_id = ${instance.project_id}
        and p.instance_id = ${instance.id}
        and p.status = 'PENDING'

        and ch.table_id =
          any(${tx.array(modelIds)}::uuid[])
    `;

    const [batch] = await tx<{
      id: string;
    }[]>`
      insert into protocol.batches (
        project_id,
        instance_id,
        type,
        status,
        closed_at
      )

      values (
        ${instance.project_id},
        ${instance.id},
        'SETUP',
        'COMMITTED',
        clock_timestamp()
      )

      returning id
    `;

    let sequence = 0;
    let changesCreated = 0;
    let propagationsCreated = 0;

    for (const model of models) {
      const [result] = await tx<{
        changes_created: number;
        propagations_created: number;
      }[]>`
        with inserted_changes as (
          insert into protocol.changes (
            batch_id,
            sequence,
            table_id,
            table_name,
            record_id,
            type,
            payload,
            applied_payload
          )

          select
            ${batch.id}::uuid,

            (
              ${sequence} +
              row_number() over (
                order by d.id
              )
            )::integer,

            ${model.id}::uuid,
            ${model.name},
            d.id,
            'CREATE',

            jsonb_build_object(
              'ref_id', null,
              'fields',

              to_jsonb(d) - array[
                'id',
                'project_id',
                'created_at',
                'deleted_at'
              ]::text[]
            ),

            jsonb_build_object(
              'ref_id', null,
              'fields',

              to_jsonb(d) - array[
                'id',
                'project_id',
                'created_at',
                'deleted_at'
              ]::text[]
            )

          from data.${tx(model.name)} d

          where d.project_id =
            ${instance.project_id}

            and d.deleted_at is null

          returning id
        ),

        inserted_propagations as (
          insert into protocol.propagations (
            change_id,
            instance_id,
            status
          )

          select
            id,
            ${instance.id}::uuid,
            'PENDING'

          from inserted_changes

          returning id
        )

        select
          (
            select count(*)::integer
            from inserted_changes
          ) as changes_created,

          (
            select count(*)::integer
            from inserted_propagations
          ) as propagations_created
      `;

      sequence += result.changes_created;

      changesCreated +=
        result.changes_created;

      propagationsCreated +=
        result.propagations_created;
    }

    return {
      batch_id: batch.id,
      models: models.map(
        (model) => model.name
      ),
      changes_created: changesCreated,
      propagations_created: propagationsCreated,
    };
  });
}