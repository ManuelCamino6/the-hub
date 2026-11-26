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
            z.iso.datetime({
                offset: true,
            }),

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

const remoteIdSchema = z.union([
    z.string().min(1),

    z.number()
        .int()
        .positive()
        .max(Number.MAX_SAFE_INTEGER),
]).transform(String);

const remoteDateSchema =
    z.iso.datetime({
        offset: true,
    });

export const authorizedPaymentSchema =
    z.object({
        id: remoteIdSchema,

        preapproval_id:
            z.string().min(1),

        currency_id:
            z.string(),

        transaction_amount:
            z.coerce.number().positive(),

        debit_date:
            remoteDateSchema,

        last_modified:
            remoteDateSchema,

        status:
            z.string(),

        payment: z.object({
            id: remoteIdSchema
                .nullable()
                .optional(),

            status: z.string()
                .optional(),
        }).nullable().optional(),
    });

export const providerPaymentSchema =
    z.object({
        id: remoteIdSchema,

        status: z.string(),

        status_detail: z.string(),

        currency_id: z.string(),

        transaction_amount:
            z.coerce.number().positive(),

        transaction_amount_refunded:
            z.coerce.number().nonnegative(),

        date_approved:
            remoteDateSchema.nullable(),

        date_last_updated:
            remoteDateSchema,

        date_created:
            remoteDateSchema,

        live_mode:
            z.boolean(),
    });

export const authorizedPaymentSearchSchema =
    z.object({
        paging: z.object({
            offset: z.number().int().nonnegative(),
            limit: z.number().int().positive(),
            total: z.number().int().nonnegative(),
        }),

        results: z.array(
            authorizedPaymentSchema
        ),
    });

export type AuthorizedPayment =
    z.infer<typeof authorizedPaymentSchema>;

export type ProviderPayment =
    z.infer<typeof providerPaymentSchema>;