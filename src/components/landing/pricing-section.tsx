import Link from "next/link";

import {
    Building2,
    Code2,
    ShieldCheck,
} from "lucide-react";

import {
    getLocale,
    getTranslations,
} from "next-intl/server";

import { Button } from "@/components/ui/button";

import { PricingCard } from "./pricing-card";

import {
    getPublicBusinessPlan,
} from "@/lib/billing/public-plan";

import {
    formatBillingAmount,
} from "@/lib/billing/format";

export async function PricingSection() {
    const t = await getTranslations("Landing.pricing");
    const locale = await getLocale();

    const plan = getPublicBusinessPlan();

    const businessPrice = plan
        ? formatBillingAmount(
            plan.amount_minor,
            plan.currency,
            locale
        )
        : t("business.price");

    const businessPeriod = plan
        ? `${t(plan.frequency_type, {
            count: plan.frequency,
        })} · ${t("business.period")}`
        : t("business.period");

    return (
        <section
            id="pricing"
            aria-labelledby="pricing-title"
            className="flex flex-col gap-8 py-12"
        >
            <div className="flex flex-col gap-2 text-center">
                <h2
                    id="pricing-title"
                    className="text-2xl font-semibold"
                >
                    {t("title")}
                </h2>

                <p className="text-muted-foreground">
                    {t("description")}
                </p>
            </div>

            <div className="mx-auto grid w-full max-w-3xl gap-4 md:grid-cols-2">
                <PricingCard
                    icon={Code2}
                    title={t("development.title")}
                    description={t("development.description")}
                    price={t("development.price")}
                    period={t("development.period")}
                    action={t("createAccount")}
                    features={[
                        t("development.connectors"),
                        t("development.distribution"),
                        t("development.credentials"),
                        t("development.installations"),
                        t("development.documentation"),
                    ]}
                />

                <PricingCard
                    icon={Building2}
                    title={t("business.title")}
                    description={t("business.description")}
                    price={businessPrice}
                    period={businessPeriod}
                    action={t("createAccount")}
                    primary
                    features={[
                        t("business.catalog"),
                        t("business.integrations"),
                        t("business.synchronization"),
                        t("business.permissions"),
                        t("business.activity"),
                        t("business.analytics"),
                    ]}
                />
            </div>

            <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <ShieldCheck
                        aria-hidden="true"
                        className="size-4 shrink-0"
                    />

                    <span>{t("paymentNotice")}</span>
                </div>

                <p>{t("subscriptionNotice")}</p>

                <p>{t("fixedPriceNotice")}</p>

                <Button asChild variant="link">
                    <Link href="/docs">
                        {t("documentation")}
                    </Link>
                </Button>
            </div>
        </section>
    );
}