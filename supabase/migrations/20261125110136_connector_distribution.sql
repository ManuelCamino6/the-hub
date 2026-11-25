
begin;

create function public.get_connector_distribution(
  p_connector_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_connector platform.connectors%rowtype;
begin
  select c.*
  into v_connector
  from platform.connectors c
  where c.id = p_connector_id
    and c.deleted_at is null;

  if not found or platform.project_role_for(
    v_connector.project_id
  ) is null then
    raise exception 'CONNECTOR_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'visibility', v_connector.visibility,
    'project_ids', coalesce((
      select jsonb_agg(p.project_id order by p.project_id)
      from platform.connectors_permissions p
      where p.connector_id = p_connector_id
    ), '[]'::jsonb)
  );
end;
$$;

create function public.update_connector_distribution(
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

  return jsonb_build_object(
    'id', p_connector_id,
    'visibility', p_visibility,
    'project_ids', to_jsonb(p_project_ids)
  );
end;
$$;

revoke all on function
  public.get_connector_distribution(uuid)
from public, anon, authenticated;

revoke all on function
  public.update_connector_distribution(uuid, text, uuid[])
from public, anon, authenticated;

grant execute on function
  public.get_connector_distribution(uuid)
to authenticated;

grant execute on function
  public.update_connector_distribution(uuid, text, uuid[])
to authenticated;

commit;
