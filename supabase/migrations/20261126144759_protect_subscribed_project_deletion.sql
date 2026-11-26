begin;

create or replace function
billing.prevent_subscribed_project_deletion()

returns trigger

language plpgsql

security definer

set search_path = ''

as $$
begin

  if old.type = 'BUSINESS'

    and old.deleted_at is null

    and new.deleted_at is not null

  then

    if exists (
      select 1

      from billing.subscriptions s

      where s.project_id = old.id

        and (
          (
            s.provider_subscription_id
              is not null

            and s.status <> 'CANCELLED'
          )

          or s.checkout_state in (
            'CREATING',
            'RECONCILE'
          )

          or s.cancellation_requested_at
            is not null
        )
    )

    then
      raise exception 'SUBSCRIPTION_MUST_BE_CANCELLED'

        using errcode = 'P0001';
    end if;

  end if;

  return new;

end;
$$;

revoke all

on function
billing.prevent_subscribed_project_deletion()

from public, anon, authenticated;

create trigger protect_subscribed_project_deletion

before update of deleted_at

on platform.projects

for each row

execute function
billing.prevent_subscribed_project_deletion();

commit;