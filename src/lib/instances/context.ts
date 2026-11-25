
import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

import {
  requireBusinessProject,
} from "@/lib/projects/business-context";

import { DomainError } from "@/lib/api/domain-error";
import { getInstance } from "./service";

export const requireInstance = cache(
  async (
    projectId: string,
    instanceId: string,
    write = false
  ) => {
    const project = await requireBusinessProject(
      projectId
    );

    if (!z.uuid().safeParse(instanceId).success) {
      notFound();
    }

    const supabase = await createClient();

    const { data: { user } } =
      await supabase.auth.getUser();

    if (!user) redirect("/login");

    const instance = await getInstance(
      user.id,
      instanceId
    ).catch((error) => {
      if (
        error instanceof DomainError &&
        error.status === 404
      ) {
        notFound();
      }

      throw error;
    });

    if (instance.project_id !== projectId) {
      notFound();
    }

    const canWrite = project.role !== "VIEWER";

    if (write && !canWrite) {
      redirect(
        `/p/${projectId}/integrations/${instanceId}`
      );
    }

    return {
      project,
      instance,
      canWrite,
      userId: user.id,
    };
  }
);
