import {
  getTranslations,
} from "next-intl/server";

import { Badge } from "@/components/ui/badge";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import type {
  Instance,
} from "@/lib/instances/schemas";

type Props = {
  status: Instance["status"];

  operationStatus:
    Instance["operation_status"];
};

export async function SyncStatus({
  status,
  operationStatus,
}: Props) {
  const t = await getTranslations("Sync");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={
            status === "OK"
              ? "default"
              : status === "UNAUTHORIZED"
                ? "destructive"
                : "secondary"
          }
        >
          {t(`statuses.${status}`)}
        </Badge>

        <Badge
          variant={
            operationStatus === "PAUSED"
              ? "secondary"
              : "outline"
          }
        >
          {t(
            `operationStatuses.${operationStatus}`
          )}
        </Badge>
      </div>

      {status === "INCOMPLETE" && (
        <Alert>
          <AlertDescription>
            {t("incompleteNotice")}
          </AlertDescription>
        </Alert>
      )}

      {status === "UNAUTHORIZED" && (
        <Alert variant="destructive">
          <AlertDescription>
            {t("unauthorizedNotice")}
          </AlertDescription>
        </Alert>
      )}

      {operationStatus === "PAUSED" && (
        <Alert>
          <AlertDescription>
            {t("pausedNotice")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}