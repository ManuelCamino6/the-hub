
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleSelect } from "./role-select";

import {
    ResendInvitation,
} from "@/components/projects/resend-invitation";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import type { ProjectRole } from "@/lib/projects/schemas";

import {
    memberInputSchema,
    type ProjectMember,
} from "@/lib/projects/member-schemas";

type Mode = "add" | "changeRole" | "remove";


type Message =
    | "success"
    | "invited"
    | "invalid"
    | "lastAdmin"
    | "selfRole"
    | "error"
    | "invitationSent"
    | "invitationEmailFailed";

type Props = {
    projectId: string;
    currentUserId: string;
    members: ProjectMember[];
};

export function ProjectMembers({
    projectId,
    currentUserId,
    members,
}: Props) {
    const t = useTranslations("Members");
    const common = useTranslations("Common");
    const router = useRouter();

    const [mode, setMode] = useState<Mode | null>(null);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<ProjectRole>("VIEWER");
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState<Message | null>(null);
    const [error, setError] = useState<Message | null>(null);

    function openDialog(
        nextMode: Mode,
        member?: ProjectMember
    ) {
        setEmail(member?.email ?? "");
        setRole(member?.role ?? "VIEWER");
        setError(null);
        setMessage(null);
        setMode(nextMode);
    }

    async function submit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!mode || pending) return;

        const parsed = memberInputSchema.safeParse({
            email,
            role,
        });

        if (!parsed.success) {
            setError("invalid");
            return;
        }

        const removing = mode === "remove";

        const body = {
            users: [
                removing
                    ? { email: parsed.data.email }
                    : parsed.data,
            ],
        };

        setPending(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/projects/${projectId}/users`,
                {
                    method: removing ? "DELETE" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                switch (result.error?.code) {
                    case "LAST_ADMIN":
                        setError("lastAdmin");
                        break;
                    case "SELF_ROLE_CHANGE":
                        setError("selfRole");
                        break;
                    case "VALIDATION_ERROR":
                        setError("invalid");
                        break;
                    default:
                        setError("error");
                }

                return;
            }


            setMode(null);

            const emailDelivery = result.data?.email_delivery as
                | {
                    email: string;
                    status: "SENT" | "FAILED" | "SKIPPED";
                }[]
                | undefined;

            const emailFailed =
                emailDelivery?.some(
                    (delivery) => delivery.status === "FAILED"
                ) ?? false;

            const emailSent =
                emailDelivery?.some(
                    (delivery) => delivery.status === "SENT"
                ) ?? false;

            setMessage(
                emailFailed
                    ? "invitationEmailFailed"
                    : emailSent
                        ? "invitationSent"
                        : result.data?.invited?.length
                            ? "invited"
                            : "success"
            );


            const removingSelf =
                removing &&
                members.some(
                    (member) =>
                        member.user_id === currentUserId &&
                        member.email === email
                );

            if (removingSelf) {
                router.replace("/projects");
            }

            router.refresh();
        } catch {
            setError("error");
        } finally {
            setPending(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        {t("title")}
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        {t("description")}
                    </p>
                </div>

                <Button onClick={() => openDialog("add")}>
                    <Plus />
                    {t("add")}
                </Button>
            </div>

            {message && (
                <Alert>
                    <AlertDescription>
                        {t(message)}
                    </AlertDescription>
                </Alert>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("name")}</TableHead>
                            <TableHead>{t("role")}</TableHead>
                            <TableHead>{t("status")}</TableHead>
                            <TableHead>
                                <span className="sr-only">
                                    {t("actions")}
                                </span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {members.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className="h-24 text-center"
                                >
                                    {t("empty")}
                                </TableCell>
                            </TableRow>
                        )}

                        {members.map((member) => {
                            const own =
                                member.user_id === currentUserId;

                            return (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <div className="font-medium">
                                            {member.name || member.email}

                                            {own && (
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                    ({t("you")})
                                                </span>
                                            )}
                                        </div>

                                        {member.name && (
                                            <div className="text-xs text-muted-foreground">
                                                {member.email}
                                            </div>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        <Badge variant="secondary">
                                            {t(`roles.${member.role}`)}
                                        </Badge>
                                    </TableCell>

                                    <TableCell>
                                        <Badge variant="outline">
                                            {member.status === "ACTIVE"
                                                ? t("active")
                                                : t("pending")}
                                        </Badge>
                                    </TableCell>


                                    <TableCell className="text-right">
                                        <div className="flex items-start justify-end gap-2">
                                            {member.status === "PENDING" && (
                                                <ResendInvitation
                                                    projectId={projectId}
                                                    email={member.email}
                                                />
                                            )}

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={t("actions")}
                                                    >
                                                        <MoreHorizontal />
                                                    </Button>
                                                </DropdownMenuTrigger>

                                                <DropdownMenuContent align="end">
                                                    {!own && (
                                                        <DropdownMenuItem
                                                            onSelect={() =>
                                                                openDialog("changeRole", member)
                                                            }
                                                        >
                                                            {t("changeRole")}
                                                        </DropdownMenuItem>
                                                    )}

                                                    <DropdownMenuItem
                                                        variant="destructive"
                                                        onSelect={() =>
                                                            openDialog("remove", member)
                                                        }
                                                    >
                                                        {t("remove")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <Dialog
                open={mode !== null}
                onOpenChange={(open) => {
                    if (!open && !pending) setMode(null);
                }}
            >
                <DialogContent>
                    {mode && (
                        <form
                            onSubmit={submit}
                            className="space-y-4"
                        >
                            <DialogHeader>
                                <DialogTitle>{t(mode)}</DialogTitle>

                                <DialogDescription>
                                    {t(`${mode}Description`)}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-2">
                                <Label htmlFor="member-email">
                                    {t("email")}
                                </Label>

                                <Input
                                    id="member-email"
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    readOnly={mode !== "add"}
                                    disabled={pending}
                                    required
                                />
                            </div>

                            {mode !== "remove" && (
                                <div className="space-y-2">
                                    <Label>{t("role")}</Label>

                                    <RoleSelect
                                        value={role}
                                        onChange={setRole}
                                        disabled={pending}
                                    />
                                </div>
                            )}

                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>
                                        {t(error)}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={pending}
                                    onClick={() => setMode(null)}
                                >
                                    {common("cancel")}
                                </Button>

                                <Button
                                    type="submit"
                                    variant={
                                        mode === "remove"
                                            ? "destructive"
                                            : "default"
                                    }
                                    disabled={pending}
                                >
                                    {pending
                                        ? t("processing")
                                        : common("confirm")}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
