
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ProjectForm } from "@/components/projects/project-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function NewProjectPage() {
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewProjectContent />
      </Suspense>
    </main>
  );
}

async function NewProjectContent() {
  const supabase = await createClient();

  const { data: { user } } =
    await supabase.auth.getUser();

  if (!user) redirect("/login");

  const t = await getTranslations("Projects");

  return (
    <>
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("create")}</CardTitle>
          <CardDescription>
            {t("createDescription")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ProjectForm />
        </CardContent>
      </Card>
    </>
  );
}