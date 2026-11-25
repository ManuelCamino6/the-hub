
import "server-only";

import { sendEmail } from "./service";

type InvitationInput = {
  invitationId: string;
  email: string;
  projectName: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  idempotencyKey?: string;
};

const roles = {
  ADMIN: {
    es: "Administrador",
    en: "Administrator",
  },
  EDITOR: {
    es: "Editor",
    en: "Editor",
  },
  VIEWER: {
    es: "Lector",
    en: "Viewer",
  },
};

export async function sendProjectInvitation(
  input: InvitationInput
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("APP_URL_NOT_CONFIGURED");
  }

  const signupUrl = new URL(
    "/signup",
    appUrl
  ).toString();

  const loginUrl = new URL(
    "/login",
    appUrl
  ).toString();

  const role = roles[input.role];

  const text = [
    "The Hub",
    "",
    `Te invitaron al proyecto ${input.projectName}.`,
    `Rol asignado: ${role.es}.`,
    "",
    "Creá una cuenta utilizando este mismo correo electrónico.",
    signupUrl,
    "",
    "Si ya tenés una cuenta, iniciá sesión:",
    loginUrl,
    "",
    "Tu acceso se vinculará automáticamente.",
    "",
    "------------------------------",
    "",
    `You have been invited to ${input.projectName}.`,
    `Assigned role: ${role.en}.`,
    "",
    "Create an account using this email address.",
    signupUrl,
    "",
    "If you already have an account, sign in:",
    loginUrl,
    "",
    "Your access will be linked automatically.",
  ].join("\n");

  return sendEmail({
    to: input.email,
    subject: "The Hub — Invitación / Invitation",
    text,
    idempotencyKey: input.idempotencyKey,
  });
}
