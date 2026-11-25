
begin;

create type protocol.batch_type as enum (
  'TRANSACTION',
  'SETUP',
  'SETTING'
);

create type protocol.batch_status as enum (
  'OPEN',
  'COMMITTED',
  'FAILED',
  'DISCARDED',
  'EXPIRED'
);

create type protocol.change_type as enum (
  'CREATE',
  'UPDATE',
  'DELETE',
  'SETTING'
);

create type protocol.propagation_status as enum (
  'PENDING',
  'OK',
  'FAILED',
  'EXPIRED'
);

create table protocol.batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references platform.projects(id),
  instance_id uuid
    references platform.instances(id),
  type protocol.batch_type not null,
  status protocol.batch_status not null default 'OPEN',
  created_at timestamptz not null default now(),
  closed_at timestamptz,

  check (
    type = 'SETTING' or instance_id is not null
  ),

  check (
    (status = 'OPEN' and closed_at is null)
    or
    (status <> 'OPEN' and closed_at is not null)
  )
);

create table protocol.changes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null
    references protocol.batches(id),
  sequence integer not null check (sequence > 0),
  client_operation_id varchar(255),
  table_name varchar(63),
  record_id uuid,
  type protocol.change_type not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),

  unique (batch_id, sequence),
  unique (batch_id, client_operation_id),

  check (
    type = 'SETTING'
    or (
      table_name is not null
      and record_id is not null
    )
  )
);

create table protocol.propagations (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null
    references protocol.changes(id),
  instance_id uuid not null
    references platform.instances(id),
  status protocol.propagation_status
    not null default 'PENDING',
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,

  unique (change_id, instance_id),

  check (
    status <> 'OK' or confirmed_at is not null
  )
);

create index batches_instance_status_idx
on protocol.batches (
  instance_id, status, created_at
);

create index batches_project_idx
on protocol.batches (project_id);

create index propagations_instance_status_idx
on protocol.propagations (
  instance_id, status, created_at, id
);

alter table protocol.batches
enable row level security;

alter table protocol.changes
enable row level security;

alter table protocol.propagations
enable row level security;

revoke all on
  protocol.batches,
  protocol.changes,
  protocol.propagations
from public, anon, authenticated;

commit;
