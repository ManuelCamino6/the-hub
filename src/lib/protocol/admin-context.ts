import "server-only";

import { cache } from "react";
import { redirect, notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getDatabase } from "@/lib/db";

import { z } from "zod";
import { DomainError } from "@/lib/api/domain-error";
import { getModelTable } from "./admin-service";

export const isSuperadmin = cache(
  async (userId: string): Promise<boolean> => {
    const sql = getDatabase();

    const [result] = await sql<{
      allowed: boolean;
    }[]>`
      select exists (
        select 1
        from platform.superadmins
        where user_id = ${userId}
      ) as allowed
    `;

    return result.allowed;
  }
);

export const requireSuperadminPage = cache(
  async () => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    if (!(await isSuperadmin(user.id))) {
      notFound();
    }

    return user;
  }
);


export const requireAdminModel = cache(
  async (modelId: string) => {
    const user = await requireSuperadminPage();

    if (!z.uuid().safeParse(modelId).success) {
      notFound();
    }

    try {
      const model = await getModelTable(
        user.id,
        modelId
      );

      return { user, model };
    } catch (error) {
      if (
        error instanceof DomainError &&
        error.status === 404
      ) {
        notFound();
      }

      throw error;
    }
  }
);
