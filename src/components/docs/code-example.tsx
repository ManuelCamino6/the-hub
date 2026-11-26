"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  Copy,
  Check,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

type Props = {
  code: string;
  language?: string;
};

export function CodeExample({
  code,
  language = "bash",
}: Props) {
  const t = useTranslations("Docs");

  const [copied, setCopied] =
    useState(false);

  const [failed, setFailed] =
    useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        code
      );

      setCopied(true);
      setFailed(false);

    } catch {
      setCopied(false);
      setFailed(true);
    }
  }

  return (
    <Card className="gap-2">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {language}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
        >
          {copied
            ? <Check />
            : <Copy />}

          {copied
            ? t("copied")
            : t("copyCode")}
        </Button>
      </CardHeader>

      <CardContent className="min-w-0">
        <pre className="overflow-x-auto text-xs">
          <code>{code}</code>
        </pre>

        {failed && (
          <p
            role="alert"
            className="mt-2 text-sm text-muted-foreground"
          >
            {t("copyError")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}