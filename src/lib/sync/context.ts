import "server-only";

import { cache } from "react";

import {
  redirect,
  notFound,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  requireBusinessProject,
} from "@/lib/projects/business-context";

import {
  DomainError,
} from "@/lib/api/domain-error";

import {
  requireDevelopmentProject,
} from "@/lib/connectors/context";

export const requireBusinessSyncContext =
  cache(async (projectId: string) => {
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
    };
  });

export function handleSyncPageError(
  error: unknown
): never {
  if (
    error instanceof DomainError &&
    error.status === 404
  ) {
    notFound();
  }

  throw error;
}

export const requireDevelopmentSyncContext =
  cache(async (projectId: string) => {
    const project =
      await requireDevelopmentProject(projectId);

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
    };
  });