
begin;

create or replace function platform.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into platform.user_profiles (
    user_id,
    name,
    lastname
  )
  values (
    new.id,

    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'given_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '')
      ),
      100
    ),

    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'family_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'lastname'), '')
      ),
      100
    )
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function platform.handle_new_user()
  from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function platform.handle_new_user();

-- Backfill existing users

insert into platform.user_profiles (
  user_id,
  name,
  lastname
)
select
  id,

  left(
    coalesce(
      nullif(btrim(raw_user_meta_data ->> 'given_name'), ''),
      nullif(btrim(raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(raw_user_meta_data ->> 'full_name'), '')
    ),
    100
  ),

  left(
    coalesce(
      nullif(btrim(raw_user_meta_data ->> 'family_name'), ''),
      nullif(btrim(raw_user_meta_data ->> 'lastname'), '')
    ),
    100
  )

from auth.users
on conflict (user_id) do nothing;

-- Users can read their own profile

grant usage on schema platform to authenticated;

grant select on platform.user_profiles
  to authenticated;

create policy user_profiles_select_own
  on platform.user_profiles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

commit;
