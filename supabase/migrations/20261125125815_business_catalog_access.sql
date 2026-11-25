
begin;

create function platform.connector_available_for(
  p_project_id uuid,
  p_connector_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from platform.connectors c
    join platform.projects owner_project
      on owner_project.id = c.project_id
    join platform.projects business
      on business.id = p_project_id
    where c.id = p_connector_id
      and c.deleted_at is null
      and c.status = 'AVAILABLE'
      and owner_project.deleted_at is null
      and owner_project.type = 'DEVELOPMENT'
      and business.type = 'BUSINESS'
      and business.deleted_at is null
      and (
        c.visibility = 'PUBLIC'
        or exists (
          select 1
          from platform.connectors_permissions cp
          where cp.connector_id = c.id
            and cp.project_id = business.id
        )
      )
  );
$$;

create function public.get_catalog_connector(
  p_project_id uuid,
  p_connector_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if platform.project_role_for(p_project_id) is null
    or not platform.connector_available_for(
      p_project_id,
      p_connector_id
    )
  then
    raise exception 'CONNECTOR_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  return public.get_connector(p_connector_id);
end;
$$;

revoke all on function
  platform.connector_available_for(uuid, uuid)
from public, anon, authenticated;

revoke all on function
  public.get_catalog_connector(uuid, uuid)
from public, anon, authenticated;

grant execute on function
  public.get_catalog_connector(uuid, uuid)
to authenticated;

commit;
