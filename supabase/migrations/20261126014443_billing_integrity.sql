begin;

create function billing.validate_subscription_project()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  if not exists (
    select 1

    from platform.projects p

    where p.id = new.project_id
      and p.type = 'BUSINESS'
  ) then

    raise exception 'INVALID_BILLING_PROJECT'
      using errcode = '22023';

  end if;

  return new;

end;
$$;

create trigger validate_subscription_project

before insert or update of project_id

on billing.subscriptions

for each row

execute function
billing.validate_subscription_project();

alter table billing.subscriptions

add constraint subscriptions_project_identity

unique (id, project_id);

alter table platform.invoices

add constraint invoices_subscription_project_fk

foreign key (
  subscription_id,
  project_id
)

references billing.subscriptions (
  id,
  project_id
);

revoke all on function
billing.validate_subscription_project()

from public, anon, authenticated;

create function billing.has_active_subscription(
  p_project_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$

  select exists (
    select 1

    from billing.subscriptions s

    join platform.projects p
      on p.id = s.project_id

    where s.project_id = p_project_id

      and p.type = 'BUSINESS'
      and p.deleted_at is null

      and s.status = 'ACTIVE'

      and s.period_start <= now()
      and s.period_end > now()
  );

$$;

revoke all on function
billing.has_active_subscription(uuid)

from public, anon, authenticated;

commit;