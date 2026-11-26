"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  namespace?: "Sync" | "News";
};

export function SyncRefreshButton({
  namespace = "Sync",
}: Props) {
  const t = useTranslations(namespace);
  const router = useRouter();

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

      {pending
        ? t("refreshing")
        : t("refresh")}
    </Button>
  );
}