
begin;

create extension if not exists pgcrypto
with schema extensions;

create function platform.generate_connector_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'hub_' ||
    encode(extensions.gen_random_bytes(32), 'hex');
$$;

create function platform.hash_connector_token(
  p_token text
)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select encode(
    extensions.digest(p_token, 'sha256'),
    'hex'
  );
$$;

create function public.create_connector(
  p_project_id uuid,
  p_name text,
  p_description text,
  p_parameters jsonb,
  p_models_permissions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_token text;
begin
  perform platform.require_project_editor(
    p_project_id,
    'DEVELOPMENT'
  );

  if p_name is null
    or char_length(btrim(p_name)) not between 1 and 120
    or char_length(coalesce(p_description, '')) > 2000
  then
    raise exception 'INVALID_CONNECTOR'
      using errcode = '22023';
  end if;

  if p_parameters is null
    or jsonb_typeof(p_parameters) <> 'array'
    or p_models_permissions is null
    or jsonb_typeof(p_models_permissions) <> 'array'
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

  if exists (
    select 1
    from jsonb_array_elements(
      p_models_permissions
    ) item
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
    from jsonb_array_elements(
      p_models_permissions
    ) item
    group by item ->> 'table_id'
    having count(*) > 1
  ) then
    raise exception 'DUPLICATE_MODEL'
      using errcode = '22023';
  end if;

  v_token := platform.generate_connector_token();

  insert into platform.connectors (
    project_id,
    name,
    description,
    token_hash,
    token_prefix
  )
  values (
    p_project_id,
    btrim(p_name),
    nullif(btrim(p_description), ''),
    platform.hash_connector_token(v_token),
    left(v_token, 12)
  )
  returning id into v_id;

  insert into platform.connectors_parameters (
    connector_id,
    key,
    type,
    required,
    encrypted
  )
  select
    v_id,
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
    v_id,
    p.table_id,
    coalesce(p.can_list, false),
    coalesce(p.can_send_post, false),
    coalesce(p.can_receive_post, false),
    coalesce(p.can_send_update, false),
    coalesce(p.can_receive_update, false),
    coalesce(p.can_send_delete, false),
    coalesce(p.can_receive_delete, false)
  from jsonb_to_recordset(
    p_models_permissions
  ) as p(
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
    'id', v_id,
    'token', v_token
  );
end;
$$;

create function public.rotate_connector_token(
  p_connector_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  perform platform.require_connector_editor(
    p_connector_id
  );

  v_token := platform.generate_connector_token();

  update platform.connectors
  set
    token_hash = platform.hash_connector_token(v_token),
    token_prefix = left(v_token, 12)
  where id = p_connector_id;

  return jsonb_build_object(
    'token', v_token
  );
end;
$$;

revoke all on function
  platform.generate_connector_token()
from public, anon, authenticated;

revoke all on function
  platform.hash_connector_token(text)
from public, anon, authenticated;

revoke all on function
  public.create_connector(
    uuid, text, text, jsonb, jsonb
  )
from public, anon, authenticated;

revoke all on function
  public.rotate_connector_token(uuid)
from public, anon, authenticated;

grant execute on function
  public.create_connector(
    uuid, text, text, jsonb, jsonb
  )
to authenticated;

grant execute on function
  public.rotate_connector_token(uuid)
to authenticated;

commit;
