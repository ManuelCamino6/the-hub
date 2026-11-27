begin;

create role hub_bi_reader
    nologin
    nosuperuser
    nocreatedb
    nocreaterole
    noreplication
    nobypassrls;

grant usage on schema analytics
to hub_bi_reader;

create function platform.bi_project_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
    select a.project_id

    from platform.bi_access a

    join platform.projects p
        on p.id = a.project_id

    where a.username = session_user::text
      and a.enabled
      and p.type = 'BUSINESS'
      and p.deleted_at is null
$$;

revoke all
on function platform.bi_project_id()
from public, anon, authenticated;

grant execute
on function platform.bi_project_id()
to hub_bi_reader;

commit;