begin;

alter table billing.subscriptions

add column checkout_url text,

add column checkout_requested_at
timestamptz,

add column checkout_state varchar(20)
not null default 'IDLE',

add constraint subscription_checkout_state_check

check (
  checkout_state in (
    'IDLE',
    'CREATING',
    'READY',
    'RECONCILE'
  )
),

add constraint subscription_checkout_ready_check

check (
  checkout_state <> 'READY'
  or (
    checkout_url is not null
    and provider_subscription_id is not null
  )
);

commit;