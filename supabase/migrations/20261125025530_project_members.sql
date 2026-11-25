
begin;

-- List members and pending invitations.

create function public.list_project_members(
  p_project_id uuid,
  p_limit integer default 51,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  id uuid,
  user_id uuid,
  email text,
  name text,
  role text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform platform.require_project_admin(p_project_id);

  return query
  select *
  from (
    select
      m.user_id as id,
      m.user_id,
      u.email::text,
      nullif(
        concat_ws(' ', pr.name, pr.lastname),
        ''
      ) as name,
      m.role::text,
      'ACTIVE'::text as status,
      m.created_at
    from platform.users_per_project m
    join auth.users u on u.id = m.user_id
    left join platform.user_profiles pr
      on pr.user_id = m.user_id
    where m.project_id = p_project_id

    union all

    select
      i.id,
      null::uuid,
      i.email_normalized,
      null::text,
      i.role::text,
      'PENDING'::text,
      i.created_at
    from platform.pending_invitations i
    where i.project_id = p_project_id
      and i.linked_at is null
  ) members
  where
    (p_cursor_created_at is null and p_cursor_id is null)
    or (
      (members.created_at, members.id)
      < (p_cursor_created_at, p_cursor_id)
    )
  order by members.created_at desc, members.id desc
  limit least(greatest(coalesce(p_limit, 51), 1), 201);
end;
$$;

-- Add members or update roles.

create function public.upsert_project_members(
  p_project_id uuid,
  p_users jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_email text;
  v_role platform.project_role;
  v_user_id uuid;
  v_previous_role platform.project_role;
  v_added jsonb := '[]'::jsonb;
  v_invited jsonb := '[]'::jsonb;
begin
  perform platform.require_project_admin(p_project_id);

  if p_users is null
    or jsonb_typeof(p_users) <> 'array'
  then
    raise exception 'INVALID_USERS'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_users) not between 1 and 50
  then
    raise exception 'INVALID_USERS'
      using errcode = '22023';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_users)
  loop
    v_email := lower(btrim(v_item ->> 'email'));

    if v_email is null
      or length(v_email) > 254
      or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or (v_item ->> 'role') is null
      or (v_item ->> 'role') not in (
        'ADMIN', 'EDITOR', 'VIEWER'
      )
    then
      raise exception 'INVALID_MEMBER'
        using errcode = '22023';
    end if;

    v_role := (v_item ->> 'role')::platform.project_role;

    select u.id
    into v_user_id
    from auth.users u
    where lower(btrim(u.email)) = v_email
      and u.email_confirmed_at is not null
    limit 1;

    if v_user_id is not null then

      if v_user_id = auth.uid() then
        raise exception 'SELF_ROLE_CHANGE'
          using errcode = 'P0001';
      end if;

      select m.role
      into v_previous_role
      from platform.users_per_project m
      where m.project_id = p_project_id
        and m.user_id = v_user_id;

      if v_previous_role = 'ADMIN'
        and v_role <> 'ADMIN'
        and (
          select count(*)
          from platform.users_per_project m
          where m.project_id = p_project_id
            and m.role = 'ADMIN'
        ) <= 1
      then
        raise exception 'LAST_ADMIN'
          using errcode = 'P0001';
      end if;

      insert into platform.users_per_project (
        project_id,
        user_id,
        role
      )
      values (
        p_project_id,
        v_user_id,
        v_role
      )
      on conflict (project_id, user_id)
      do update set role = excluded.role;

      update platform.pending_invitations
      set linked_at = now()
      where project_id = p_project_id
        and email_normalized = v_email
        and linked_at is null;

      v_added := v_added || jsonb_build_array(v_email);

    else

      insert into platform.pending_invitations (
        project_id,
        email_normalized,
        role,
        invited_by
      )
      values (
        p_project_id,
        v_email,
        v_role,
        auth.uid()
      )
      on conflict (project_id, email_normalized)
        where linked_at is null
      do update set role = excluded.role;

      v_invited := v_invited || jsonb_build_array(v_email);

    end if;
  end loop;

  return jsonb_build_object(
    'added', v_added,
    'invited', v_invited
  );
end;
$$;

-- Remove members or pending invitations.

create function public.remove_project_members(
  p_project_id uuid,
  p_users jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_email text;
  v_user_id uuid;
  v_role platform.project_role;
  v_removed jsonb := '[]'::jsonb;
begin
  perform platform.require_project_admin(p_project_id);

  if p_users is null
    or jsonb_typeof(p_users) <> 'array'
  then
    raise exception 'INVALID_USERS'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_users) not between 1 and 50
  then
    raise exception 'INVALID_USERS'
      using errcode = '22023';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_users)
  loop
    v_email := lower(btrim(v_item ->> 'email'));

    if v_email is null
      or length(v_email) > 254
      or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    then
      raise exception 'INVALID_EMAIL'
        using errcode = '22023';
    end if;

    select m.user_id, m.role
    into v_user_id, v_role
    from platform.users_per_project m
    join auth.users u on u.id = m.user_id
    where m.project_id = p_project_id
      and lower(btrim(u.email)) = v_email;

    if v_user_id is not null then

      if v_role = 'ADMIN'
        and (
          select count(*)
          from platform.users_per_project m
          where m.project_id = p_project_id
            and m.role = 'ADMIN'
        ) <= 1
      then
        raise exception 'LAST_ADMIN'
          using errcode = 'P0001';
      end if;

      delete from platform.users_per_project
      where project_id = p_project_id
        and user_id = v_user_id;

    end if;

    delete from platform.pending_invitations
    where project_id = p_project_id
      and email_normalized = v_email
      and linked_at is null;

    v_removed := v_removed || jsonb_build_array(v_email);
  end loop;

  return jsonb_build_object(
    'removed', v_removed
  );
end;
$$;

-- Restrict function execution.

revoke all on function public.list_project_members(
  uuid, integer, timestamptz, uuid
) from public, anon, authenticated;

revoke all on function public.upsert_project_members(
  uuid, jsonb
) from public, anon, authenticated;

revoke all on function public.remove_project_members(
  uuid, jsonb
) from public, anon, authenticated;

grant execute on function public.list_project_members(
  uuid, integer, timestamptz, uuid
) to authenticated;

grant execute on function public.upsert_project_members(
  uuid, jsonb
) to authenticated;

grant execute on function public.remove_project_members(
  uuid, jsonb
) to authenticated;

commit;