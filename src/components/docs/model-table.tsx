import {
  getTranslations,
} from "next-intl/server";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";

import type {
  PublishedTable,
} from "@/lib/docs/schemas";

export async function ModelTable({
  table,
  version,
}: {
  table: PublishedTable;
  version: number;
}) {
  const t = await getTranslations("Docs");

  return (
    <Card id={table.name}>
      <CardHeader>
        <CardTitle className="font-mono">
          {table.name}
        </CardTitle>

        {table.description && (
          <CardDescription>
            {table.description}
          </CardDescription>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            GET
          </Badge>

          <Badge variant="outline">
            POST
          </Badge>

          <Badge variant="outline">
            PUT
          </Badge>

          <Badge variant="outline">
            DELETE
          </Badge>
        </div>

        <code className="break-all text-xs text-muted-foreground">
          /api/models/{version}/{table.name}
        </code>
      </CardHeader>

      <CardContent>
        {!table.columns.length ? (
          <p className="text-sm text-muted-foreground">
            {t("noColumns")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {t("name")}
                </TableHead>

                <TableHead>
                  {t("type")}
                </TableHead>

                <TableHead>
                  {t("nullable")}
                </TableHead>

                <TableHead>
                  {t("constant")}
                </TableHead>

                <TableHead>
                  {t("defaultValue")}
                </TableHead>

                <TableHead>
                  {t("possibleValues")}
                </TableHead>

                <TableHead>
                  {t("foreignKey")}
                </TableHead>

                <TableHead>
                  {t("description")}
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {table.columns.map((column) => (
                <TableRow key={column.name}>
                  <TableCell className="font-mono text-xs">
                    {column.name}
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary">
                      {column.type}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {column.nullable
                      ? t("yes")
                      : t("no")}
                  </TableCell>

                  <TableCell>
                    {column.constant
                      ? t("yes")
                      : t("no")}
                  </TableCell>

                  <TableCell>
                    <code className="text-xs">
                      {column.default_value
                        ?? t("notDefined")}
                    </code>
                  </TableCell>

                  <TableCell>
                    {column.possible_values?.length
                      ? (
                        <div className="flex flex-wrap gap-1">
                          {column.possible_values.map(
                            (value) => (
                              <Badge
                                key={value}
                                variant="outline"
                              >
                                {value}
                              </Badge>
                            )
                          )}
                        </div>
                      )
                      : t("notDefined")}
                  </TableCell>

                  <TableCell>
                    {column.foreign_key ? (
                      <a
                        href={`#${column.foreign_key}`}
                        className="font-mono text-xs underline"
                      >
                        {column.foreign_key}
                      </a>
                    ) : t("notDefined")}
                  </TableCell>

                  <TableCell className="whitespace-normal">
                    {column.description
                      ?? t("notDefined")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}