import Link from "next/link";

import {
  getTranslations,
} from "next-intl/server";

import {
  DocsNavigation,
} from "@/components/docs/docs-navigation";

import {
  LanguageSwitcher,
} from "@/components/language-switcher";

import {
  Separator,
} from "@/components/ui/separator";

import {
  Button,
} from "@/components/ui/button";

export async function generateMetadata() {
  const t = await getTranslations("Docs");

  return {
    title: `${t("title")} | The Hub`,

    description: t("introDescription"),
  };
}

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("Docs");

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-semibold"
            >
              The Hub
            </Link>

            <Separator
              orientation="vertical"
              className="h-5"
            />

            <Link
              href="/docs"
              className="text-sm text-muted-foreground"
            >
              {t("title")}
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href="/">
                {t("home")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[200px_minmax(0,1fr)]">
        <aside>
          <DocsNavigation />
        </aside>

        <main className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}