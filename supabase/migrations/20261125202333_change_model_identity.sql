
begin;

alter table protocol.changes

add column table_id uuid
references protocol.tables(id);

create index changes_record_origin_idx

on protocol.changes (
  table_id,
  record_id,
  batch_id
)

where type = 'CREATE';

commit;
