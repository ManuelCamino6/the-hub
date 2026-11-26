begin;

lock table protocol.propagations
in access exclusive mode;

create sequence protocol.propagation_delivery_seq
as bigint;

alter table protocol.propagations
add column delivery_order bigint;

with ordered as (
  select
    p.id,

    row_number() over (
      order by
        b.closed_at,
        b.id,
        ch.sequence,
        p.id
    ) as position

  from protocol.propagations p

  join protocol.changes ch
    on ch.id = p.change_id

  join protocol.batches b
    on b.id = ch.batch_id
)

update protocol.propagations p

set delivery_order = ordered.position

from ordered

where p.id = ordered.id;

select setval(
  'protocol.propagation_delivery_seq',

  coalesce(
    (
      select max(delivery_order)
      from protocol.propagations
    ),
    1
  ),

  exists (
    select 1
    from protocol.propagations
  )
);

alter table protocol.propagations
alter column delivery_order
set default nextval(
  'protocol.propagation_delivery_seq'
);

alter table protocol.propagations
alter column delivery_order set not null;

alter sequence protocol.propagation_delivery_seq
owned by protocol.propagations.delivery_order;

create unique index propagations_delivery_order_uidx
on protocol.propagations(delivery_order);

create index propagations_delivery_cursor_idx
on protocol.propagations(
  instance_id,
  status,
  delivery_order
);

commit;