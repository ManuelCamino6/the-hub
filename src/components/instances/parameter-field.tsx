
"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  ParameterDefinition,
} from "@/lib/instances/parameters";

type Props = {
  definition: ParameterDefinition;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function ParameterField({
  definition,
  value,
  onChange,
  disabled,
}: Props) {
  const t = useTranslations("Instances");
  const id = `parameter-${definition.key}`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>
          {definition.key}
        </Label>

        <Badge variant="outline">
          {definition.required
            ? t("required")
            : t("optional")}
        </Badge>

        {definition.encrypted && (
          <Badge variant="secondary">
            {t("encrypted")}
          </Badge>
        )}
      </div>

      {definition.type === "BOOLEAN" ? (
        <Select
          value={value || "unset"}
          onValueChange={(next) =>
            onChange(next === "unset" ? "" : next)
          }
          disabled={disabled}
        >
          <SelectTrigger id={id}>
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="unset">
              {t("notSpecified")}
            </SelectItem>

            <SelectItem value="true">
              {t("yes")}
            </SelectItem>

            <SelectItem value="false">
              {t("no")}
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          type={
            definition.type === "NUMBER"
              ? "number"
              : definition.type === "DATE"
                ? "date"
                : definition.encrypted
                  ? "password"
                  : "text"
          }
          step={
            definition.type === "NUMBER"
              ? "any"
              : undefined
          }
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          autoComplete="off"
          disabled={disabled}
        />
      )}
    </div>
  );
}
