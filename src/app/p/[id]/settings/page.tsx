
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { requireProjectAdmin } from "@/lib/projects/context";
import { ProjectSettings } from "@/components/projects/project-settings";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  params: Promise<{ id: string }>;
};

export default function SettingsPage(props: Props) {
  return (
    <Suspense fallback={
      <Skeleton className="h-96 w-full" />
    }>
      <SettingsContent {...props} />
    </Suspense>
  );
}

async function SettingsContent({ params }: Props) {
  const { id } = await params;
  const project = await requireProjectAdmin(id);
  const t = await getTranslations("Workspace");

  return (
    <>
      <h1 className="text-2xl font-semibold">
        {t("settings")}
      </h1>

      <ProjectSettings project={project} />
    </>
  );
}
