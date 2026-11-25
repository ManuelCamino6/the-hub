
begin;

create function public.get_connector(
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
  join platform.projects p
    on p.id = c.project_id
  where c.id = p_connector_id
    and c.deleted_at is null
    and p.deleted_at is null;

  if not found then
    raise exception 'CONNECTOR_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if platform.project_role_for(
    v_connector.project_id
  ) is null then

    if not exists (
      select 1
      from platform.users_per_project m
      join platform.projects p
        on p.id = m.project_id
      where m.user_id = auth.uid()
        and p.type = 'BUSINESS'
        and p.deleted_at is null
        and v_connector.status = 'AVAILABLE'
        and (
          v_connector.visibility = 'PUBLIC'
          or exists (
            select 1
            from platform.connectors_permissions cp
            where cp.connector_id = p_connector_id
              and cp.project_id = p.id
          )
        )
    ) then
      raise exception 'CONNECTOR_NOT_FOUND'
        using errcode = 'P0002';
    end if;

  end if;

  return jsonb_build_object(
    'id', v_connector.id,
    'name', v_connector.name,
    'description', v_connector.description,
    'image_url', null,
    'status', v_connector.status,
    'visibility', v_connector.visibility,
    'created_at', v_connector.created_at,

    'parameters', coalesce((
      select jsonb_agg(
        to_jsonb(p) - 'connector_id'
        order by p.key
      )
      from platform.connectors_parameters p
      where p.connector_id = p_connector_id
    ), '[]'::jsonb),

    'models_permissions', coalesce((
      select jsonb_agg(
        to_jsonb(m) - 'connector_id'
        order by m.table_id
      )
      from platform.connectors_models_permissions m
      where m.connector_id = p_connector_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_connector(uuid)
from public, anon, authenticated;

grant execute on function public.get_connector(uuid)
to authenticated;

commit;
