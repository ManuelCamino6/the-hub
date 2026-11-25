
begin;

create function public.list_connectors(
  p_project_id uuid,
  p_name text default null,
  p_status text default null,
  p_visibility text default null,
  p_limit integer default 51,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  id uuid,
  name text,
  description text,
  image_url text,
  status text,
  visibility text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_type platform.project_type;
begin
  if platform.project_role_for(p_project_id) is null then
    raise exception 'PROJECT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select p.type
  into v_type
  from platform.projects p
  where p.id = p_project_id
    and p.deleted_at is null;

  return query
  select
    c.id,
    c.name::text,
    c.description,
    null::text,
    c.status::text,
    c.visibility::text,
    c.created_at
  from platform.connectors c
  join platform.projects owner
    on owner.id = c.project_id
  where c.deleted_at is null
    and owner.deleted_at is null
    and (
      (
        v_type = 'DEVELOPMENT'
        and c.project_id = p_project_id
        and (
          p_status is null
          or c.status::text = p_status
        )
        and (
          p_visibility is null
          or c.visibility::text = p_visibility
        )
      )
      or (
        v_type = 'BUSINESS'
        and c.status = 'AVAILABLE'
        and (
          c.visibility = 'PUBLIC'
          or exists (
            select 1
            from platform.connectors_permissions cp
            where cp.connector_id = c.id
              and cp.project_id = p_project_id
          )
        )
      )
    )
    and (
      p_name is null
      or strpos(lower(c.name), lower(p_name)) > 0
    )
    and (
      (
        p_cursor_created_at is null
        and p_cursor_id is null
      )
      or (
        (c.created_at, c.id)
        < (p_cursor_created_at, p_cursor_id)
      )
    )
  order by c.created_at desc, c.id desc
  limit least(greatest(coalesce(p_limit, 51), 1), 201);
end;
$$;

create function public.list_protocol_tables(
  p_project_id uuid,
  p_limit integer default 51,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  id uuid,
  name text,
  description text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if platform.project_role_for(p_project_id) is null then
    raise exception 'PROJECT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  return query
  select
    t.id,
    t.name::text,
    t.description,
    t.created_at
  from protocol.tables t
  join protocol.versions v
    on v.id = t.version_id
  where v.active = true
    and t.deleted_at is null
    and (
      (
        p_cursor_created_at is null
        and p_cursor_id is null
      )
      or (
        (t.created_at, t.id)
        < (p_cursor_created_at, p_cursor_id)
      )
    )
  order by t.created_at desc, t.id desc
  limit least(greatest(coalesce(p_limit, 51), 1), 201);
end;
$$;

revoke all on function public.list_connectors(
  uuid, text, text, text, integer, timestamptz, uuid
) from public, anon, authenticated;

revoke all on function public.list_protocol_tables(
  uuid, integer, timestamptz, uuid
) from public, anon, authenticated;

grant execute on function public.list_connectors(
  uuid, text, text, text, integer, timestamptz, uuid
) to authenticated;

grant execute on function public.list_protocol_tables(
  uuid, integer, timestamptz, uuid
) to authenticated;

commit;
