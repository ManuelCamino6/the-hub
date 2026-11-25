begin;

create index if not exists
  batches_open_expiration_idx

on protocol.batches (
  created_at,
  id
)

where status = 'OPEN'
  and type = 'TRANSACTION';

commit;