
import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { projectIdSchema } from "./schemas";
import { getProject } from "./service";

export const requireProject = cache(
  async (id: string) => {
    const supabase = await createClient();

    const { data: { user } } =
      await supabase.auth.getUser();

    if (!user) redirect("/login");

    if (!projectIdSchema.safeParse(id).success) {
      notFound();
    }

    const project = await getProject(id);

    if (!project) notFound();

    return project;
  }
);

export async function requireProjectAdmin(
  id: string
) {
  const project = await requireProject(id);

  if (project.role !== "ADMIN") {
    redirect(`/p/${id}`);
  }

  return project;
}
