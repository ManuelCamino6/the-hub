"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { useTranslations } from "next-intl";

import {
  RefreshCw,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

export function RefreshStatusButton() {
  const router = useRouter();

  const t = useTranslations("Billing");

  const [pending, startTransition] =
    useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
    >
      <RefreshCw />

      {t("refresh")}
    </Button>
  );
}