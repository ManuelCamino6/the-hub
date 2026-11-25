
begin;

alter table protocol.changes
add column request_hash text;

alter table protocol.changes

add constraint changes_request_hash_format

check (
  request_hash is null
  or request_hash ~ '^[a-f0-9]{64}$'
);

create index changes_pending_reference_idx

on protocol.changes (
  batch_id,
  table_id,
  (payload ->> 'ref_id')
)

where type = 'CREATE';

commit;
