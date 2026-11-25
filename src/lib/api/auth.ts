
import "server-only";

import { createClient } from "@/lib/supabase/server";
import { apiError } from "./response";

export async function requireApiUser() {
  const supabase = await createClient();

  const { data: { user } } =
    await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: apiError(
        "UNAUTHENTICATED",
        "Authentication required.",
        401
      ),
    };
  }

  return {
    ok: true as const,
    user,
    supabase,
  };
}
