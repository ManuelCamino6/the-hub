"use client";

import { useTranslations } from "next-intl";

import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";

import { Button } from "@/components/ui/button";

import {
  AlertCircle,
} from "lucide-react";

export default function DocsError({
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  const t = useTranslations("Docs");

  const common = useTranslations("Common");

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="destructive">
        <AlertCircle />

        <AlertTitle>
          {t("loadError")}
        </AlertTitle>

        <AlertDescription>
          {t("loadErrorDescription")}
        </AlertDescription>
      </Alert>

      <div>
        <Button
          variant="outline"
          onClick={reset}
        >
          {common("retry")}
        </Button>
      </div>
    </div>
  );
}