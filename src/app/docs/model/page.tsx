import { Suspense } from "react";

import {
  getTranslations,
} from "next-intl/server";

import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  getPublishedModel,
} from "@/lib/docs/model-service";

import {
  ModelTable,
} from "@/components/docs/model-table";

import {
  ModelSkeleton,
} from "@/components/docs/model-skeleton";

export async function generateMetadata() {
  const t = await getTranslations("Docs");

  return {
    title: `${t("model")} | The Hub`,

    description: t("modelDescription"),
  };
}

async function ModelContent() {
  const t = await getTranslations("Docs");

  const model =
    await getPublishedModel();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {t("model")}
          </h1>

          <Badge variant="secondary">
            {t("version", {
              version: model.version,
            })}
          </Badge>
        </div>

        <p className="text-muted-foreground">
          {t("modelDescription")}
        </p>

        <p className="text-sm">
          {model.name}
        </p>

        {model.description && (
          <p className="text-sm text-muted-foreground">
            {model.description}
          </p>
        )}
      </div>

      <Alert>
        <Info />

        <AlertDescription>
          {t("liveModelNotice")}
        </AlertDescription>
      </Alert>

      {model.tables.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-medium">
            {t("tables")}
          </h2>

          <div className="flex flex-wrap gap-3">
            {model.tables.map((table) => (
              <a
                key={table.name}
                href={`#${table.name}`}
                className="font-mono text-sm underline"
              >
                {table.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {!model.tables.length ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t("noTables")}
          </CardContent>
        </Card>
      ) : (
        model.tables.map((table) => (
          <ModelTable
            key={table.name}
            table={table}
            version={model.version}
          />
        ))
      )}

      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p>{t("permissionsNotice")}</p>

        <p>{t("constantNotice")}</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          {t("systemFields")}
        </h2>

        <p className="text-sm text-muted-foreground">
          {t("systemFieldsDescription")}
        </p>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">id</Badge>

          <Badge variant="outline">ref_id</Badge>

          <Badge variant="outline">global_ref</Badge>
        </div>
      </section>
    </div>
  );
}

export default function ModelPage() {
  return (
    <Suspense fallback={<ModelSkeleton />}>
      <ModelContent />
    </Suspense>
  );
}