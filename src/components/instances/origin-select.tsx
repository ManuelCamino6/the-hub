
"use client";

import { useTranslations } from "next-intl";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Origin = {
  id: string;
  name: string;
};

type Props = {
  value: string[] | null;
  onChange: (value: string[] | null) => void;
  origins: Origin[];
  disabled?: boolean;
};

export function OriginSelect({
  value,
  onChange,
  origins,
  disabled,
}: Props) {
  const t = useTranslations("Instances");

  return (
    <div className="space-y-3">
      <Select
        value={value === null ? "all" : "selected"}
        onValueChange={(next) =>
          onChange(next === "all" ? null : [])
        }
        disabled={disabled}
      >
        <SelectTrigger aria-label={t("origins")}>
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="all">
            {t("allOrigins")}
          </SelectItem>

          <SelectItem value="selected">
            {t("selectOrigins")}
          </SelectItem>
        </SelectContent>
      </Select>

      {value !== null && (
        <div className="space-y-2">
          {origins.map((origin) => (
            <Label key={origin.id}>
              <Checkbox
                checked={value.includes(origin.id)}
                disabled={disabled}
                onCheckedChange={(checked) => {
                  onChange(
                    checked === true
                      ? [...value, origin.id]
                      : value.filter(
                          (id) => id !== origin.id
                        )
                  );
                }}
              />
              {origin.name}
            </Label>
          ))}

          {value.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("noOrigins")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
