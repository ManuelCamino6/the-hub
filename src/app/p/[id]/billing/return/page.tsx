import { Suspense } from "react";

import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  getTranslations,
} from "next-intl/server";

import {
  requireBusinessProject,
} from "@/lib/projects/business-context";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  getSubscription,
} from "@/lib/billing/subscription-service";

import {
  RefreshStatusButton,
} from "@/components/billing/refresh-status-button";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Skeleton,
} from "@/components/ui/skeleton";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

async function BillingReturnContent({
  params,
}: Props) {
  const { id } = await params;

  const project =
    await requireBusinessProject(id);

  if (project.role !== "ADMIN") {
    redirect(`/p/${id}`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const subscription =
    await getSubscription(
      user.id,
      id
    );

  const t =
    await getTranslations("Billing");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("returnTitle")}
        </CardTitle>

        <CardDescription>
          {t("returnDescription")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {t("status")}

          <Badge variant="secondary">
            {t(
              `statuses.${subscription.status}`
            )}
          </Badge>
        </div>

        {!subscription.operational && (
          <Alert>
            <AlertDescription>
              {t("returnPending")}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <RefreshStatusButton />

        <Button variant="ghost" asChild>
          <Link href={`/p/${id}`}>
            {t("back")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function BillingReturnPage(
  props: Props
) {
  return (
    <Suspense
      fallback={
        <Skeleton className="h-48 w-full" />
      }
    >
      <BillingReturnContent {...props} />
    </Suspense>
  );
}