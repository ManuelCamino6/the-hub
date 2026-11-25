
begin;

-- Authorization helper

create function platform.project_role_for(
  p_project_id uuid
)
returns platform.project_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from platform.users_per_project m
  join platform.projects p
    on p.id = m.project_id
  where m.project_id = p_project_id
    and m.user_id = auth.uid()
    and p.deleted_at is null;
$$;

revoke all on function platform.project_role_for(uuid)
  from public, anon, authenticated;

grant execute on function platform.project_role_for(uuid)
  to authenticated;

-- Read-only access

grant select (
  id,
  name,
  type,
  image_path,
  created_at,
  deleted_at
)
on platform.projects to authenticated;

grant select on platform.users_per_project
  to authenticated;

create policy projects_select_member
  on platform.projects
  for select
  to authenticated
  using (
    deleted_at is null
    and platform.project_role_for(id) is not null
  );

create policy memberships_select_own
  on platform.users_per_project
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and platform.project_role_for(project_id) is not null
  );

-- Immutable project type

create function platform.prevent_project_type_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.type is distinct from old.type then
    raise exception 'PROJECT_TYPE_IMMUTABLE';
  end if;

  return new;
end;
$$;

create trigger projects_immutable_type
  before update on platform.projects
  for each row
  execute function platform.prevent_project_type_change();

-- Atomic project creation

create function public.create_project(
  p_name text,
  p_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_project_id uuid;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED'
      using errcode = '42501';
  end if;

  if p_name is null
    or char_length(btrim(p_name)) not between 1 and 120
  then
    raise exception 'INVALID_PROJECT_NAME'
      using errcode = '22023';
  end if;

  if p_type is null
    or p_type not in ('BUSINESS', 'DEVELOPMENT')
  then
    raise exception 'INVALID_PROJECT_TYPE'
      using errcode = '22023';
  end if;

  insert into platform.projects (name, type)
  values (
    btrim(p_name),
    p_type::platform.project_type
  )
  returning id into v_project_id;

  insert into platform.users_per_project (
    project_id,
    user_id,
    role
  )
  values (
    v_project_id,
    v_user_id,
    'ADMIN'
  );

  return v_project_id;
end;
$$;

revoke all on function public.create_project(text, text)
  from public, anon, authenticated;

grant execute on function public.create_project(text, text)
  to authenticated;

-- Project listing

create function public.list_projects(
  p_name text default null,
  p_type text default null,
  p_limit integer default 50,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
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
    null::text as image_url,
    m.role::text,
    p.created_at
  from platform.projects p
  join platform.users_per_project m
    on m.project_id = p.id
  where m.user_id = auth.uid()
    and p.deleted_at is null
    and (
      p_name is null
      or strpos(lower(p.name), lower(p_name)) > 0
    )
    and (
      p_type is null
      or p.type::text = p_type
    )
    and (
      (
        p_cursor_created_at is null
        and p_cursor_id is null
      )
      or (
        (p.created_at, p.id)
          < (p_cursor_created_at, p_cursor_id)
      )
    )
  order by p.created_at desc, p.id desc
  limit least(
    greatest(coalesce(p_limit, 50), 1),
    201
  );
$$;

revoke all on function public.list_projects(
  text, text, integer, timestamptz, uuid
) from public, anon, authenticated;

grant execute on function public.list_projects(
  text, text, integer, timestamptz, uuid
) to authenticated;

commit;