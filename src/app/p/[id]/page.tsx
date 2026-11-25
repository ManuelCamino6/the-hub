
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { requireProject } from "@/lib/projects/context";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ProjectPage(props: Props) {
  return (
    <Suspense fallback={
      <Skeleton className="h-40 w-full" />
    }>
      <ProjectContent {...props} />
    </Suspense>
  );
}

async function ProjectContent({ params }: Props) {
  const { id } = await params;
  const project = await requireProject(id);
  const t = await getTranslations("Workspace");

  const business = project.type === "BUSINESS";

  return (
    <>
      <h1 className="text-2xl font-semibold">
        {business ? t("overview") : t("connectors")}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("welcome", { name: project.name })}
          </CardTitle>

          <CardDescription>
            {business
              ? t("businessDescription")
              : t("developmentDescription")}
          </CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}