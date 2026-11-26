import Link from "next/link";
import { Suspense } from "react";

import {
  redirect,
  notFound,
} from "next/navigation";

import {
  getTranslations,
} from "next-intl/server";

import {
  requireProject,
} from "@/lib/projects/context";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  decodeCursor,
} from "@/lib/api/pagination";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  listNews,
} from "@/lib/news/service";

import {
  NewsList,
} from "@/components/news/news-list";

import {
  NewsSkeleton,
} from "@/components/news/news-skeleton";

import {
  SyncRefreshButton,
} from "@/components/sync/sync-refresh-button";

import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    cursor?: string;
  }>;
};

async function NewsContent({
  params,
  searchParams,
}: Props) {
  const { id } = await params;

  await requireProject(id);

  const base = `/p/${id}/news`;

  const { cursor } = await searchParams;

  try {
    decodeCursor(cursor);
  } catch {
    redirect(base);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const t = await getTranslations("News");

  const result = await listNews(
    user.id,
    {
      project_id: id,
      limit: 50,
      cursor,
    }
  ).catch((error: unknown) => {
    if (
      error instanceof DomainError &&
      error.status === 404
    ) {
      notFound();
    }

    throw error;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("title")}
          </h1>

          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <SyncRefreshButton namespace="News" />
      </div>

      <NewsList news={result.data} />

      <div className="flex flex-wrap justify-end gap-2">
        {cursor && (
          <Button variant="outline" asChild>
            <Link href={base}>
              {t("firstPage")}
            </Link>
          </Button>
        )}

        {result.next_cursor && (
          <Button variant="outline" asChild>
            <Link
              href={`${base}?cursor=${encodeURIComponent(
                result.next_cursor
              )}`}
            >
              {t("nextPage")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NewsPage(
  props: Props
) {
  return (
    <Suspense fallback={<NewsSkeleton />}>
      <NewsContent {...props} />
    </Suspense>
  );
}