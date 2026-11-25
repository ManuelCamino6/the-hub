
begin;

create function platform.require_project_editor(
  p_project_id uuid,
  p_type platform.project_type
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role platform.project_role;
  v_type platform.project_type;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED'
      using errcode = '42501';
  end if;

  select p.type
  into v_type
  from platform.projects p
  where p.id = p_project_id
    and p.deleted_at is null
  for update;

  if not found then
    raise exception 'PROJECT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  v_role := platform.project_role_for(p_project_id);

  if v_role is null then
    raise exception 'PROJECT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if v_type <> p_type then
    raise exception 'INVALID_PROJECT_TYPE'
      using errcode = '22023';
  end if;

  if v_role not in ('ADMIN', 'EDITOR') then
    raise exception 'FORBIDDEN'
      using errcode = '42501';
  end if;
end;
$$;

create function platform.require_connector_editor(
  p_connector_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
begin
  select c.project_id
  into v_project_id
  from platform.connectors c
  where c.id = p_connector_id
    and c.deleted_at is null;

  if not found then
    raise exception 'CONNECTOR_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  perform platform.require_project_editor(
    v_project_id,
    'DEVELOPMENT'
  );

  perform 1
  from platform.connectors c
  where c.id = p_connector_id
    and c.deleted_at is null
  for update;

  if not found then
    raise exception 'CONNECTOR_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  return v_project_id;
end;
$$;

revoke all on function
  platform.require_project_editor(
    uuid, platform.project_type
  )
from public, anon, authenticated;

revoke all on function
  platform.require_connector_editor(uuid)
from public, anon, authenticated;

commit;
