
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { Skeleton } from "@/components/ui/skeleton";
import { ModelForm } from "@/components/admin/model-form";

import {
  requireSuperadminPage,
} from "@/lib/protocol/admin-context";

import {
  getAllModelSummaries,
} from "@/lib/protocol/admin-service";

async function CreateModelContent() {
  const user = await requireSuperadminPage();
  const t = await getTranslations("Admin");

  const models =
    await getAllModelSummaries(user.id);

  return (
    <>
      <div>
        <h1>{t("create")}</h1>
        <p>{t("createDescription")}</p>
      </div>

      <ModelForm models={models} />
    </>
  );
}

export default function CreateModelPage() {
  return (
    <Suspense
      fallback={
        <Skeleton className="h-48 w-full" />
      }
    >
      <CreateModelContent />
    </Suspense>
  );
}
