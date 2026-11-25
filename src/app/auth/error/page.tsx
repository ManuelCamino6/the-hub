
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default async function AuthErrorPage() {
  const t = await getTranslations("Auth");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <div className="flex w-full max-w-sm justify-end">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {t("authenticationFailed")}
          </CardTitle>
          <CardDescription>
            {t("tryAgain")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">
              {t("backToLogin")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
