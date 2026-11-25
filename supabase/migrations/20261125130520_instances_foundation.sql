
begin;

create type platform.instance_status as enum (
  'OK',
  'INCOMPLETE',
  'UNAUTHORIZED'
);

create type platform.instance_operation_status as enum (
  'ACTIVE',
  'PAUSED'
);

create table platform.instances (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references platform.projects(id),

  connector_id uuid not null
    references platform.connectors(id),

  name varchar(120) not null
    check (char_length(btrim(name)) > 0),

  status platform.instance_status
    not null default 'INCOMPLETE',

  operation_status platform.instance_operation_status
    not null default 'ACTIVE',

  paused_reason text,

  created_at timestamptz not null default now(),
  deleted_at timestamptz,

  check (
    (
      operation_status = 'ACTIVE'
      and paused_reason is null
    )
    or (
      operation_status = 'PAUSED'
      and paused_reason is not null
    )
  )
);

create table platform.instances_parameters (
  instance_id uuid not null
    references platform.instances(id),

  key varchar(63) not null,

  value text,

  primary key (instance_id, key)
);

create table platform.instances_models_permissions (
  instance_id uuid not null
    references platform.instances(id),

  table_id uuid not null
    references protocol.tables(id),

  can_list boolean not null default false,

  can_send_post boolean not null default false,
  can_receive_post boolean not null default false,
  can_receive_post_from uuid[],

  can_send_update boolean not null default false,
  can_receive_update boolean not null default false,
  can_receive_update_from uuid[],

  can_send_delete boolean not null default false,
  can_receive_delete boolean not null default false,
  can_receive_delete_from uuid[],

  primary key (instance_id, table_id)
);

create index instances_project_cursor_idx
on platform.instances (
  project_id,
  created_at desc,
  id desc
)
where deleted_at is null;

create index instances_connector_idx
on platform.instances (connector_id)
where deleted_at is null;

create index instances_permissions_table_idx
on platform.instances_models_permissions (table_id);

alter table platform.instances
enable row level security;

alter table platform.instances_parameters
enable row level security;

alter table platform.instances_models_permissions
enable row level security;

revoke all on
  platform.instances,
  platform.instances_parameters,
  platform.instances_models_permissions
from public, anon, authenticated;

commit;
