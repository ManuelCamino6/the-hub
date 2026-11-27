import "server-only";

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