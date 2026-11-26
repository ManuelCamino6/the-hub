import {
  getTranslations,
} from "next-intl/server";

import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type {
  ModelSync,
} from "@/lib/sync/schemas";

type Props = {
  model: ModelSync;
};

export async function ModelPermissions({
  model,
}: Props) {
  const t = await getTranslations("Sync");

  const permissions = [
    {
      label: t("receiveCreate"),
      allowed: model.can_receive_post,
    },
    {
      label: t("receiveUpdate"),
      allowed: model.can_receive_update,
    },
    {
      label: t("receiveDelete"),
      allowed: model.can_receive_delete,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("permissions")}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {permissions.map((permission) => (
          <div
            key={permission.label}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <p className="text-sm">
              {permission.label}
            </p>

            <Badge
              variant={
                permission.allowed
                  ? "default"
                  : "secondary"
              }
            >
              {permission.allowed
                ? t("allowed")
                : t("notAllowed")}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}