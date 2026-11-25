
import "server-only";

import type { TransactionSql } from "postgres";

import {
  DomainError,
} from "@/lib/api/domain-error";

import type {
  ModelPermissionKey,
} from "./schemas";

type EffectivePermissions = Record<
  ModelPermissionKey,
  boolean
>;

export async function requireModelPermission(
  tx: TransactionSql,
  instanceId: string,
  tableId: string,
  permission: ModelPermissionKey
) {
  const [permissions] = await tx<
    EffectivePermissions[]
  >`
    select
      can_list,
      can_send_post,
      can_receive_post,
      can_send_update,
      can_receive_update,
      can_send_delete,
      can_receive_delete

    from platform.effective_instance_permissions

    where instance_id = ${instanceId}
      and table_id = ${tableId}
  `;

  if (
    !permissions ||
    permissions[permission] !== true
  ) {
    throw new DomainError(
      "MODEL_PERMISSION_DENIED",
      403
    );
  }

  return permissions;
}
