
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  requireSuperadminPage,
} from "@/lib/protocol/admin-context";

import {
  listModelTables,
} from "@/lib/protocol/admin-service";

import { decodeCursor } from "@/lib/api/pagination";

type Props = {
  searchParams: Promise<{
    name?: string;
    cursor?: string;
  }>;
};

async function ModelsContent({
  searchParams,
}: Props) {
  const user = await requireSuperadminPage();
  const t = await getTranslations("Admin");

  const params = await searchParams;

  const name =
    typeof params.name === "string"
      ? params.name.trim().slice(0, 59)
      : "";

  const cursor =
    typeof params.cursor === "string"
      ? params.cursor
      : undefined;

  try {
    decodeCursor(cursor);
  } catch {
    redirect("/admin/models");
  }

  const result = await listModelTables(
    user.id,
    {
      name,
      cursor,
      limit: 50,
    }
  );

  const nextParams = new URLSearchParams();

  if (name) {
    nextParams.set("name", name);
  }

  if (result.next_cursor) {
    nextParams.set(
      "cursor",
      result.next_cursor
    );
  }

  const firstParams = new URLSearchParams();

  if (name) {
    firstParams.set("name", name);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1>{t("models")}</h1>
          <p>{t("modelsDescription")}</p>
        </div>

        <Button asChild>
          <Link href="/admin/models/new">
            <Plus />
            {t("create")}
          </Link>
        </Button>
      </div>

      <form className="flex gap-2">
        <Input
          name="name"
          defaultValue={name}
          placeholder={t("search")}
          aria-label={t("search")}
          maxLength={59}
        />

        <Button
          type="submit"
          variant="outline"
          aria-label={t("search")}
        >
          <Search />
        </Button>
      </form>

      <Card>
        <CardContent>
          {result.data.length === 0 ? (
            <p>{t("empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("description")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>

              <TableBody>
                {result.data.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>
                      <Link
                        href={`/admin/models/${model.id}`}
                      >
                        {model.name}
                      </Link>
                    </TableCell>

                    <TableCell>
                      {model.description ?? "—"}
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link
                          href={`/admin/models/${model.id}`}
                        >
                          {t("open")}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {cursor && (
          <Button variant="outline" asChild>
            <Link
              href={`/admin/models?${firstParams}`}
            >
              {t("firstPage")}
            </Link>
          </Button>
        )}

        {result.next_cursor && (
          <Button variant="outline" asChild>
            <Link
              href={`/admin/models?${nextParams}`}
            >
              {t("nextPage")}
            </Link>
          </Button>
        )}
      </div>
    </>
  );
}

export default function ModelsPage(props: Props) {
  return (
    <Suspense
      fallback={
        <Skeleton className="h-48 w-full" />
      }
    >
      <ModelsContent {...props} />
    </Suspense>
  );
}
