begin;

create schema billing;

revoke all on schema billing
from public, anon, authenticated;

create type billing.subscription_status as enum (
  'PENDING',
  'ACTIVE',
  'PAST_DUE',
  'PAUSED',
  'CANCELLED'
);

create type billing.invoice_status as enum (
  'OPEN',
  'PAID',
  'VOID',
  'UNCOLLECTIBLE'
);

create table billing.subscriptions (
  id uuid primary key
    default gen_random_uuid(),

  project_id uuid not null unique
    references platform.projects(id),

  provider varchar(30) not null
    default 'mercadopago',

  provider_subscription_id text,

  provider_status text,

  status billing.subscription_status
    not null default 'PENDING',

  plan_code varchar(50) not null,

  currency varchar(3) not null
    default 'ARS',

  amount_minor integer not null,

  period_start timestamptz,

  period_end timestamptz,

  provider_updated_at timestamptz,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique (
    provider,
    provider_subscription_id
  ),

  check (provider = 'mercadopago'),

  check (currency = 'ARS'),

  check (amount_minor > 0),

  check (
    period_start is null
    or period_end is null
    or period_end > period_start
  ),

  check (
    status <> 'ACTIVE'
    or (
      provider_subscription_id is not null
      and period_start is not null
      and period_end is not null
    )
  )
);

create table billing.provider_events (
  id uuid primary key
    default gen_random_uuid(),

  provider varchar(30) not null,

  event_id text not null,

  event_type text not null,

  resource_id text not null,

  payload jsonb not null,

  processed_at timestamptz,

  created_at timestamptz not null
    default now(),

  unique (provider, event_id),

  check (provider = 'mercadopago')
);

create table platform.invoices (
  id uuid primary key
    default gen_random_uuid(),

  project_id uuid not null
    references platform.projects(id),

  subscription_id uuid not null
    references billing.subscriptions(id),

  provider varchar(30) not null
    default 'mercadopago',

  provider_payment_id text not null,

  description varchar(255) not null,

  amount_minor integer not null,

  currency varchar(3) not null
    default 'ARS',

  status billing.invoice_status
    not null default 'OPEN',

  invoice_url text,

  created_at timestamptz not null
    default now(),

  due_at timestamptz,

  paid_at timestamptz,

  unique (
    provider,
    provider_payment_id
  ),

  check (provider = 'mercadopago'),

  check (currency = 'ARS'),

  check (amount_minor > 0),

  check (
    status <> 'PAID'
    or paid_at is not null
  )
);

create index invoices_project_cursor_idx
on platform.invoices (
  project_id,
  created_at desc,
  id desc
);

create index provider_events_pending_idx
on billing.provider_events(created_at)
where processed_at is null;

alter table billing.subscriptions
enable row level security;

alter table billing.provider_events
enable row level security;

alter table platform.invoices
enable row level security;

revoke all on all tables in schema billing
from public, anon, authenticated;

revoke all on platform.invoices
from public, anon, authenticated;

commit;