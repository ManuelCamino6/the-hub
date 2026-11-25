
begin;

create function platform.handle_deleted_development()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connector record;
begin
  if old.deleted_at is null
    and new.deleted_at is not null
    and new.type = 'DEVELOPMENT'
  then
    for v_connector in
      select id
      from platform.connectors
      where project_id = new.id
        and deleted_at is null
      order by id
      for update
    loop
      update platform.connectors
      set deleted_at = new.deleted_at
      where id = v_connector.id;

      perform platform.reconcile_connector_instances(
        v_connector.id
      );

      perform platform.notify_connector_instances(
        v_connector.id,
        'CONNECTOR_DELETED'
      );
    end loop;
  end if;

  return new;
end;
$$;

create trigger development_project_deleted
after update of deleted_at
on platform.projects
for each row
execute function
  platform.handle_deleted_development();

revoke all on function
  platform.handle_deleted_development()
from public, anon, authenticated;

commit;
