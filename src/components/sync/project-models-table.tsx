import {
  getLocale,
  getTranslations,
} from "next-intl/server";

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
  ProjectModelSync,
} from "@/lib/sync/schemas";

import {
  formatSyncDate,
} from "@/lib/sync/format";

type Props = {
  models: ProjectModelSync[];
};

export async function ProjectModelsTable({
  models,
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

              <TableHead className="text-right">
                {t("instances")}
              </TableHead>

              <TableHead className="text-right">
                {t("pending")}
              </TableHead>

              <TableHead className="text-right">
                {t("failed")}
              </TableHead>

              <TableHead>
                {t("lastConfirmed")}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {models.map((model) => (
              <TableRow key={model.table_name}>
                <TableCell className="font-medium">
                  {model.table_name}
                </TableCell>

                <TableCell className="text-right">
                  {model.instances_total}
                </TableCell>

                <TableCell className="text-right">
                  {model.pending}
                </TableCell>

                <TableCell className="text-right">
                  {model.failed}
                </TableCell>

                <TableCell>
                  {formatSyncDate(
                    model.last_confirmed_at,
                    locale
                  )}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("instances")}
                  </p>

                  <p>{model.instances_total}</p>
                </div>

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
              </div>

              <p className="text-sm text-muted-foreground">
                {t("lastConfirmed")}:{" "}
                {formatSyncDate(
                  model.last_confirmed_at,
                  locale
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}