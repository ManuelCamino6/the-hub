
begin;

create or replace view
  platform.effective_instance_permissions
with (security_invoker = true)
as
select
  i.id as instance_id,
  cp.table_id,

  cp.can_list
    and coalesce(ip.can_list, false)
    as can_list,

  cp.can_send_post
    and coalesce(ip.can_send_post, false)
    as can_send_post,

  cp.can_receive_post
    and coalesce(ip.can_receive_post, false)
    as can_receive_post,

  ip.can_receive_post_from,

  cp.can_send_update
    and coalesce(ip.can_send_update, false)
    as can_send_update,

  cp.can_receive_update
    and coalesce(ip.can_receive_update, false)
    as can_receive_update,
    
  ip.can_receive_update_from,

  cp.can_send_delete
    and coalesce(ip.can_send_delete, false)
    as can_send_delete,

  cp.can_receive_delete
    and coalesce(ip.can_receive_delete, false)
    as can_receive_delete,

  ip.can_receive_delete_from

from platform.instances i

join platform.connectors_models_permissions cp
  on cp.connector_id = i.connector_id

join protocol.tables t
  on t.id = cp.table_id
  and t.deleted_at is null

join protocol.versions v
  on v.id = t.version_id
  and v.active

left join platform.instances_models_permissions ip
  on ip.instance_id = i.id
  and ip.table_id = cp.table_id

where i.deleted_at is null;

revoke all on
  platform.effective_instance_permissions
from public, anon, authenticated;

commit;
