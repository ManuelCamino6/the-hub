import "server-only";

import { getDatabase } from "@/lib/db";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  getAuthorizedPayment,
  findAuthorizedPayments,
} from "../mercadopago/payments";

import {
  reconcileSubscription,
} from "./service";

type PendingEvent = {
  id: string;
  event_type: string;
  resource_id: string;
  attempts: number;
};

async function dispatchEvent(
  event: PendingEvent
) {
  switch (event.event_type) {
    case "subscription_preapproval": {
      await reconcileSubscription(
        event.resource_id
      );

      return;
    }

    case "subscription_authorized_payment": {
      const authorized =
        await getAuthorizedPayment(
          event.resource_id
        );

      await reconcileSubscription(
        authorized.preapproval_id,
        authorized.id
      );

      return;
    }

    case "payment": {
      const result =
        await findAuthorizedPayments({
          payment_id:
            event.resource_id,
        });

      if (result.paging.total === 0) {
        throw new DomainError(
          "PAYMENT_RELATION_NOT_FOUND",
          409
        );
      }

      if (
        result.paging.total !== 1 ||
        result.results.length !== 1
      ) {
        throw new DomainError(
          "AMBIGUOUS_PAYMENT_RELATION",
          409
        );
      }

      const authorized =
        result.results[0];

      if (
        authorized.payment?.id !==
          event.resource_id
      ) {
        throw new DomainError(
          "PAYMENT_DATA_MISMATCH",
          409
        );
      }

      await reconcileSubscription(
        authorized.preapproval_id,
        authorized.id
      );

      return;
    }

    default:
      throw new DomainError(
        "UNSUPPORTED_WEBHOOK_TYPE",
        422
      );
  }
}

export async function processWebhookEvent(
  eventId: string
) {
  const sql = getDatabase();

  const [event] =
    await sql<PendingEvent[]>`
      update billing.provider_events

      set
        attempts = attempts + 1,

        next_attempt_at =
          clock_timestamp()
          + interval '2 minutes'

      where id = ${eventId}

        and processed_at is null

        and next_attempt_at <= now()

      returning
        id,
        event_type,
        resource_id,
        attempts
    `;

  if (!event) {
    return {
      processed: false,
      skipped: true,
    };
  }

  try {
    await dispatchEvent(event);

    await sql`
      update billing.provider_events

      set
        processed_at = clock_timestamp(),
        last_error = null

      where id = ${event.id}

        and processed_at is null

        and attempts = ${event.attempts}
    `;

    return {
      processed: true,
      skipped: false,
    };

  } catch (error) {
    const code =
      error instanceof DomainError
        ? error.code
        : "RECONCILIATION_ERROR";

    const retryMinutes = Math.min(
      1440,
      2 ** Math.min(event.attempts, 10)
    );

    await sql`
      update billing.provider_events

      set
        last_error = ${code},

        next_attempt_at =
          clock_timestamp()
          + ${
            retryMinutes
          }::integer * interval '1 minute'

      where id = ${event.id}

        and processed_at is null

        and attempts = ${event.attempts}
    `;

    return {
      processed: false,
      skipped: false,
    };
  }
}

export async function processPendingEvents(
  limit = 5
) {
  const sql = getDatabase();

  const events = await sql<{
    id: string;
  }[]>`
    select id

    from billing.provider_events

    where processed_at is null

      and next_attempt_at <= now()

    order by next_attempt_at, created_at

    limit ${limit}
  `;

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const event of events) {
    const result =
      await processWebhookEvent(
        event.id
      );

    if (result.processed) {
      processed++;

    } else if (result.skipped) {
      skipped++;

    } else {
      failed++;
    }
  }

  return {
    selected: events.length,
    processed,
    failed,
    skipped,
  };
}