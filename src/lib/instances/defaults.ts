
import type {
  InstancePermission,
} from "./schemas";

export function emptyPermission(
  tableId: string
): InstancePermission {
  return {
    table_id: tableId,

    can_list: false,

    can_send_post: false,
    can_receive_post: false,
    can_receive_post_from: [],

    can_send_update: false,
    can_receive_update: false,
    can_receive_update_from: [],

    can_send_delete: false,
    can_receive_delete: false,
    can_receive_delete_from: [],
  };
}
