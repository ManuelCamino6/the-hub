
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const benefits = [
  "dataModel",
  "permissions",
  "visibility",
] as const;

const questions = [
  "platform",
  "business",
  "development",
  "technical",
] as const;

export default async function HomePage() {
  const t = await getTranslations("Landing");
  const auth = await getTranslations("Auth");

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="text-lg font-semibold">
            The Hub
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher />

            <Button variant="ghost" asChild>
              <Link href="/login">{auth("login")}</Link>
            </Button>

            <Button asChild>
              <Link href="/signup">{auth("signup")}</Link>
            </Button>

            <Button variant="ghost" asChild>
              <Link href="/docs">
                {t("documentation")}
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-6 py-16">
        <section className="max-w-2xl space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {t("hero.title")}
          </h1>

          <p className="text-lg text-muted-foreground">
            {t("hero.description")}
          </p>

          <Button size="lg" asChild>
            <Link href="/signup">{t("hero.cta")}</Link>
          </Button>
        </section>

        <Separator />

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">
            {t("howItWorks.title")}
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-lg font-medium">
                Business
              </h3>
              <p className="text-muted-foreground">
                {t("howItWorks.business")}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium">
                Development
              </h3>
              <p className="text-muted-foreground">
                {t("howItWorks.development")}
              </p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">
            {t("benefits.title")}
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="space-y-2">
                <h3 className="font-medium">
                  {t(`benefits.${benefit}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(`benefits.${benefit}.description`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section className="max-w-2xl space-y-3">
          <h2 className="text-2xl font-semibold">
            {t("security.title")}
          </h2>

          <p className="text-muted-foreground">
            {t("security.description")}
          </p>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">
            {t("faq.title")}
          </h2>

          <Accordion type="single" collapsible>
            {questions.map((question) => (
              <AccordionItem key={question} value={question}>
                <AccordionTrigger>
                  {t(`faq.${question}.question`)}
                </AccordionTrigger>
                <AccordionContent>
                  {t(`faq.${question}.answer`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">
            {t("cta")}
          </h2>

          <Button asChild>
            <Link href="/signup">{auth("signup")}</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <span className="text-sm text-muted-foreground">
            The Hub
          </span>
          <span className="text-sm text-muted-foreground">
            MVP
          </span>
        </div>
      </footer>
    </div>
  );
}
