begin;

create or replace function public.update_connector(
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
  v_affected_instances integer;
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

  v_affected_instances :=
  platform.reconcile_connector_instances(
    p_connector_id
  );

  perform platform.notify_connector_instances(
    p_connector_id,
    'CONNECTOR_UPDATED'
  );

  return jsonb_build_object(
    'id', p_connector_id,
    'affected_instances', v_affected_instances
  );
end;
$$;

create or replace function public.update_connector_distribution(
  p_connector_id uuid,
  p_visibility text,
  p_project_ids uuid[]
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

  if p_visibility is null
    or p_visibility not in ('PUBLIC', 'PRIVATE')
    or p_project_ids is null
    or cardinality(p_project_ids) > 200
  then
    raise exception 'INVALID_DISTRIBUTION'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_project_ids) as item(id)
    where not exists (
      select 1
      from platform.projects p
      where p.id = item.id
        and p.type = 'BUSINESS'
        and p.deleted_at is null
    )
  ) then
    raise exception 'INVALID_BUSINESS_PROJECT'
      using errcode = '22023';
  end if;

  if (
    select count(distinct item.id)
    from unnest(p_project_ids) as item(id)
  ) <> cardinality(p_project_ids) then
    raise exception 'DUPLICATE_PROJECT'
      using errcode = '22023';
  end if;

  update platform.connectors
  set visibility =
    p_visibility::platform.connector_visibility
  where id = p_connector_id;

  delete from platform.connectors_permissions
  where connector_id = p_connector_id;

  insert into platform.connectors_permissions (
    connector_id,
    project_id
  )
  select p_connector_id, item.id
  from unnest(p_project_ids) as item(id);

  perform platform.reconcile_connector_instances(
    p_connector_id
  );

  perform platform.notify_connector_instances(
    p_connector_id,
    'CONNECTOR_DISTRIBUTION_UPDATED'
  );

  return jsonb_build_object(
    'id', p_connector_id,
    'visibility', p_visibility,
    'project_ids', to_jsonb(p_project_ids)
  );
end;
$$;

create or replace function public.delete_connector(
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

  perform platform.reconcile_connector_instances(
    p_connector_id
  );

  perform platform.notify_connector_instances(
    p_connector_id,
    'CONNECTOR_DELETED'
  );

  return jsonb_build_object(
    'id', p_connector_id
  );
end;
$$;

commit;