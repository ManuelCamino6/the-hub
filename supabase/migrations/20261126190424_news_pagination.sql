begin; 

create index if not exists news_project_cursor_idx
on platform.news (
  project_id,
  created_at desc,
  id desc
)
where deleted_at is null;

commit;