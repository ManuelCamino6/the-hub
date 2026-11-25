
begin;

create function public.update_connector(
  p_connector_id uuid,
  p_name text,
  p_description text,
  p_status text,
  p_parameters jsonb,
  p_models_permissions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status platform.connector_status;
begin
  perform platform.require_connector_editor(
    p_connector_id
  );

  select c.status
  into v_status
  from platform.connectors c
  where c.id = p_connector_id;

  if p_status is null
    or p_status not in (
      'IN_DEVELOPMENT',
      'AVAILABLE',
      'DEPRECATED'
    )
  then
    raise exception 'INVALID_STATUS'
      using errcode = '22023';
  end if;

  if v_status = 'DEPRECATED'
    and p_status <> 'DEPRECATED'
  then
    raise exception 'INVALID_STATUS_TRANSITION'
      using errcode = '22023';
  end if;

  if p_name is null
    or char_length(btrim(p_name)) not between 1 and 120
    or char_length(coalesce(p_description, '')) > 2000
  then
    raise exception 'INVALID_CONNECTOR'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_parameters)
      is distinct from 'array'
    or jsonb_typeof(p_models_permissions)
      is distinct from 'array'
  then
    raise exception 'INVALID_DEFINITION'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_parameters) > 100
    or jsonb_array_length(p_models_permissions) > 200
  then
    raise exception 'INVALID_DEFINITION'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_parameters) item
    where item ->> 'key' is null
      or item ->> 'key' !~ '^[a-z][a-z0-9_]{0,62}$'
      or item ->> 'type' is null
      or item ->> 'type' not in (
        'TEXT', 'NUMBER', 'DATE', 'BOOLEAN'
      )
      or jsonb_typeof(item -> 'required')
        is distinct from 'boolean'
      or jsonb_typeof(item -> 'encrypted')
        is distinct from 'boolean'
  ) then
    raise exception 'INVALID_PARAMETER'
      using errcode = '22023';
  end if;

  if exists (
    select item ->> 'key'
    from jsonb_array_elements(p_parameters) item
    group by item ->> 'key'
    having count(*) > 1
  ) then
    raise exception 'DUPLICATE_PARAMETER'
      using errcode = '22023';
  end if;

  perform platform.validate_model_permissions(
    p_models_permissions
  );

  if exists (
    select 1
    from jsonb_array_elements(p_models_permissions) item
    where not exists (
      select 1
      from protocol.tables t
      join protocol.versions v
        on v.id = t.version_id
      where t.id::text = item ->> 'table_id'
        and t.deleted_at is null
        and v.active = true
    )
  ) then
    raise exception 'INVALID_MODEL'
      using errcode = '22023';
  end if;

  if exists (
    select item ->> 'table_id'
    from jsonb_array_elements(p_models_permissions) item
    group by item ->> 'table_id'
    having count(*) > 1
  ) then
    raise exception 'DUPLICATE_MODEL'
      using errcode = '22023';
  end if;

  update platform.connectors
  set
    name = btrim(p_name),
    description = nullif(btrim(p_description), ''),
    status = p_status::platform.connector_status
  where id = p_connector_id;

  delete from platform.connectors_parameters
  where connector_id = p_connector_id;

  insert into platform.connectors_parameters (
    connector_id, key, type, required, encrypted
  )
  select
    p_connector_id,
    p.key,
    p.type::platform.parameter_type,
    p.required,
    p.encrypted
  from jsonb_to_recordset(p_parameters) as p(
    key text,
    type text,
    required boolean,
    encrypted boolean
  );

  delete from platform.connectors_models_permissions
  where connector_id = p_connector_id;

  insert into platform.connectors_models_permissions (
    connector_id,
    table_id,
    can_list,
    can_send_post,
    can_receive_post,
    can_send_update,
    can_receive_update,
    can_send_delete,
    can_receive_delete
  )
  select
    p_connector_id,
    p.table_id,
    p.can_list,
    p.can_send_post,
    p.can_receive_post,
    p.can_send_update,
    p.can_receive_update,
    p.can_send_delete,
    p.can_receive_delete
  from jsonb_to_recordset(p_models_permissions) as p(
    table_id uuid,
    can_list boolean,
    can_send_post boolean,
    can_receive_post boolean,
    can_send_update boolean,
    can_receive_update boolean,
    can_send_delete boolean,
    can_receive_delete boolean
  );

  return jsonb_build_object(
    'id', p_connector_id,
    'affected_instances', 0
  );
end;
$$;

create function public.delete_connector(
  p_connector_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform platform.require_connector_editor(
    p_connector_id
  );

  update platform.connectors
  set deleted_at = now()
  where id = p_connector_id;

  return jsonb_build_object(
    'id', p_connector_id
  );
end;
$$;

revoke all on function public.update_connector(
  uuid, text, text, text, jsonb, jsonb
) from public, anon, authenticated;

revoke all on function public.delete_connector(uuid)
from public, anon, authenticated;

grant execute on function public.update_connector(
  uuid, text, text, text, jsonb, jsonb
) to authenticated;

grant execute on function public.delete_connector(uuid)
to authenticated;

commit;
