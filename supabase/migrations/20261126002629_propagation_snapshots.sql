begin;

alter table protocol.changes
add column applied_payload jsonb;

create index propagations_pull_cursor_idx
on protocol.propagations (
  instance_id,
  status,
  created_at,
  id
);

commit;