
import {
  permissionOperations,
  type InstancePermission,
} from "./schemas";

type RequestedPermission = {
  table_id: string;
} & Record<
  typeof permissionOperations[number],
  boolean
>;

export function validateGrantedPermissions(
  requested: RequestedPermission[],
  granted: InstancePermission[]
) {
  const requestedByTable = new Map(
    requested.map((item) => [item.table_id, item])
  );

  for (const permission of granted) {
    const definition =
      requestedByTable.get(permission.table_id);

    if (!definition) {
      throw new Error("INVALID_MODEL_PERMISSION");
    }

    for (const operation of permissionOperations) {
      if (
        permission[operation] &&
        !definition[operation]
      ) {
        throw new Error("PERMISSION_NOT_REQUESTED");
      }
    }
  }
}

export function getOriginIds(
  permissions: InstancePermission[]
) {
  return [
    ...new Set(
      permissions.flatMap((item) => [
        ...(item.can_receive_post_from ?? []),
        ...(item.can_receive_update_from ?? []),
        ...(item.can_receive_delete_from ?? []),
      ])
    ),
  ];
}
