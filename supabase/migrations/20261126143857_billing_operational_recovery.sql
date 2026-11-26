begin;

alter table billing.subscriptions

add column checkout_payer_email text,

add column last_reconciled_at timestamptz,

add column cancellation_requested_at timestamptz,

add column reconciliation_offset integer
not null default 0,

add constraint reconciliation_offset_check
check (reconciliation_offset >= 0);

create index subscriptions_reconciliation_idx

on billing.subscriptions (
  last_reconciled_at,
  created_at
)

where provider_subscription_id is not null;

commit;