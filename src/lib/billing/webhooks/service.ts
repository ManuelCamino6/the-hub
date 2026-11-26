import "server-only";

import { getDatabase } from "@/lib/db";

import {
  DomainError,
} from "@/lib/api/domain-error";

import type {
  WebhookEvent,
} from "./schemas";

type StoredEvent = {
  id: string;
  event_type: string;
  resource_id: string;
  processed_at: Date | null;
};

export async function storeWebhookEvent(
  event: WebhookEvent
) {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    const [created] =
      await tx<StoredEvent[]>`
        insert into billing.provider_events (
          provider,
          event_id,
          event_type,
          resource_id,
          payload
        )

        values (
          'mercadopago',
          ${event.id},
          ${event.type},
          ${event.data.id},
          ${JSON.stringify(event)}::jsonb
        )

        on conflict (
          provider,
          event_id
        )

        do nothing

        returning
          id,
          event_type,
          resource_id,
          processed_at
      `;

    if (created) {
      return {
        id: created.id,
        duplicate: false,
        processed: false,
      };
    }

    const [existing] =
      await tx<StoredEvent[]>`
        select
          id,
          event_type,
          resource_id,
          processed_at

        from billing.provider_events

        where provider = 'mercadopago'
          and event_id = ${event.id}
      `;

    if (!existing) {
      throw new DomainError(
        "WEBHOOK_STORAGE_ERROR",
        500
      );
    }

    if (
      existing.event_type !== event.type ||
      existing.resource_id !== event.data.id
    ) {
      throw new DomainError(
        "WEBHOOK_EVENT_CONFLICT",
        409
      );
    }

    return {
      id: existing.id,
      duplicate: true,

      processed:
        existing.processed_at !== null,
    };
  });
}