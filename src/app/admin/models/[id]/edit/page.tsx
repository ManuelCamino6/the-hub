
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { Skeleton } from "@/components/ui/skeleton";
import { ModelForm } from "@/components/admin/model-form";

import {
  requireAdminModel,
} from "@/lib/protocol/admin-context";

import {
  getAllModelSummaries,
} from "@/lib/protocol/admin-service";

type Props = {
  params: Promise<{ id: string }>;
};

async function EditModelContent({
  params,
}: Props) {
  const { id } = await params;

  const { user, model } =
    await requireAdminModel(id);

  const t = await getTranslations("Admin");

  const models =
    await getAllModelSummaries(user.id);

  return (
    <>
      <div>
        <h1>{t("edit")}: {model.name}</h1>
        <p>{t("editDescription")}</p>
      </div>

      <ModelForm
        key={model.id}
        model={model}
        models={models}
      />
    </>
  );
}

export default function EditModelPage(
  props: Props
) {
  return (
    <Suspense
      fallback={
        <Skeleton className="h-48 w-full" />
      }
    >
      <EditModelContent {...props} />
    </Suspense>
  );
}
