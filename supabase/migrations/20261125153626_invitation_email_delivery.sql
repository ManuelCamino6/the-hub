
begin;

alter table platform.pending_invitations
  add column email_sent_at timestamptz,
  add column email_attempted_at timestamptz,
  add column email_provider_id text,
  add column email_error text;

create function public.prepare_invitation_email(
  p_project_id uuid,
  p_email text,
  p_resend boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation record;
begin
  if platform.project_role_for(p_project_id)
    is distinct from 'ADMIN'::platform.project_role
  then
    raise exception 'FORBIDDEN'
      using errcode = '42501';
  end if;

  select
    i.id,
    i.email_normalized,
    i.role,
    p.name as project_name
  into v_invitation

  from platform.pending_invitations i

  join platform.projects p
    on p.id = i.project_id

  where i.project_id = p_project_id
    and i.email_normalized = lower(trim(p_email))
    and i.linked_at is null
    and p.deleted_at is null

    and (
      p_resend
      or i.email_sent_at is null
    )

    and (
      i.email_attempted_at is null
      or i.email_attempted_at
        < now() - interval '60 seconds'
    )

  for update of i;

  if not found then
    return null;
  end if;

  update platform.pending_invitations
  set email_attempted_at = now()
  where id = v_invitation.id;

  return jsonb_build_object(
    'id', v_invitation.id,
    'email', v_invitation.email_normalized,
    'role', v_invitation.role,
    'project_name', v_invitation.project_name
  );
end;
$$;

revoke all on function
  public.prepare_invitation_email(
    uuid, text, boolean
  )
from public, anon, authenticated;

grant execute on function
  public.prepare_invitation_email(
    uuid, text, boolean
  )
to authenticated;

commit;
