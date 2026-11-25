
"use client";

import { useTranslations } from "next-intl";
import { loginWithGoogle } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function GoogleLoginButton() {
  const t = useTranslations("Auth");

  return (
    <Button
      type="submit"
      variant="outline"
      formAction={loginWithGoogle}
      formNoValidate
      className="w-full"
    >
      {t("google")}
    </Button>
  );
}
