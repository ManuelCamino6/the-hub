create function platform.revoke_project_bi_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_username text;
begin
    update platform.bi_access
    set
        enabled = false,
        updated_at = now()
    where project_id = new.id
    returning username into v_username;

    if v_username is null then
        return new;
    end if;

    if exists (
        select 1
        from pg_catalog.pg_roles
        where rolname = v_username
    ) then
        execute pg_catalog.format(
            'alter role %I nologin password null',
            v_username
        );
    end if;

    return new;
end;
$$;

revoke all
on function platform.revoke_project_bi_access()
from public, anon, authenticated;

create trigger revoke_project_bi_access
after update of deleted_at
on platform.projects
for each row
when (
    old.deleted_at is null
    and new.deleted_at is not null
    and new.type = 'BUSINESS'
)
execute function platform.revoke_project_bi_access();