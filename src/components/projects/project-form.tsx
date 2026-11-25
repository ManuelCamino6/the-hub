
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  createProjectSchema,
  projectTypes,
} from "@/lib/projects/schemas";

export function ProjectForm() {
  const t = useTranslations("Projects");
  const common = useTranslations("Common");
  const router = useRouter();

  const [type, setType] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<
    "validationError" |
    "sessionExpired" |
    "createError" |
    null
  >(null);

  async function onSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (pending) return;

    setError(null);

    const formData = new FormData(
      event.currentTarget
    );

    const parsed = createProjectSchema.safeParse({
      name: formData.get("name"),
      type,
    });

    if (!parsed.success) {
      setError("validationError");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      if (response.status === 401) {
        setError("sessionExpired");
        return;
      }

      if (!response.ok) {
        setError(
          response.status === 422
            ? "validationError"
            : "createError"
        );
        return;
      }

      router.push("/projects");
      router.refresh();
    } catch {
      setError("createError");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset
        disabled={pending}
        className="space-y-6"
      >
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input
            id="name"
            name="name"
            placeholder={t("namePlaceholder")}
            required
            maxLength={120}
          />
        </div>

        <div className="space-y-3">
          <Label id="project-type-label">
            {t("type")}
          </Label>

          <RadioGroup
            aria-labelledby="project-type-label"
            value={type}
            onValueChange={setType}
            className="gap-3"
          >
            {projectTypes.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-md border p-4"
              >
                <RadioGroupItem
                  id={item}
                  value={item}
                />

                <div className="space-y-1">
                  <Label htmlFor={item}>
                    {t(`types.${item}`)}
                  </Label>

                  <p className="text-sm text-muted-foreground">
                    {t(`typeDescriptions.${item}`)}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>

          <p className="text-sm text-muted-foreground">
            {t("typeImmutable")}
          </p>
        </div>
      </fieldset>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {t(error)}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push("/projects")}
        >
          {common("cancel")}
        </Button>

        <Button type="submit" disabled={pending}>
          {pending ? t("creating") : t("create")}
        </Button>
      </div>
    </form>
  );
}
