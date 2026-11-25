
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

type Props = {
    token: string;
    onConfirm: () => void;
};

export function TokenDialog({
    token,
    onConfirm,
}: Props) {
    const t = useTranslations("Connectors");
    const common = useTranslations("Common");

    const [saved, setSaved] = useState(false);
    const [copyState, setCopyState] = useState<
        "copied" | "copyError" | null
    >(null);

    async function copyToken() {
        try {
            await navigator.clipboard.writeText(token);
            setCopyState("copied");
        } catch {
            setCopyState("copyError");
        }
    }

    return (
        <Dialog open onOpenChange={() => { }}>
            <DialogContent
                showCloseButton={false}
                onEscapeKeyDown={(event) => event.preventDefault()}
                onInteractOutside={(event) => event.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>{t("tokenTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("tokenWarning")}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2">
                    <Input
                        value={token}
                        readOnly
                        aria-label={t("tokenTitle")}
                        className="font-mono"
                        onFocus={(event) => event.target.select()}
                    />

                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={t("copyToken")}
                        onClick={copyToken}
                    >
                        <Copy />
                    </Button>
                </div>

                {copyState && (
                    <Alert>
                        <AlertDescription>
                            {t(copyState)}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex items-center gap-2">
                    <Checkbox
                        id="token-saved"
                        checked={saved}
                        onCheckedChange={(checked) =>
                            setSaved(checked === true)
                        }
                    />

                    <Label htmlFor="token-saved">
                        {t("tokenSaved")}
                    </Label>
                </div>

                <DialogFooter>
                    <Button
                        disabled={!saved}
                        onClick={onConfirm}
                    >
                        {common("continue")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
