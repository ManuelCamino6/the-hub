import "server-only";

import { cache } from "react";

import { redirect } from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  requireBusinessProject,
} from "@/lib/projects/business-context";

export const requireBillingContext = cache(
  async (projectId: string) => {
    const project =
      await requireBusinessProject(projectId);

    const supabase =
      await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    return {
      project,
      userId: user.id,
      isAdmin: project.role === "ADMIN",
    };
  }
);