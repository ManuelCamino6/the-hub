import "server-only";

import { getDatabase } from "@/lib/db";

import { DomainError } from "@/lib/api/domain-error";

import {
  authenticateConnector,
} from "@/lib/connectors/auth";

import {
  lockModelForRead,
} from "@/lib/protocol/locks";

import { propagationAccess } from "./access";

import {
  registerDestinationReference,
} from "./reference-service";

import type {
  ConfirmChangesInput,
  PropagationStatus,
  ChangeType,
} from "./schemas";

type ConfirmationRow = {
  id: string;
  instance_id: string;
  project_id: string;
  status: PropagationStatus;
  type: ChangeType;
  table_id: string | null;
  record_id: string | null;
};

export async function confirmChanges(
  tokenHash: string,
  input: ConfirmChangesInput
) {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    await lockModelForRead(tx);

    const ids = input.confirmations.map(
      (item) => item.id
    );

    // Bloqueamos los proyectos antes del conector
    // para mantener el orden global de locks.

    await tx`
      select project.id

      from platform.projects project

      where project.id in (
        select i.project_id

        from protocol.propagations p

        join platform.instances i
          on i.id = p.instance_id

        join platform.connectors c
          on c.id = i.connector_id

        where p.id = any(${tx.array(ids)}::uuid[])
          and c.token_hash = ${tokenHash}

        union

        select c.project_id

        from platform.connectors c

        where c.token_hash = ${tokenHash}
      )

      order by project.id

      for update of project
    `;

    const connector =
      await authenticateConnector(
        tx,
        tokenHash
      );

    const rows = await tx<ConfirmationRow[]>`
      select
        p.id,
        p.instance_id,
        i.project_id,
        p.status,
        ch.type,
        ch.table_id,
        ch.record_id

      from protocol.propagations p

      join protocol.changes ch
        on ch.id = p.change_id

      join protocol.batches b
        on b.id = ch.batch_id

      join platform.instances i
        on i.id = p.instance_id

      join platform.connectors c
        on c.id = i.connector_id

      join platform.projects business
        on business.id = i.project_id

      join platform.projects owner
        on owner.id = c.project_id

      where p.id = any(${tx.array(ids)}::uuid[])

        and c.id = ${connector.id}
        and b.project_id = i.project_id
        and b.status = 'COMMITTED'

        and ${propagationAccess(tx)}

      order by p.id

      for update of p
    `;

    if (rows.length !== ids.length) {
      throw new DomainError(
        "PROPAGATION_NOT_FOUND",
        404
      );
    }

    const byId = new Map(
      rows.map((row) => [row.id, row])
    );

    const updated: {
      id: string;
      status: "OK" | "FAILED";
    }[] = [];

    for (const confirmation of
      input.confirmations
    ) {
      const row = byId.get(
        confirmation.id
      )!;

      if (
        row.status === "OK" ||
        row.status === "EXPIRED"
      ) {
        throw new DomainError(
          "PROPAGATION_ALREADY_CLOSED",
          409
        );
      }

      if (confirmation.ref_id !== undefined) {
        if (
          row.type !== "CREATE" ||
          !row.table_id ||
          !row.record_id
        ) {
          throw new DomainError(
            "REFERENCE_NOT_ALLOWED",
            422
          );
        }

        await registerDestinationReference(
          tx,
          {
            tableId: row.table_id,
            recordId: row.record_id,
            projectId: row.project_id,
            instanceId: row.instance_id,
            refId: confirmation.ref_id,
          }
        );
      }

      await tx`
        update protocol.propagations

        set
          status = ${confirmation.status},

          comments =
            ${confirmation.comments ?? null},

          updated_at = clock_timestamp(),

          confirmed_at = case
            when ${confirmation.status} = 'OK'
            then coalesce(
              confirmed_at,
              clock_timestamp()
            )
            else confirmed_at
          end

        where id = ${row.id}
      `;

      updated.push({
        id: row.id,
        status: confirmation.status,
      });
    }

    return { updated };
  });
}