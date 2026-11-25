
begin;

create function public.claim_project_invitations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_project_id uuid;
  v_count integer := 0;
  v_affected integer;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED'
      using errcode = '42501';
  end if;

  select lower(btrim(u.email))
  into v_email
  from auth.users u
  where u.id = v_user_id
    and u.email_confirmed_at is not null;

  if v_email is null then
    return 0;
  end if;

  for v_project_id in
    select i.project_id
    from platform.pending_invitations i
    where i.email_normalized = v_email
      and i.linked_at is null
    order by i.project_id
  loop
    perform 1
    from platform.projects p
    where p.id = v_project_id
      and p.deleted_at is null
    for update;

    if not found then
      continue;
    end if;

    insert into platform.users_per_project (
      project_id,
      user_id,
      role
    )
    select
      i.project_id,
      v_user_id,
      i.role
    from platform.pending_invitations i
    where i.project_id = v_project_id
      and i.email_normalized = v_email
      and i.linked_at is null
    on conflict (project_id, user_id)
    do nothing;

    update platform.pending_invitations
    set linked_at = now()
    where project_id = v_project_id
      and email_normalized = v_email
      and linked_at is null;

    get diagnostics v_affected = row_count;
    v_count := v_count + v_affected;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.claim_project_invitations()
from public, anon, authenticated;

grant execute on function public.claim_project_invitations()
to authenticated;

commit;