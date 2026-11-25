
begin;

create schema if not exists platform;

revoke all on schema platform from public;
revoke all on schema platform from anon;
revoke all on schema platform from authenticated;

-- Domain types

create type platform.project_type as enum (
  'BUSINESS',
  'DEVELOPMENT'
);

create type platform.project_role as enum (
  'ADMIN',
  'EDITOR',
  'VIEWER'
);

create type platform.profile_status as enum (
  'COMPLETE',
  'INCOMPLETE'
);

-- User profiles

create table platform.user_profiles (
  user_id uuid primary key
    references auth.users(id) on delete cascade,

  name varchar(100),
  lastname varchar(100),
  image_path text,

  status platform.profile_status
    generated always as (
      case
        when nullif(btrim(name), '') is not null
         and nullif(btrim(lastname), '') is not null
        then 'COMPLETE'::platform.profile_status
        else 'INCOMPLETE'::platform.profile_status
      end
    ) stored,

  created_at timestamptz not null default now()
);

-- Projects

create table platform.projects (
  id uuid primary key default gen_random_uuid(),

  name varchar(120) not null
    check (char_length(btrim(name)) > 0),

  type platform.project_type not null,

  image_path text,
  payment_data jsonb,

  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Project memberships

create table platform.users_per_project (
  project_id uuid not null
    references platform.projects(id),

  user_id uuid not null
    references auth.users(id),

  role platform.project_role not null,

  created_at timestamptz not null default now(),

  primary key (project_id, user_id)
);

create index users_per_project_user_idx
  on platform.users_per_project(user_id);

-- Pending invitations

create table platform.pending_invitations (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references platform.projects(id),

  email_normalized text not null
    check (
      email_normalized = lower(btrim(email_normalized))
      and email_normalized <> ''
    ),

  role platform.project_role not null,

  invited_by uuid not null
    references auth.users(id),

  created_at timestamptz not null default now(),
  linked_at timestamptz
);

create unique index pending_invitations_unique_idx
  on platform.pending_invitations(
    project_id,
    email_normalized
  )
  where linked_at is null;

create index pending_invitations_email_idx
  on platform.pending_invitations(email_normalized)
  where linked_at is null;

create index pending_invitations_invited_by_idx
  on platform.pending_invitations(invited_by);

create index projects_active_cursor_idx
  on platform.projects(created_at, id)
  where deleted_at is null;

-- Row Level Security

alter table platform.user_profiles
  enable row level security;

alter table platform.projects
  enable row level security;

alter table platform.users_per_project
  enable row level security;

alter table platform.pending_invitations
  enable row level security;

commit;