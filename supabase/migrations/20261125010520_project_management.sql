
begin;

-- Read project

create function public.get_project(
  p_project_id uuid
)
returns table (
  id uuid,
  name text,
  type text,
  image_url text,
  role text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.name::text,
    p.type::text,
    null::text,
    m.role::text,
    p.created_at
  from platform.projects p
  join platform.users_per_project m
    on m.project_id = p.id
  where p.id = p_project_id
    and m.user_id = auth.uid()
    and p.deleted_at is null;
$$;

-- Reusable authorization and project lock

create function platform.require_project_admin(
  p_project_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role platform.project_role;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED'
      using errcode = '42501';
  end if;

  perform 1
  from platform.projects
  where id = p_project_id
    and deleted_at is null
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

  if v_role <> 'ADMIN' then
    raise exception 'FORBIDDEN'
      using errcode = '42501';
  end if;
end;
$$;

-- Update project

create function public.update_project(
  p_project_id uuid,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform platform.require_project_admin(
    p_project_id
  );

  if p_name is null
    or char_length(btrim(p_name)) not between 1 and 120
  then
    raise exception 'INVALID_PROJECT_NAME'
      using errcode = '22023';
  end if;

  update platform.projects
  set name = btrim(p_name)
  where id = p_project_id;

  return p_project_id;
end;
$$;

-- Soft delete

create function public.delete_project(
  p_project_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform platform.require_project_admin(
    p_project_id
  );

  update platform.projects
  set deleted_at = now()
  where id = p_project_id;

  return p_project_id;
end;
$$;

-- Function permissions

revoke all on function
  platform.require_project_admin(uuid)
  from public, anon, authenticated;

revoke all on function
  public.get_project(uuid)
  from public, anon, authenticated;

revoke all on function
  public.update_project(uuid, text)
  from public, anon, authenticated;

revoke all on function
  public.delete_project(uuid)
  from public, anon, authenticated;

grant execute on function
  public.get_project(uuid)
  to authenticated;

grant execute on function
  public.update_project(uuid, text)
  to authenticated;

grant execute on function
  public.delete_project(uuid)
  to authenticated;

commit;
