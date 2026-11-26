import Link from "next/link";

import {
  getTranslations,
} from "next-intl/server";

import {
  ArrowRight,
  Database,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

export default async function DocsPage() {
  const t = await getTranslations("Docs");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("title")}
        </h1>

        <p className="text-muted-foreground">
          {t("introDescription")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <Database />

          <CardTitle>
            {t("model")}
          </CardTitle>

          <CardDescription>
            {t("modelDescription")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button asChild>
            <Link href="/docs/model">
              {t("exploreModel")}

              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}