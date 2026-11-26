import {
  getFormatter,
  getTranslations,
} from "next-intl/server";

import { Newspaper } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import type {
  News,
} from "@/lib/news/schemas";

type Props = {
  news: News[];
};

export async function NewsList({
  news,
}: Props) {
  const t = await getTranslations("News");
  const format = await getFormatter();

  if (!news.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Newspaper className="size-8 text-muted-foreground" />

          <h2 className="font-medium">
            {t("empty")}
          </h2>

          <p className="text-sm text-muted-foreground">
            {t("emptyDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {news.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <CardDescription>
              <time dateTime={item.created_at}>
                {format.dateTime(
                  new Date(item.created_at),
                  {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }
                )}
              </time>
            </CardDescription>

            <CardTitle className="break-words">
              {item.title}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="whitespace-pre-wrap break-words text-sm">
              {item.content}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}