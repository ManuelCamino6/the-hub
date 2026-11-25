
begin;

create table platform.news (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references platform.projects(id),

  title varchar(200) not null,
  content text not null,

  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index news_project_cursor_idx
on platform.news (
  project_id,
  created_at desc,
  id desc
)
where deleted_at is null;

alter table platform.news
enable row level security;

revoke all on platform.news
from public, anon, authenticated;

commit;
