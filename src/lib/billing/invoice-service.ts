import "server-only";

import { getDatabase } from "@/lib/db";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  decodeCursor,
  paginate,
} from "@/lib/api/pagination";

import {
  requireBillingProject,
} from "./authorization";

import type {
  Invoice,
  InvoiceDetail,
  ListInvoicesInput,
} from "./schemas";

export async function listInvoices(
  userId: string,
  input: ListInvoicesInput
) {
  const sql = getDatabase();

  const cursor = input.cursor
    ? decodeCursor(input.cursor)
    : null;

  return sql.begin(async (tx) => {
    await tx`
      set transaction
      isolation level repeatable read,
      read only
    `;

    await requireBillingProject(
      tx,
      userId,
      input.project_id,
      {
        allowDeleted: true,
      }
    );

    const rows = await tx<Invoice[]>`
      select
        id,
        description,
        amount_minor,
        currency,
        status,

        to_char(
          created_at at time zone 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
        ) as created_at,

        due_at::text as due_at,
        paid_at::text as paid_at

      from platform.invoices

      where project_id = ${input.project_id}

      ${
        input.status
          ? tx`and status = ${input.status}`
          : tx``
      }

      ${
        cursor
          ? tx`
              and (created_at, id) <
              (
                ${cursor.created_at}::timestamptz,
                ${cursor.id}::uuid
              )
            `
          : tx``
      }

      order by created_at desc, id desc

      limit ${input.limit + 1}
    `;

    return paginate(
      rows,
      input.limit
    );
  });
}

export async function getInvoice(
  userId: string,
  invoiceId: string,
  expectedProjectId?: string
): Promise<InvoiceDetail> {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    const [invoice] =
      await tx<InvoiceDetail[]>`
        select
          f.id,
          f.description,
          f.amount_minor,
          f.currency,
          f.status,
          f.invoice_url,

          f.created_at::text as created_at,
          f.due_at::text as due_at,
          f.paid_at::text as paid_at

        from platform.invoices f

        join platform.projects p
          on p.id = f.project_id

        join platform.users_per_project m
          on m.project_id = p.id

        where f.id = ${invoiceId}
          and m.user_id = ${userId}
          and p.type = 'BUSINESS'

          and (
            p.deleted_at is null
            or m.role = 'ADMIN'
          )
          and (
            ${expectedProjectId ?? null}::uuid is null

            or f.project_id =
              ${expectedProjectId ?? null}::uuid
          )
      `;

    if (!invoice) {
      throw new DomainError(
        "INVOICE_NOT_FOUND",
        404
      );
    }

    return invoice;
  });
}