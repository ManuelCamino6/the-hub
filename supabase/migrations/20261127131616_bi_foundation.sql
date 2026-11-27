create schema if not exists analytics;

revoke all on schema analytics
from public, anon, authenticated;

create table platform.bi_access (
    project_id uuid primary key
        references platform.projects(id),

    username varchar(63) not null unique,

    enabled boolean not null default false,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    rotated_at timestamptz,

    constraint bi_access_username_check
        check (
            username = 'hub.' || project_id::text
        )
);

alter table platform.bi_access
enable row level security;

revoke all on table platform.bi_access
from public, anon, authenticated;