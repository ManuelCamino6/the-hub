
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";

import {
  requireSuperadminPage,
} from "@/lib/protocol/admin-context";

async function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperadminPage();

  const t = await getTranslations("Admin");

  return (
    <SidebarProvider>
      <AdminSidebar />

      <SidebarInset>
        <header className="flex items-center gap-3 p-4">
          <SidebarTrigger />

          <Separator
            orientation="vertical"
            className="h-4"
          />

          <span>{t("title")}</span>

          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </header>

        <Separator />

        <main className="flex flex-col gap-6 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <Skeleton className="h-12 w-full" />
        </div>
      }
    >
      <AdminLayoutContent>
        {children}
      </AdminLayoutContent>
    </Suspense>
  );
}
