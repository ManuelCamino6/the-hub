
begin;

create function platform.notify_connector_instances(
  p_connector_id uuid,
  p_event text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_instance record;
begin
  for v_instance in
    select
      i.id,
      i.project_id,
      i.name
    from platform.instances i
    join platform.projects p
      on p.id = i.project_id
    where i.connector_id = p_connector_id
      and i.deleted_at is null
      and p.deleted_at is null
    order by i.id
  loop
    perform platform.emit_instance_setting(
      v_instance.id,
      p_event
    );

    insert into platform.news (
      project_id,
      title,
      content
    )
    values (
      v_instance.project_id,
      p_event,
      v_instance.name
    );
  end loop;
end;
$$;

revoke all on function
  platform.notify_connector_instances(uuid, text)
from public, anon, authenticated;

commit;
