import { z } from "zod";

export const subscriptionStatuses = [
  "NONE",
  "PENDING",
  "ACTIVE",
  "PAST_DUE",
  "PAUSED",
  "CANCELLED",
] as const;

export const invoiceStatuses = [
  "OPEN",
  "PAID",
  "VOID",
  "UNCOLLECTIBLE",
] as const;

export const subscriptionQuerySchema =
  z.object({
    project_id: z.uuid(),
  }).strict();

export const checkoutSchema = z.object({
  project_id: z.uuid(),
}).strict();

export const listInvoicesSchema =
  z.object({
    project_id: z.uuid(),

    status: z.enum(invoiceStatuses)
      .optional(),

    limit: z.coerce.number()
      .int()
      .min(1)
      .max(200)
      .default(50),

    cursor: z.string()
      .max(512)
      .optional(),
  }).strict();

export type SubscriptionStatus =
  typeof subscriptionStatuses[number];

export type InvoiceStatus =
  typeof invoiceStatuses[number];

export type ListInvoicesInput =
  z.infer<typeof listInvoicesSchema>;

export type Subscription = {
  status: SubscriptionStatus;
  provider: "mercadopago";
  plan_code: string | null;
  currency: "ARS";
  amount_minor: number | null;
  period_start: string | null;
  period_end: string | null;
  operational: boolean;
  checkout_enabled: boolean;
};

export type Invoice = {
  id: string;
  description: string;
  amount_minor: number;
  currency: "ARS";
  status: InvoiceStatus;
  created_at: string;
  due_at: string | null;
  paid_at: string | null;
};

export type InvoiceDetail = Invoice & {
  invoice_url: string | null;
};