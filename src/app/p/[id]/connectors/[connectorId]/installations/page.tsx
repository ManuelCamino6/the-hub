import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Activity } from "lucide-react";

import {
  getTranslations,
  getFormatter,
} from "next-intl/server";

import {
  requireOwnedConnector,
} from "@/lib/connectors/context";

import { createClient } from "@/lib/supabase/server";

import {
  listDevelopmentInstallations,
} from "@/lib/instances/development-service";

import { decodeCursor } from "@/lib/api/pagination";

import {
  InstanceStatusBadge,
  OperationStatusBadge,
} from "@/components/instances/instance-status";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

type Props = {
  params: Promise<{
    id: string;
    connectorId: string;
  }>;

  searchParams: Promise<{
    cursor?: string;
  }>;
};

export default function InstallationsPage(
  props: Props
) {
  return (
    <Suspense
      fallback={<Skeleton className="h-64 w-full" />}
    >
      <InstallationsContent {...props} />
    </Suspense>
  );
}

async function InstallationsContent({
  params,
  searchParams,
}: Props) {
  const { id, connectorId } = await params;

  await requireOwnedConnector(
    id,
    connectorId
  );

  const base =
    `/p/${id}/connectors/${connectorId}/installations`;

  const { cursor } = await searchParams;

  try {
    decodeCursor(cursor);
  } catch {
    redirect(base);
  }

  const supabase = await createClient();

  const { data: { user } } =
    await supabase.auth.getUser();

  if (!user) redirect("/login");

  const t = await getTranslations("Connectors");
  const instances = await getTranslations("Instances");
  const projects = await getTranslations("Projects");
  const sync = await getTranslations("Sync");

  const format = await getFormatter();

  const result =
    await listDevelopmentInstallations(
      user.id,
      {
        connector_id: connectorId,
        limit: 50,
        cursor,
      }
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("installations")}
        </CardTitle>

        <CardDescription>
          {t("installationsDescription")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("installationPrivacy")}
        </p>

        {!result.data.length ? (
          <p className="text-sm text-muted-foreground">
            {t("noInstallations")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {t("installationId")}
                </TableHead>

                <TableHead>
                  {instances("configurationStatus")}
                </TableHead>

                <TableHead>
                  {instances("operationStatus")}
                </TableHead>

                <TableHead>
                  {t("pending")}
                </TableHead>

                <TableHead>
                  {t("failed")}
                </TableHead>

                <TableHead>
                  {t("lastConfirmation")}
                </TableHead>

                <TableHead className="text-right">
                  {sync("title")}
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {result.data.map((installation) => (
                <TableRow
                  key={installation.instance_id}
                >
                  <TableCell className="font-mono text-xs">
                    {installation.instance_id}
                  </TableCell>

                  <TableCell>
                    <InstanceStatusBadge
                      status={installation.status}
                    />
                  </TableCell>

                  <TableCell>
                    <OperationStatusBadge
                      status={
                        installation.operation_status
                      }
                    />
                  </TableCell>

                  <TableCell>
                    {installation.pending}
                  </TableCell>

                  <TableCell>
                    {installation.failed}
                  </TableCell>

                  <TableCell>
                    {installation.last_confirmed_at
                      ? format.dateTime(
                          new Date(
                            installation.last_confirmed_at
                          ),
                          {
                            dateStyle: "short",
                            timeStyle: "short",
                          }
                        )
                      : t("noConfirmations")}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link
                        href={`${base}/${installation.instance_id}/sync`}
                      >
                        <Activity />
                        {sync("viewDetails")}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex justify-end gap-2">
          {cursor && (
            <Button variant="outline" asChild>
              <Link href={base}>
                {projects("firstPage")}
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
                {projects("nextPage")}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}