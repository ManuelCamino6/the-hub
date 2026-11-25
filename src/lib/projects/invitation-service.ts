
import "server-only";

import { randomUUID } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import { getDatabase } from "@/lib/db";

import {
  sendProjectInvitation,
} from "@/lib/email/project-invitation";

type Invitation = {
  id: string;
  email: string;
  project_name: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
};

export type InvitationDeliveryResult = {
  email: string;
  status: "SENT" | "FAILED" | "SKIPPED";
};

export async function deliverProjectInvitation(
  projectId: string,
  email: string,
  resend = false
): Promise<InvitationDeliveryResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "prepare_invitation_email",
    {
      p_project_id: projectId,
      p_email: email,
      p_resend: resend,
    }
  );

  if (error) throw error;

  if (!data) {
    return {
      email,
      status: "SKIPPED",
    };
  }

  const invitation = data as Invitation;
  const sql = getDatabase();

  let providerId: string;

  try {
    const result = await sendProjectInvitation({
      invitationId: invitation.id,
      email: invitation.email,
      projectName: invitation.project_name,
      role: invitation.role,

      idempotencyKey: resend
        ? `invitation-${invitation.id}-${randomUUID()}`
        : `invitation-${invitation.id}`,
    });

    providerId = result.id;
  } catch {
    await sql`
      update platform.pending_invitations
      set email_error = 'EMAIL_SEND_FAILED'
      where id = ${invitation.id}
    `;

    return {
      email,
      status: "FAILED",
    };
  }

  await sql`
    update platform.pending_invitations
    set
      email_sent_at = now(),
      email_provider_id = ${providerId},
      email_error = null
    where id = ${invitation.id}
  `;

  return {
    email,
    status: "SENT",
  };
}

export async function deliverProjectInvitations(
  projectId: string,
  emails: string[]
): Promise<InvitationDeliveryResult[]> {
  const results: InvitationDeliveryResult[] = [];

  for (const email of emails) {
    try {
      results.push(
        await deliverProjectInvitation(
          projectId,
          email
        )
      );
    } catch {
      results.push({
        email,
        status: "FAILED",
      });
    }
  }

  return results;
}
