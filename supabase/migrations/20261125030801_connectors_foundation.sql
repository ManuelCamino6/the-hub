
begin;

create type platform.connector_status as enum (
  'IN_DEVELOPMENT',
  'AVAILABLE',
  'DEPRECATED'
);

create type platform.connector_visibility as enum (
  'PUBLIC',
  'PRIVATE'
);

create type platform.parameter_type as enum (
  'NUMBER',
  'TEXT',
  'DATE',
  'BOOLEAN'
);

create table platform.connectors (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references platform.projects(id),

  name varchar(120) not null
    check (char_length(btrim(name)) > 0),

  description text,
  image_path text,

  status platform.connector_status
    not null default 'IN_DEVELOPMENT',

  visibility platform.connector_visibility
    not null default 'PRIVATE',

  token_hash text not null unique
    check (token_hash ~ '^[a-f0-9]{64}$'),

  token_prefix varchar(16) not null,

  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index connectors_project_cursor_idx
on platform.connectors (
  project_id,
  created_at,
  id
)
where deleted_at is null;

create table platform.connectors_parameters (
  connector_id uuid not null
    references platform.connectors(id),

  key varchar(63) not null
    check (key ~ '^[a-z][a-z0-9_]*$'),

  type platform.parameter_type not null,
  required boolean not null default false,
  encrypted boolean not null default false,

  primary key (connector_id, key)
);

create table platform.connectors_models_permissions (
  connector_id uuid not null
    references platform.connectors(id),

  table_id uuid not null
    references protocol.tables(id),

  can_list boolean not null default false,
  can_send_post boolean not null default false,
  can_receive_post boolean not null default false,
  can_send_update boolean not null default false,
  can_receive_update boolean not null default false,
  can_send_delete boolean not null default false,
  can_receive_delete boolean not null default false,

  primary key (connector_id, table_id)
);

create table platform.connectors_permissions (
  connector_id uuid not null
    references platform.connectors(id),

  project_id uuid not null
    references platform.projects(id),

  primary key (connector_id, project_id)
);

create index connectors_permissions_project_idx
on platform.connectors_permissions(project_id);

alter table platform.connectors
enable row level security;

alter table platform.connectors_parameters
enable row level security;

alter table platform.connectors_models_permissions
enable row level security;

alter table platform.connectors_permissions
enable row level security;

revoke all on
  platform.connectors,
  platform.connectors_parameters,
  platform.connectors_models_permissions,
  platform.connectors_permissions
from public, anon, authenticated;

commit;
