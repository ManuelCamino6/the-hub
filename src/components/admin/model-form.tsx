
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import {
  tableDefinitionSchema,
  type TableDefinition,
  type ModelDetail,
  type ModelSummary,
} from "@/lib/protocol/schemas";

import {
  emptyColumn,
  initialColumns,
  serializeColumns,
  getModelChanges,
} from "@/lib/protocol/form";

import { ColumnEditor } from "./column-editor";

type Props = {
  model?: ModelDetail;
  models: ModelSummary[];
};

type Message =
  | "invalid"
  | "invalidPossibleValues"
  | "error"
  | "conflict"
  | "incompatible";

export function ModelForm({
  model,
  models,
}: Props) {
  const router = useRouter();
  const t = useTranslations("Admin");
  const common = useTranslations("Common");

  const [name, setName] = useState(
    model?.name ?? ""
  );

  const [description, setDescription] =
    useState(model?.description ?? "");

  const [columns, setColumns] = useState(
    () => initialColumns(model)
  );

  const [pending, setPending] =
    useState(false);

  const [message, setMessage] =
    useState<Message | null>(null);

  const [confirmation, setConfirmation] =
    useState("");

  const [pendingDefinition, setPendingDefinition] =
    useState<TableDefinition | null>(null);

  const changes =
    model && pendingDefinition
      ? getModelChanges(
          model,
          pendingDefinition
        )
      : null;

  const disabled =
    pending || pendingDefinition !== null;

  async function save(
    definition: TableDefinition
  ) {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(
        model
          ? `/api/tables/${model.id}`
          : "/api/tables",
        {
          method: model ? "PUT" : "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(definition),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          response.status === 409
            ? "conflict"
            : result.error?.code ===
                "INCOMPATIBLE_MODEL_DEFINITION"
              ? "incompatible"
              : response.status === 422
                ? "invalid"
                : "error"
        );

        return;
      }

      if (!result.data?.id) {
        setMessage("error");
        return;
      }

      router.replace(
        `/admin/models/${result.data.id}`
      );

      router.refresh();
    } catch {
      setMessage("error");
    } finally {
      setPending(false);
      setPendingDefinition(null);
      setConfirmation("");
    }
  }

  function submit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (disabled) return;

    setMessage(null);

    let serialized;

    try {
      serialized = serializeColumns(columns);
    } catch {
      setMessage("invalidPossibleValues");
      return;
    }

    const parsed = tableDefinitionSchema.safeParse({
      name,
      description: description || null,
      columns: serialized,
    });

    if (!parsed.success) {
      setMessage("invalid");
      return;
    }

    if (model) {
      const difference = getModelChanges(
        model,
        parsed.data
      );

      if (difference.requiresConfirmation) {
        setConfirmation("");
        setPendingDefinition(parsed.data);
        return;
      }
    }

    void save(parsed.data);
  }

  return (
    <>
      <form
        onSubmit={submit}
        className="flex flex-col gap-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("name")}</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="model-name">
                {t("name")}
              </Label>

              <Input
                id="model-name"
                value={name}
                required
                maxLength={59}
                disabled={disabled}
                onChange={(event) =>
                  setName(event.target.value)
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="model-description">
                {t("description")}
              </Label>

              <Textarea
                id="model-description"
                value={description}
                maxLength={2000}
                disabled={disabled}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t("systemColumns")}
            </CardTitle>

            <CardDescription>
              {t("systemColumnsDescription")}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-wrap gap-2">
            {[
              "id",
              "project_id",
              "created_at",
              "deleted_at",
            ].map((field) => (
              <Badge
                key={field}
                variant="outline"
              >
                {field}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2>{t("columns")}</h2>
            <p>{t("columnsDescription")}</p>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={
              disabled || columns.length >= 100
            }
            onClick={() =>
              setColumns((current) => [
                ...current,
                emptyColumn(
                  crypto.randomUUID()
                ),
              ])
            }
          >
            <Plus />
            {t("addColumn")}
          </Button>
        </div>

        {columns.length === 0 && (
          <Card>
            <CardContent>
              {t("noColumns")}
            </CardContent>
          </Card>
        )}

        {columns.map((column) => (
          <ColumnEditor
            key={column.rowId}
            column={column}
            models={models}
            disabled={disabled}
            onChange={(next) =>
              setColumns((current) =>
                current.map((item) =>
                  item.rowId === next.rowId
                    ? next
                    : item
                )
              )
            }
            onRemove={() =>
              setColumns((current) =>
                current.filter(
                  (item) =>
                    item.rowId !== column.rowId
                )
              )
            }
          />
        ))}

        {message && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>
              {t(message)}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() =>
              router.push(
                model
                  ? `/admin/models/${model.id}`
                  : "/admin/models"
              )
            }
          >
            {common("cancel")}
          </Button>

          <Button
            type="submit"
            disabled={disabled}
          >
            {pending
              ? t("saving")
              : model
                ? common("save")
                : t("create")}
          </Button>
        </div>
      </form>

      <AlertDialog
        open={pendingDefinition !== null}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setPendingDefinition(null);
            setConfirmation("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("confirmChanges")}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {t("changeWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {changes && (
            <div className="flex flex-col gap-3">
              {changes.renamedModel && (
                <p>{t("renamedModel")}</p>
              )}

              {changes.removedColumns.length > 0 && (
                <div>
                  <p>{t("removedColumns")}</p>

                  <ul className="pl-4">
                    {changes.removedColumns.map(
                      (column) => (
                        <li key={column}>
                          {column}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {changes.changedTypes.length > 0 && (
                <div>
                  <p>{t("changedTypes")}</p>

                  <ul className="pl-4">
                    {changes.changedTypes.map(
                      (column) => (
                        <li key={column.name}>
                          {column.name}:{" "}
                          {column.previous} →{" "}
                          {column.next}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              <Label htmlFor="confirm-model-change">
                {t("confirmName")}
              </Label>

              <Input
                id="confirm-model-change"
                value={confirmation}
                placeholder={model?.name}
                disabled={pending}
                onChange={(event) =>
                  setConfirmation(
                    event.target.value
                  )
                }
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {common("cancel")}
            </AlertDialogCancel>

            <Button
              variant="destructive"
              disabled={
                pending ||
                confirmation !== model?.name
              }
              onClick={() => {
                if (pendingDefinition) {
                  void save(pendingDefinition);
                }
              }}
            >
              {pending
                ? t("saving")
                : common("confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
