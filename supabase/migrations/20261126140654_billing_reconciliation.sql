begin;

alter table billing.subscriptions

add column frequency integer
not null default 1,

add column frequency_type varchar(10)
not null default 'months',

add constraint subscription_frequency_check
check (frequency > 0),

add constraint subscription_frequency_type_check
check (frequency_type in ('days', 'months'));

alter table platform.invoices

add column provider_invoice_id text,

add column provider_updated_at timestamptz,

add column period_start timestamptz,

add column period_end timestamptz,

add constraint invoice_period_check

check (
  period_start is null
  or period_end is null
  or period_end > period_start
);

create unique index invoices_provider_invoice_idx

on platform.invoices (
  provider,
  provider_invoice_id
)

where provider_invoice_id is not null;

alter table billing.provider_events

add column attempts integer
not null default 0,

add column last_error text,

add column next_attempt_at timestamptz
not null default now();

create index provider_events_retry_idx

on billing.provider_events (
  next_attempt_at,
  created_at
)

where processed_at is null;

commit;