import { z } from "zod";

export const supportedWebhookTypes = [
  "subscription_preapproval",
  "subscription_authorized_payment",
  "payment",
] as const;

const providerIdSchema = z.union([
  z.string().trim().min(1).max(255),

  z.number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER),
]).transform(String);

export const webhookSchema = z.object({
  id: providerIdSchema,

  type: z.string()
    .trim()
    .min(1)
    .max(100),

  action: z.string()
    .max(150)
    .optional(),

  live_mode: z.boolean(),

  date_created: z.string()
    .max(100)
    .optional(),

  data: z.object({
    id: providerIdSchema,
  }),
});

export type WebhookEvent =
  z.infer<typeof webhookSchema>;

export type SupportedWebhookType =
  typeof supportedWebhookTypes[number];

export function isSupportedWebhookType(
  type: string
): type is SupportedWebhookType {
  return supportedWebhookTypes.some(
    (value) => value === type
  );
}