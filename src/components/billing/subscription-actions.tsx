"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import type {
  Subscription,
} from "@/lib/billing/schemas";

type Props = {
  projectId: string;
  subscription: Subscription;
};

type Action =
  | "checkout"
  | "recover"
  | "cancel";

export function SubscriptionActions({
  projectId,
  subscription,
}: Props) {
  const t = useTranslations("Billing");
  const common = useTranslations("Common");
  const router = useRouter();

  const [pending, setPending] =
    useState<Action | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  async function execute(action: Action) {
    if (pending) {
      return;
    }

    setPending(action);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/billing/subscriptions/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            project_id: projectId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError(t("sessionExpired"));
        } else {
          switch (result.error?.code) {
            case "CHECKOUT_DISABLED":
              setError(t("checkoutDisabled"));
              break;

            case "CHECKOUT_RECONCILIATION_REQUIRED":
            case "CHECKOUT_SEARCH_INCOMPLETE":
            case "CHECKOUT_RECOVERY_EMAIL_MISSING":
              setError(t("checkoutRecoveryRequired"));
              break;

            default:
              setError(t("actionError"));
          }
        }

        router.refresh();
        return;
      }

      if (action === "checkout") {
        const redirectUrl =
          result.data?.redirect_url;

        if (typeof redirectUrl !== "string") {
          throw new Error("Invalid checkout response");
        }

        const url = new URL(redirectUrl);

        if (
          url.protocol !== "https:" ||
          ![
            "mercadopago.com.ar",
            "www.mercadopago.com.ar",
          ].includes(url.hostname) ||
          url.pathname !== "/subscriptions/checkout" ||
          url.username ||
          url.password ||
          url.port
        ) {
          throw new Error("Invalid checkout URL");
        }

        window.location.assign(url.href);
        return;
      }

      setMessage(
        action === "cancel"
          ? t("cancelled")
          : t("recovered")
      );

      router.refresh();

    } catch {
      setError(t("actionError"));

    } finally {
      setPending(null);
    }
  }

  const canCheckout =
    subscription.status === "NONE" ||
    (
      subscription.status === "PENDING" &&
      ["IDLE", "READY"].includes(
        subscription.checkout_state
      )
    );

  const canRecover =
    subscription.status !== "NONE" &&
    subscription.status !== "CANCELLED";

  const canCancel =
    subscription.status !== "NONE" &&
    subscription.status !== "CANCELLED" &&
    subscription.checkout_state === "READY";

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert>
          <AlertDescription>
            {message}
          </AlertDescription>
        </Alert>
      )}

      {canCheckout && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {t("checkoutDescription")}
          </p>

          <Button
            disabled={
              pending !== null ||
              !subscription.checkout_enabled ||
              subscription.cancellation_pending
            }
            onClick={() => execute("checkout")}
          >
            {pending === "checkout"
              ? t("processing")
              : subscription.checkout_state === "READY"
                ? t("continueCheckout")
                : t("subscribe")}
          </Button>

          {!subscription.checkout_enabled && (
            <p className="text-sm text-muted-foreground">
              {t("checkoutDisabled")}
            </p>
          )}
        </div>
      )}

      {canRecover && (
        <Button
          variant="outline"
          disabled={pending !== null}
          onClick={() => execute("recover")}
        >
          {pending === "recover"
            ? t("processing")
            : t("recoverCheckout")}
        </Button>
      )}

      {subscription.cancellation_pending && (
        <Alert>
          <AlertDescription>
            {t("cancelPending")}
          </AlertDescription>
        </Alert>
      )}

      {canCancel && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={pending !== null}
            >
              {pending === "cancel"
                ? t("processing")
                : subscription.cancellation_pending
                  ? t("retryCancellation")
                  : t("cancel")}
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("cancel")}
              </AlertDialogTitle>

              <AlertDialogDescription>
                {t("cancelDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>
                {common("back")}
              </AlertDialogCancel>

              <AlertDialogAction
                onClick={() => execute("cancel")}
              >
                {common("confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {subscription.status === "CANCELLED" && (
        <Alert>
          <AlertDescription>
            {t("recontractUnavailable")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}