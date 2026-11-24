
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}

async function DashboardContent() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">The Hub</h1>

        <form action={logout}>
          <Button variant="outline" type="submit">
            Logout
          </Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            Welcome, {user.user_metadata.name || user.email}
          </CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <header className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-20" />
      </header>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
      </Card>
    </>
  );
}
