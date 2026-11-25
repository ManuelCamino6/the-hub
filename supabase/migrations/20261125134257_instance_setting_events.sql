
begin;

create function platform.emit_instance_setting(
  p_instance_id uuid,
  p_event text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_instance platform.instances%rowtype;
  v_batch_id uuid;
  v_change_id uuid;
  v_permissions jsonb;
begin
  select *
  into strict v_instance
  from platform.instances
  where id = p_instance_id;

  select coalesce(
    jsonb_agg(to_jsonb(ep) - 'instance_id'),
    '[]'::jsonb
  )
  into v_permissions
  from platform.effective_instance_permissions ep
  where ep.instance_id = p_instance_id;

  insert into protocol.batches (
    project_id,
    instance_id,
    type,
    status,
    closed_at
  )
  values (
    v_instance.project_id,
    p_instance_id,
    'SETTING',
    'COMMITTED',
    now()
  )
  returning id into v_batch_id;

  insert into protocol.changes (
    batch_id,
    sequence,
    type,
    payload
  )
  values (
    v_batch_id,
    1,
    'SETTING',
    jsonb_build_object(
      'event', p_event,
      'instance_id', p_instance_id,
      'status', v_instance.status,
      'operation_status', v_instance.operation_status,
      'models_permissions', v_permissions
    )
  )
  returning id into v_change_id;

  insert into protocol.propagations (
    change_id,
    instance_id
  )
  values (
    v_change_id,
    p_instance_id
  );

  return v_batch_id;
end;
$$;

revoke all on function
  platform.emit_instance_setting(uuid, text)
from public, anon, authenticated;

commit;
