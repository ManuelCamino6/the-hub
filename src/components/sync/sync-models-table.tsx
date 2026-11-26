import Link from "next/link";

import {
  getTranslations,
  getLocale,
} from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

import type {
  ModelSync,
} from "@/lib/sync/schemas";

import {
  formatSyncDate,
} from "@/lib/sync/format";

type Props = {
  models: ModelSync[];
  basePath: string;
};

export async function SyncModelsTable({
  models,
  basePath,
}: Props) {
  const t = await getTranslations("Sync");
  const locale = await getLocale();

  if (!models.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("emptyModels")}
      </p>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("model")}
              </TableHead>

              <TableHead>
                {t("permissions")}
              </TableHead>

              <TableHead className="text-right">
                {t("pending")}
              </TableHead>

              <TableHead className="text-right">
                {t("failed")}
              </TableHead>

              <TableHead className="text-right">
                {t("confirmed")}
              </TableHead>

              <TableHead>
                {t("lastConfirmed")}
              </TableHead>

              <TableHead />
            </TableRow>
          </TableHeader>

          <TableBody>
            {models.map((model) => (
              <TableRow key={model.table_name}>
                <TableCell className="font-medium">
                  {model.table_name}
                </TableCell>

                <TableCell>
                  <Badge
                    variant={
                      model.can_receive
                        ? "outline"
                        : "secondary"
                    }
                  >
                    {model.can_receive
                      ? t("canReceive")
                      : t("cannotReceive")}
                  </Badge>
                </TableCell>

                <TableCell className="text-right tabular-nums">
                  {model.pending}
                </TableCell>

                <TableCell className="text-right tabular-nums">
                  {model.failed}
                </TableCell>

                <TableCell className="text-right tabular-nums">
                  {model.ok_total}
                </TableCell>

                <TableCell>
                  {formatSyncDate(
                    model.last_confirmed_at,
                    locale
                  )}
                </TableCell>

                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <Link
                      href={`${basePath}/${encodeURIComponent(
                        model.table_name
                      )}`}
                    >
                      {t("viewDetails")}
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {models.map((model) => (
          <Card key={model.table_name}>
            <CardContent className="flex flex-col gap-3">
              <p className="font-medium">
                {model.table_name}
              </p>

              <div>
                <Badge variant="outline">
                  {model.can_receive
                    ? t("canReceive")
                    : t("cannotReceive")}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("pending")}
                  </p>

                  <p>{model.pending}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("failed")}
                  </p>

                  <p>{model.failed}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("confirmed")}
                  </p>

                  <p>{model.ok_total}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {t("lastConfirmed")}:{" "}
                {formatSyncDate(
                  model.last_confirmed_at,
                  locale
                )}
              </p>

              <Button variant="outline" asChild>
                <Link
                  href={`${basePath}/${encodeURIComponent(
                    model.table_name
                  )}`}
                >
                  {t("viewDetails")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}