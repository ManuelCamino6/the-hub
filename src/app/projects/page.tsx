
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Building2,
  Code2,
  Plus,
  Search,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/projects/service";
import { listProjectsSchema } from "@/lib/projects/schemas";
import { logout } from "@/lib/auth/actions";
import { LanguageSwitcher } from "@/components/language-switcher";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type PageProps = {
  searchParams: Promise<{
    name?: string;
    cursor?: string;
  }>;
};

export default function ProjectsPage({
  searchParams,
}: PageProps) {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <Suspense fallback={<ProjectsSkeleton />}>
        <ProjectsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ProjectsContent({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const { data: { user } } =
    await supabase.auth.getUser();

  if (!user) redirect("/login");

  const t = await getTranslations("Projects");
  const auth = await getTranslations("Auth");

  const params = await searchParams;

  const parsed = listProjectsSchema.safeParse({
    name: params.name,
    cursor: params.cursor,
    limit: 50,
  });

  let result;

  try {
    result = await listProjects(
      parsed.success
        ? parsed.data
        : { limit: 50 }
    );
  } catch {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {t("listError")}
        </AlertDescription>
      </Alert>
    );
  }

  const nextParams = new URLSearchParams();

  if (params.name) {
    nextParams.set("name", params.name);
  }

  if (result.next_cursor) {
    nextParams.set("cursor", result.next_cursor);
  }

  const firstParams = new URLSearchParams();

  if (params.name) {
    firstParams.set("name", params.name);
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/projects" className="text-xl font-semibold">
          The Hub
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          <form action={logout}>
            <Button variant="outline" type="submit">
              {auth("logout")}
            </Button>
          </form>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            {t("title")}
          </h1>

          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <Button asChild>
          <Link href="/projects/new">
            <Plus />
            {t("create")}
          </Link>
        </Button>
      </div>

      <form className="flex gap-2" action="/projects">
        <Input
          name="name"
          defaultValue={params.name}
          placeholder={t("search")}
          aria-label={t("search")}
          maxLength={120}
        />

        <Button
          type="submit"
          variant="outline"
          size="icon"
          aria-label={t("search")}
        >
          <Search />
        </Button>
      </form>

      {result.data.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("empty")}</CardTitle>

            {!params.name && (
              <>
                <CardDescription>
                  {t("emptyDescription")}
                </CardDescription>

                <div>
                  <Button asChild>
                    <Link href="/projects/new">
                      {t("create")}
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.data.map((project) => {
            const Icon =
              project.type === "BUSINESS"
                ? Building2
                : Code2;

            return (
              <Card key={project.id}>
                <CardHeader>
                  <Icon className="size-6" />

                  <CardTitle className="break-words">
                    {project.name}
                  </CardTitle>

                  <CardDescription>
                    {t(`types.${project.type}`)}
                  </CardDescription>

                  <div>
                    <Badge variant="secondary">
                      {t(`roles.${project.role}`)}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {params.cursor && (
          <Button variant="outline" asChild>
            <Link href={`/projects?${firstParams}`}>
              {t("firstPage")}
            </Link>
          </Button>
        )}

        {result.next_cursor && (
          <Button variant="outline" asChild>
            <Link href={`/projects?${nextParams}`}>
              {t("nextPage")}
            </Link>
          </Button>
        )}
      </div>
    </>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-12 w-full" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton
            key={item}
            className="h-40 w-full"
          />
        ))}
      </div>
    </div>
  );
}
