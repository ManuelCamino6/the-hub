import "server-only";

import { getBillingPlan } from "./config";
import { DomainError } from "@/lib/api/domain-error";

export type PublicBusinessPlan = {
    currency: "ARS";
    amount_minor: number;
    frequency: number;
    frequency_type: "days" | "months";
};

export function isPublicPricingEnabled() {
    return (
        process.env.BILLING_PUBLIC_PRICING_ENABLED === "true"
    );
}

export function getPublicBusinessPlan(): PublicBusinessPlan | null {
    if (!isPublicPricingEnabled()) {
        return null;
    }

    try {
        const plan = getBillingPlan();

        return {
            currency: plan.currency,
            amount_minor: plan.amount_minor,
            frequency: plan.frequency,
            frequency_type: plan.frequency_type,
        };
    } catch (error) {
        if (
            error instanceof DomainError &&
            error.code === "BILLING_NOT_CONFIGURED"
        ) {
            return null;
        }

        throw error;
    }
}