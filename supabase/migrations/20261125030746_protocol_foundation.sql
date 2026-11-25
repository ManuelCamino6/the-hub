
begin;

create schema if not exists protocol;
create schema if not exists data;

revoke all on schema protocol
from public, anon, authenticated;

revoke all on schema data
from public, anon, authenticated;

create type protocol.column_type as enum (
  'FLOAT',
  'INT',
  'VARCHAR',
  'TIMESTAMPTZ',
  'BOOLEAN',
  'TEXT',
  'UUID'
);

create table protocol.versions (
  id uuid not null unique default gen_random_uuid(),
  number smallint primary key check (number > 0),
  name varchar(120) not null,
  description text,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index protocol_single_active_version_idx
on protocol.versions (active)
where active = true;

create table protocol.tables (
  id uuid not null unique default gen_random_uuid(),
  version_id uuid not null
    references protocol.versions(id),
  name varchar(63) not null,
  description text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,

  primary key (version_id, name),

  check (name ~ '^[a-z][a-z0-9_]*$')
);

create table protocol.columns (
  id uuid not null unique default gen_random_uuid(),
  table_id uuid not null
    references protocol.tables(id),
  name varchar(63) not null,
  description text,
  type protocol.column_type not null,
  foreign_key uuid
    references protocol.tables(id),
  constant boolean not null default false,
  nullable boolean not null default true,
  default_value varchar,
  possible_values varchar[],
  created_at timestamptz not null default now(),

  primary key (table_id, name),

  check (name ~ '^[a-z][a-z0-9_]*$'),

  check (
    name not in (
      'id',
      'project_id',
      'created_at',
      'deleted_at'
    )
  ),

  check (
    foreign_key is null
    or type = 'UUID'
  )
);

alter table protocol.versions
enable row level security;

alter table protocol.tables
enable row level security;

alter table protocol.columns
enable row level security;

insert into protocol.versions (
  number,
  name,
  description,
  active
)
values (
  1,
  'The Hub v1',
  'Initial protocol version',
  true
);

commit;