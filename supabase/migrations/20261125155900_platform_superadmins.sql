
begin;

create table platform.superadmins (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  created_at timestamptz not null
    default now()
);

alter table platform.superadmins
  enable row level security;

revoke all on platform.superadmins
from public, anon, authenticated;

commit;
