
begin;

alter table platform.instances
add column paused_at timestamptz;

alter table platform.instances_parameters
add column encrypted boolean not null default false,
add column type platform.parameter_type not null default 'TEXT';

create function platform.recalculate_instance(
  p_instance_id uuid
)
returns platform.instance_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status platform.instance_status;
begin
  select
    case
      when c.deleted_at is not null
        or owner_project.deleted_at is not null
        or business.deleted_at is not null
        or (
          c.visibility = 'PRIVATE'
          and not exists (
            select 1
            from platform.connectors_permissions cp
            where cp.connector_id = c.id
              and cp.project_id = i.project_id
          )
        )
      then 'UNAUTHORIZED'::platform.instance_status

      when exists (
        select 1
        from platform.connectors_parameters cp
        left join platform.instances_parameters ip
          on ip.instance_id = i.id
          and ip.key = cp.key
          and ip.type = cp.type
          and ip.encrypted = cp.encrypted
        where cp.connector_id = c.id
          and cp.required
          and (
            ip.value is null
            or btrim(ip.value) = ''
          )
      )
      then 'INCOMPLETE'::platform.instance_status

      else 'OK'::platform.instance_status
    end
  into v_status
  from platform.instances i
  join platform.connectors c
    on c.id = i.connector_id
  join platform.projects owner_project
    on owner_project.id = c.project_id
  join platform.projects business
    on business.id = i.project_id
  where i.id = p_instance_id
    and i.deleted_at is null;

  if not found then
    raise exception 'INSTANCE_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  update platform.instances
  set status = v_status
  where id = p_instance_id;

  return v_status;
end;
$$;

revoke all on function
  platform.recalculate_instance(uuid)
from public, anon, authenticated;

commit;
