begin;

create or replace function platform.emit_instance_setting(
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
  v_parameters jsonb;
begin

  select *
  into strict v_instance

  from platform.instances

  where id = p_instance_id;

  select coalesce(
    jsonb_agg(
      to_jsonb(ep) - 'instance_id'
      order by ep.table_id
    ),
    '[]'::jsonb
  )

  into v_permissions

  from platform.effective_instance_permissions ep

  where ep.instance_id = p_instance_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', cp.key,
        'type', cp.type,
        'required', cp.required,
        'encrypted', cp.encrypted,
        'configured', ip.value is not null
      )
      order by cp.key
    ),
    '[]'::jsonb
  )

  into v_parameters

  from platform.connectors_parameters cp

  left join platform.instances_parameters ip
    on ip.instance_id = p_instance_id
    and ip.key = cp.key
    and ip.type = cp.type
    and ip.encrypted = cp.encrypted

  where cp.connector_id =
    v_instance.connector_id;

  insert into protocol.batches (
    project_id,
    instance_id,
    type,
    status,
    closed_at
  )

  values (
    v_instance.project_id,
    v_instance.id,
    'SETTING',
    'COMMITTED',
    clock_timestamp()
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
      'instance_id', v_instance.id,
      'status', v_instance.status,
      'operation_status',
        v_instance.operation_status,
      'paused_reason',
        v_instance.paused_reason,
      'parameters', v_parameters,
      'models_permissions', v_permissions
    )
  )

  returning id into v_change_id;

  insert into protocol.propagations (
    change_id,
    instance_id,
    status
  )

  values (
    v_change_id,
    v_instance.id,
    'PENDING'
  );

  return v_batch_id;

end;
$$;

revoke all on function
platform.emit_instance_setting(uuid, text)
from public, anon, authenticated;

commit;