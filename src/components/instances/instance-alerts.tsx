
"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import type {
  InstanceDetail,
} from "@/lib/instances/schemas";

export function InstanceAlerts({
  instance,
}: {
  instance: InstanceDetail;
}) {
  const t = useTranslations("Instances");

  const messages: {
    key: string;
    destructive: boolean;
  }[] = [];

  if (instance.status === "INCOMPLETE") {
    messages.push({
      key: "incompleteStatusWarning",
      destructive: false,
    });
  }

  if (instance.status === "UNAUTHORIZED") {
    messages.push({
      key: "unauthorizedWarning",
      destructive: true,
    });
  }

  if (instance.operation_status === "PAUSED") {
    messages.push({
      key: "pausedWarning",
      destructive: false,
    });
  }

  if (instance.connector_status === "DEPRECATED") {
    messages.push({
      key: "deprecatedWarning",
      destructive: false,
    });
  }

  if (instance.connector_deleted) {
    messages.push({
      key: "deletedWarning",
      destructive: true,
    });
  }

  return (
    <>
      {messages.map((message) => (
        <Alert
          key={message.key}
          variant={
            message.destructive
              ? "destructive"
              : "default"
          }
        >
          <AlertTriangle />

          <AlertDescription>
            {t(message.key)}
          </AlertDescription>
        </Alert>
      ))}
    </>
  );
}
