import "server-only";

import { getDatabase } from "@/lib/db";

import {
  requireBillingProject,
} from "./authorization";

import {
  isCheckoutEnabled,
} from "./config";

import type {
  Subscription,
} from "./schemas";

type SubscriptionRow = Omit<
  Subscription,
  "checkout_enabled"
>;

export async function getSubscription(
  userId: string,
  projectId: string
): Promise<Subscription> {
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    await tx`
      set transaction
      isolation level repeatable read,
      read only
    `;

    await requireBillingProject(
      tx,
      userId,
      projectId,
      {
        adminOnly: true,
      }
    );

    const [subscription] =
      await tx<SubscriptionRow[]>`
        select
          s.status,
          s.provider,
          s.plan_code,
          s.currency,
          s.amount_minor,

          s.period_start::text
            as period_start,

          s.period_end::text
            as period_end,

          billing.has_active_subscription(
            s.project_id
          ) as operational

        from billing.subscriptions s

        where s.project_id = ${projectId}
      `;

    return {
      ...(
        subscription ?? {
          status: "NONE",
          provider: "mercadopago",
          plan_code: null,
          currency: "ARS",
          amount_minor: null,
          period_start: null,
          period_end: null,
          operational: false,
        }
      ),

      checkout_enabled:
        isCheckoutEnabled(),
    };
  });
}