"use client";

import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

import {
  BiConnectionFields,
} from "./bi-connection-fields";

import type {
  BiCredentials,
} from "@/lib/bi/schemas";

type Props = {
  credentials: BiCredentials | null;
  onClose: () => void;
};

export function BiCredentialsDialog({
  credentials,
  onClose,
}: Props) {
  const t = useTranslations("BI");

  return (
    <Dialog
      open={credentials !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) =>
          event.preventDefault()
        }
        onInteractOutside={(event) =>
          event.preventDefault()
        }
      >
        <DialogHeader>
          <DialogTitle>
            {t("credentialsTitle")}
          </DialogTitle>

          <DialogDescription>
            {t("credentialsDescription")}
          </DialogDescription>
        </DialogHeader>

        {credentials && (
          <div className="grid gap-4 overflow-y-auto max-h-[60vh]">
            <Alert>
              <ShieldAlert />

              <AlertDescription>
                {t("passwordNotice")}
              </AlertDescription>
            </Alert>

            <BiConnectionFields
              connection={credentials.connection}
              password={credentials.password}
            />

            {!credentials.sessions.complete && (
              <Alert>
                <AlertDescription>
                  {t("sessionWarning")}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>
            {t("credentialsSaved")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}