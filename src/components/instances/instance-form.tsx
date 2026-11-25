
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import type {
  ConnectorDetail,
} from "@/lib/connectors/schemas";

import {
  createInstanceSchema,
  permissionOperations,
  type InstancePermission,
} from "@/lib/instances/schemas";

import {
  emptyPermission,
} from "@/lib/instances/defaults";

import {
  normalizeParameter,
} from "@/lib/instances/parameters";

import { ParameterField } from "./parameter-field";
import { OriginSelect } from "./origin-select";

const originFields = {
  can_receive_post: "can_receive_post_from",
  can_receive_update: "can_receive_update_from",
  can_receive_delete: "can_receive_delete_from",
} as const;

type Props = {
  projectId: string;
  connector: ConnectorDetail;
  tables: { id: string; name: string }[];
  origins: { id: string; name: string }[];
};

export function InstanceForm({
  projectId,
  connector,
  tables,
  origins,
}: Props) {
  const router = useRouter();
  const t = useTranslations("Instances");
  const common = useTranslations("Common");
  const catalog = useTranslations("Catalog");

  const [name, setName] = useState(connector.name);

  const [values, setValues] = useState<
    Record<string, string>
  >({});

  const [permissions, setPermissions] = useState(
    () => connector.models_permissions.map(
      (model) => emptyPermission(model.table_id)
    )
  );

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmIncomplete, setConfirmIncomplete] =
    useState(false);

  const tableNames = new Map(
    tables.map((table) => [table.id, table.name])
  );

  function updatePermission(
    tableId: string,
    patch: Partial<InstancePermission>
  ) {
    setPermissions((current) =>
      current.map((permission) =>
        permission.table_id === tableId
          ? { ...permission, ...patch }
          : permission
      )
    );
  }

  function buildParameters() {
    return connector.parameters.map((definition) => {
      const raw = values[definition.key] ?? "";

      let value: string | number | boolean | null =
        raw === "" ? null : raw;

      if (raw !== "") {
        if (definition.type === "NUMBER") {
          value = Number(raw);
        }

        if (definition.type === "BOOLEAN") {
          value = raw === "true";
        }
      }

      normalizeParameter(definition, value);

      return {
        key: definition.key,
        value,
      };
    });
  }

  async function submit(allowIncomplete = false) {
    if (pending) return;

    setError("");

    let parameters;

    try {
      parameters = buildParameters();
    } catch {
      setError(t("invalid"));
      return;
    }

    const parsed = createInstanceSchema.safeParse({
      project_id: projectId,
      connector_id: connector.id,
      name,
      parameters,
      models_permissions: permissions,
    });

    if (!parsed.success) {
      setError(t("invalid"));
      return;
    }

    const incomplete = connector.parameters.some(
      (definition) =>
        definition.required &&
        normalizeParameter(
          definition,
          parameters.find(
            (parameter) =>
              parameter.key === definition.key
          )?.value
        ) === null
    );

    if (incomplete && !allowIncomplete) {
      setConfirmIncomplete(true);
      return;
    }

    setConfirmIncomplete(false);
    setPending(true);

    try {
      const response = await fetch("/api/instances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        setError(t("error"));
        return;
      }

      router.replace(`/p/${projectId}/integrations`);
      router.refresh();
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{connector.name}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          <Label htmlFor="instance-name">
            {t("name")}
          </Label>

          <Input
            id="instance-name"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            maxLength={120}
            required
            disabled={pending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("parameters")}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {!connector.parameters.length && (
            <p className="text-sm text-muted-foreground">
              {t("noParameters")}
            </p>
          )}

          {connector.parameters.map((definition) => (
            <ParameterField
              key={definition.key}
              definition={definition}
              value={values[definition.key] ?? ""}
              disabled={pending}
              onChange={(value) =>
                setValues((current) => ({
                  ...current,
                  [definition.key]: value,
                }))
              }
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("permissions")}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {!permissions.length && (
            <p className="text-sm text-muted-foreground">
              {t("noPermissions")}
            </p>
          )}

          {connector.models_permissions.map((model) => {
            const permission = permissions.find(
              (item) => item.table_id === model.table_id
            )!;

            return (
              <div
                key={model.table_id}
                className="space-y-4 rounded-md border p-4"
              >
                <h3 className="font-medium">
                  {tableNames.get(model.table_id)
                    ?? model.table_id}
                </h3>

                {permissionOperations
                  .filter((operation) => model[operation])
                  .map((operation) => {
                    const originField =
                      originFields[
                        operation as keyof typeof originFields
                      ];

                    return (
                      <div
                        key={operation}
                        className="space-y-2"
                      >
                        <Label>
                          <Checkbox
                            checked={permission[operation]}
                            disabled={pending}
                            onCheckedChange={(checked) =>
                              updatePermission(
                                model.table_id,
                                {
                                  [operation]: checked === true,
                                }
                              )
                            }
                          />

                          {catalog(`operations.${operation}`)}
                        </Label>

                        {originField &&
                          permission[operation] && (
                            <OriginSelect
                              value={permission[originField]}
                              origins={origins}
                              disabled={pending}
                              onChange={(value) =>
                                updatePermission(
                                  model.table_id,
                                  {
                                    [originField]: value,
                                  }
                                )
                              }
                            />
                          )}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.back()}
        >
          {common("cancel")}
        </Button>

        <Button type="submit" disabled={pending}>
          {pending ? t("installing") : t("install")}
        </Button>
      </div>

      <AlertDialog
        open={confirmIncomplete}
        onOpenChange={setConfirmIncomplete}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("statuses.INCOMPLETE")}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {t("incompleteWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              {common("cancel")}
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={() => void submit(true)}
            >
              {t("saveIncomplete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
