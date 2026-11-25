
begin;

create function platform.reconcile_connector_instances(
  p_connector_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_instance record;
  v_count integer := 0;
begin
  -- Eliminar valores cuya definición dejó de ser compatible.
  delete from platform.instances_parameters ip
  using platform.instances i
  where i.id = ip.instance_id
    and i.connector_id = p_connector_id
    and i.deleted_at is null
    and not exists (
      select 1
      from platform.connectors_parameters cp
      where cp.connector_id = p_connector_id
        and cp.key = ip.key
        and cp.type = ip.type
        and cp.encrypted = ip.encrypted
    );

  -- Revocar permisos que ya no solicita el conector.
  update platform.instances_models_permissions ip
  set
    can_list = ip.can_list and cp.can_list,
    can_send_post =
      ip.can_send_post and cp.can_send_post,
    can_receive_post =
      ip.can_receive_post and cp.can_receive_post,
    can_send_update =
      ip.can_send_update and cp.can_send_update,
    can_receive_update =
      ip.can_receive_update and cp.can_receive_update,
    can_send_delete =
      ip.can_send_delete and cp.can_send_delete,
    can_receive_delete =
      ip.can_receive_delete and cp.can_receive_delete
  from platform.instances i
  join platform.connectors_models_permissions cp
    on cp.connector_id = i.connector_id
  where ip.instance_id = i.id
    and ip.table_id = cp.table_id
    and i.connector_id = p_connector_id
    and i.deleted_at is null;

  delete from platform.instances_models_permissions ip
  using platform.instances i
  where i.id = ip.instance_id
    and i.connector_id = p_connector_id
    and i.deleted_at is null
    and not exists (
      select 1
      from platform.connectors_models_permissions cp
      where cp.connector_id = p_connector_id
        and cp.table_id = ip.table_id
    );

  for v_instance in
    select i.id
    from platform.instances i
    where i.connector_id = p_connector_id
      and i.deleted_at is null
    order by i.id
    for update
  loop
    perform platform.recalculate_instance(v_instance.id);

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function
  platform.reconcile_connector_instances(uuid)
from public, anon, authenticated;

commit;
