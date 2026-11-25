
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { requireProject } from "@/lib/projects/context";
import { logout } from "@/lib/auth/actions";

import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default function ProjectLayout(props: Props) {
  return (
    <Suspense fallback={
      <Skeleton className="h-screen w-full" />
    }>
      <ProjectLayoutContent {...props} />
    </Suspense>
  );
}

async function ProjectLayoutContent({
  children,
  params,
}: Props) {
  const { id } = await params;
  const project = await requireProject(id);

  const t = await getTranslations("Projects");
  const auth = await getTranslations("Auth");

  return (
    <SidebarProvider>
      <ProjectSidebar project={project} />

      <SidebarInset>
        <header className="flex h-16 items-center gap-3 border-b px-4">
          <SidebarTrigger />

          <span className="min-w-0 flex-1 truncate font-medium">
            {project.name}
          </span>

          <Badge
            variant="secondary"
            className="hidden sm:inline-flex"
          >
            {t(`roles.${project.role}`)}
          </Badge>

          <LanguageSwitcher />

          <form action={logout}>
            <Button type="submit" variant="outline">
              {auth("logout")}
            </Button>
          </form>
        </header>

        <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}