
import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  decodeCursor,
  paginate,
} from "@/lib/api/pagination";

export type ProtocolTable = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export async function listProtocolTables(
  projectId: string,
  limit = 200,
  encodedCursor?: string
) {
  const supabase = await createClient();
  const cursor = decodeCursor(encodedCursor);

  const { data, error } = await supabase.rpc(
    "list_protocol_tables",
    {
      p_project_id: projectId,
      p_limit: limit + 1,
      p_cursor_created_at: cursor?.created_at ?? null,
      p_cursor_id: cursor?.id ?? null,
    }
  );

  if (error) throw error;

  return paginate(
    (data ?? []) as ProtocolTable[],
    limit
  );
}

export async function getAllProtocolTables(
  projectId: string
) {
  const tables: ProtocolTable[] = [];
  let cursor: string | undefined;

  do {
    const result = await listProtocolTables(
      projectId,
      200,
      cursor
    );

    tables.push(...result.data);
    cursor = result.next_cursor ?? undefined;
  } while (cursor);

  return tables;
}
