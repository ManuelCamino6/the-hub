
begin;

create function platform.validate_model_permissions(
  p_permissions jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if jsonb_typeof(p_permissions)
    is distinct from 'array'
  then
    raise exception 'INVALID_PERMISSIONS'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_permissions) item
    cross join unnest(array[
      'can_list',
      'can_send_post',
      'can_receive_post',
      'can_send_update',
      'can_receive_update',
      'can_send_delete',
      'can_receive_delete'
    ]) as permission(key)
    where jsonb_typeof(item -> permission.key)
      is distinct from 'boolean'
  ) then
    raise exception 'INVALID_PERMISSIONS'
      using errcode = '22023';
  end if;
end;
$$;

alter function public.create_connector(
  uuid, text, text, jsonb, jsonb
) set schema platform;

revoke all on function platform.create_connector(
  uuid, text, text, jsonb, jsonb
) from public, anon, authenticated;

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
begin
  perform platform.require_project_editor(
    p_project_id,
    'DEVELOPMENT'
  );

  perform platform.validate_model_permissions(
    p_models_permissions
  );

  return platform.create_connector(
    p_project_id,
    p_name,
    p_description,
    p_parameters,
    p_models_permissions
  );
end;
$$;

revoke all on function
  platform.validate_model_permissions(jsonb)
from public, anon, authenticated;

revoke all on function public.create_connector(
  uuid, text, text, jsonb, jsonb
) from public, anon, authenticated;

grant execute on function public.create_connector(
  uuid, text, text, jsonb, jsonb
) to authenticated;

commit;
