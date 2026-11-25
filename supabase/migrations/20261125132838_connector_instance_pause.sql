
begin;

create function platform.pause_connector_instances()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'AVAILABLE'
    and new.status = 'IN_DEVELOPMENT'
  then
    update platform.instances
    set
      operation_status = 'PAUSED',
      paused_reason = 'CONNECTOR_IN_DEVELOPMENT',
      paused_at = now()
    where connector_id = new.id
      and deleted_at is null
      and operation_status = 'ACTIVE';
  end if;

  if old.deleted_at is null
    and new.deleted_at is not null
  then
    update platform.instances
    set
      operation_status = 'PAUSED',
      paused_reason = 'CONNECTOR_DELETED',
      paused_at = now(),
      status = 'UNAUTHORIZED'
    where connector_id = new.id
      and deleted_at is null;
  end if;

  return new;
end;
$$;

create trigger connector_instance_pause
after update of status, deleted_at
on platform.connectors
for each row
execute function platform.pause_connector_instances();

revoke all on function
  platform.pause_connector_instances()
from public, anon, authenticated;

commit;
