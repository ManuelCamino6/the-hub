"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type {
  BiConnection,
} from "@/lib/bi/schemas";

type Props = {
  connection: BiConnection;
  password?: string;
};

export function BiConnectionFields({
  connection,
  password,
}: Props) {
  const t = useTranslations("BI");

  const [copied, setCopied] =
    useState<string | null>(null);

  const [error, setError] =
    useState(false);

  const fields = [
    {
      key: "host",
      label: t("host"),
      value: connection.host,
    },
    {
      key: "port",
      label: t("port"),
      value: String(connection.port),
    },
    {
      key: "database",
      label: t("database"),
      value: connection.database,
    },
    {
      key: "schema",
      label: t("schema"),
      value: connection.schema,
    },
    {
      key: "username",
      label: t("username"),
      value: connection.username,
    },
    ...(password
      ? [{
          key: "password",
          label: t("password"),
          value: password,
        }]
      : []),
    {
      key: "ssl",
      label: t("ssl"),
      value: t("sslRequired"),
    },
  ];

  async function copy(
    key: string,
    value: string
  ) {
    try {
      await navigator.clipboard.writeText(
        value
      );

      setCopied(key);
      setError(false);
    } catch {
      setError(true);
    }
  }

  return (
    <div className="grid gap-4">
      {fields.map((field) => (
        <div
          key={field.key}
          className="grid gap-2"
        >
          <Label>
            {field.label}
          </Label>

          <div className="flex gap-2">
            <Input
              aria-label={field.label}
              value={field.value}
              readOnly
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`${t("copy")} ${field.label}`}
              onClick={() =>
                copy(
                  field.key,
                  field.value
                )
              }
            >
              {copied === field.key
                ? <Check />
                : <Copy />}
            </Button>
          </div>
        </div>
      ))}

      {error && (
        <div role="alert">
          {t("copyError")}
        </div>
      )}
    </div>
  );
}