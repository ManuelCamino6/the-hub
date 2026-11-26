import { z } from "zod";

export const mercadoPagoSubscriptionSchema =
  z.object({
    id: z.string().min(1),

    status: z.string().min(1),

    external_reference: z.string(),

    init_point: z.url().optional(),

    next_payment_date:
      z.string().nullable().optional(),

    date_created:
      z.string().optional(),

    last_modified:
      z.string().optional(),

    auto_recurring: z.object({
      frequency: z.number().int().positive(),

      frequency_type: z.enum([
        "days",
        "months",
      ]),

      currency_id: z.string(),

      transaction_amount:
        z.coerce.number().positive(),
    }),
  });

export type MercadoPagoSubscription =
  z.infer<
    typeof mercadoPagoSubscriptionSchema
  >;