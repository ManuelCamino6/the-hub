
begin;

create function public.is_project_connector(
  p_project_id uuid,
  p_connector_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    platform.project_role_for(p_project_id) is not null
    and exists (
      select 1
      from platform.connectors c
      join platform.projects p
        on p.id = c.project_id
      where c.id = p_connector_id
        and c.project_id = p_project_id
        and c.deleted_at is null
        and p.deleted_at is null
        and p.type = 'DEVELOPMENT'
    );
$$;

revoke all on function
  public.is_project_connector(uuid, uuid)
from public, anon, authenticated;

grant execute on function
  public.is_project_connector(uuid, uuid)
to authenticated;

commit;