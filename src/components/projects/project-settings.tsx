
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  updateProjectSchema,
  type Project,
} from "@/lib/projects/schemas";

export function ProjectSettings({
  project,
}: {
  project: Project;
}) {
  const t = useTranslations("Workspace");
  const projects = useTranslations("Projects");
  const common = useTranslations("Common");
  const router = useRouter();

  const [name, setName] = useState(project.name);
  const [savedName, setSavedName] = useState(project.name);
  const [confirmation, setConfirmation] = useState("");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [message, setMessage] = useState<
    "saved" | "saveError" | null
  >(null);

  const [deleteError, setDeleteError] = useState(false);

  const endpoint = `/api/projects/${project.id}`;

  async function save(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving || deleting) return;

    const parsed = updateProjectSchema.safeParse({
      name,
    });

    if (!parsed.success) {
      setMessage("saveError");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        throw new Error("SAVE_FAILED");
      }

      setName(parsed.data.name);
      setSavedName(parsed.data.name);
      setMessage("saved");
      router.refresh();
    } catch {
      setMessage("saveError");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (
      confirmation !== savedName ||
      deleting ||
      saving
    ) return;

    setDeleting(true);
    setDeleteError(false);

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("DELETE_FAILED");
      }

      setOpen(false);
      router.replace("/projects");
      router.refresh();
    } catch {
      setDeleteError(true);
    } finally {
      setDeleting(false);
    }
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(project.id);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("general")}</CardTitle>
          <CardDescription>
            {t("settingsDescription")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={save} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                {projects("name")}
              </Label>

              <Input
                id="name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setMessage(null);
                }}
                required
                maxLength={120}
                disabled={saving || deleting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                {projects("type")}
              </Label>

              <Input
                id="type"
                value={projects(`types.${project.type}`)}
                readOnly
              />

              <p className="text-sm text-muted-foreground">
                {projects("typeImmutable")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-id">
                {t("projectId")}
              </Label>

              <div className="flex gap-2">
                <Input
                  id="project-id"
                  value={project.id}
                  readOnly
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyId}
                  aria-label={
                    copied ? t("copied") : t("copyId")
                  }
                >
                  {copied ? <Check /> : <Copy />}
                </Button>
              </div>
            </div>

            {message && (
              <Alert variant={
                message === "saveError"
                  ? "destructive"
                  : "default"
              }>
                <AlertDescription>
                  {t(message)}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  saving ||
                  deleting ||
                  !name.trim() ||
                  name.trim() === savedName
                }
              >
                {saving
                  ? t("saving")
                  : common("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dangerZone")}</CardTitle>
          <CardDescription>
            {t("deleteDescription")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <AlertDialog
            open={open}
            onOpenChange={(value) => {
              if (deleting) return;

              setOpen(value);
              setConfirmation("");
              setDeleteError(false);
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={saving}
              >
                {t("deleteProject")}
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("deleteProject")}
                </AlertDialogTitle>

                <AlertDialogDescription>
                  {project.type === "BUSINESS"
                    ? t("deleteBusinessDescription")
                    : t("deleteDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2">
                <Label htmlFor="confirmation">
                  {t("deleteConfirmation")}
                </Label>

                <p className="break-words font-medium">
                  {savedName}
                </p>

                <Input
                  id="confirmation"
                  value={confirmation}
                  onChange={(event) =>
                    setConfirmation(event.target.value)
                  }
                  disabled={deleting}
                  autoComplete="off"
                />
              </div>

              {deleteError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {t("deleteError")}
                  </AlertDescription>
                </Alert>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>
                  {common("cancel")}
                </AlertDialogCancel>

                <Button
                  variant="destructive"
                  onClick={remove}
                  disabled={
                    deleting ||
                    confirmation !== savedName
                  }
                >
                  {deleting
                    ? t("deleting")
                    : t("deleteProject")}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
