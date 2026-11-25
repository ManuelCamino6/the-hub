
"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  parameterTypes,
  type ConnectorParameter,
} from "@/lib/connectors/schemas";

export type ParameterRow = ConnectorParameter & {
  rowId: string;
};

type Props = {
  value: ParameterRow[];
  onChange: (value: ParameterRow[]) => void;
  disabled?: boolean;
};

export function ParameterEditor({
  value,
  onChange,
  disabled,
}: Props) {
  const t = useTranslations("Connectors");

  function update(
    rowId: string,
    patch: Partial<ConnectorParameter>
  ) {
    onChange(
      value.map((item) =>
        item.rowId === rowId
          ? { ...item, ...patch }
          : item
      )
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("parameters")}</CardTitle>
        <CardDescription>
          {t("parametersDescription")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!value.length && (
          <p className="text-sm text-muted-foreground">
            {t("noParameters")}
          </p>
        )}

        {value.map((item) => (
          <div
            key={item.rowId}
            className="space-y-4 rounded-md border p-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${item.rowId}-key`}>
                  {t("parameterKey")}
                </Label>

                <Input
                  id={`${item.rowId}-key`}
                  value={item.key}
                  placeholder="api_key"
                  maxLength={63}
                  disabled={disabled}
                  required
                  onChange={(event) =>
                    update(item.rowId, {
                      key: event.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>{t("parameterType")}</Label>

                <Select
                  value={item.type}
                  disabled={disabled}
                  onValueChange={(type) =>
                    update(item.rowId, {
                      type: type as ConnectorParameter["type"],
                    })
                  }
                >
                  <SelectTrigger
                    className="w-full"
                    aria-label={t("parameterType")}
                  >
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {parameterTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`types.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${item.rowId}-required`}
                  checked={item.required}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    update(item.rowId, {
                      required: checked === true,
                    })
                  }
                />

                <Label htmlFor={`${item.rowId}-required`}>
                  {t("required")}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${item.rowId}-encrypted`}
                  checked={item.encrypted}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    update(item.rowId, {
                      encrypted: checked === true,
                    })
                  }
                />

                <Label htmlFor={`${item.rowId}-encrypted`}>
                  {t("encrypted")}
                </Label>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto"
                disabled={disabled}
                aria-label={t("removeParameter")}
                onClick={() =>
                  onChange(
                    value.filter(
                      (row) => row.rowId !== item.rowId
                    )
                  )
                }
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          disabled={disabled || value.length >= 100}
          onClick={() =>
            onChange([
              ...value,
              {
                rowId: crypto.randomUUID(),
                key: "",
                type: "TEXT",
                required: false,
                encrypted: false,
              },
            ])
          }
        >
          <Plus />
          {t("addParameter")}
        </Button>
      </CardContent>
    </Card>
  );
}
