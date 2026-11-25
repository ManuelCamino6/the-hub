
import { z } from "zod";
import { projectRoles } from "./schemas";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email();

export const memberRoleSchema = z.enum(projectRoles);

export const memberInputSchema = z.object({
  email: emailSchema,
  role: memberRoleSchema,
}).strict();

export const upsertMembersSchema = z.object({
  users: z.array(memberInputSchema).min(1).max(50),
}).strict().refine(
  ({ users }) =>
    new Set(users.map((user) => user.email)).size ===
    users.length,
  { message: "DUPLICATE_EMAIL" }
);

export const removeMembersSchema = z.object({
  users: z.array(
    z.object({
      email: emailSchema,
    }).strict()
  ).min(1).max(50),
}).strict().refine(
  ({ users }) =>
    new Set(users.map((user) => user.email)).size ===
    users.length,
  { message: "DUPLICATE_EMAIL" }
);

export const listMembersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().max(512).optional(),
});

export type MemberInput = z.infer<typeof memberInputSchema>;

export type UpsertMembersInput = z.infer<
  typeof upsertMembersSchema
>;

export type RemoveMembersInput = z.infer<
  typeof removeMembersSchema
>;

export type ListMembersInput = z.infer<
  typeof listMembersSchema
>;

export type ProjectMember = {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  role: z.infer<typeof memberRoleSchema>;
  status: "ACTIVE" | "PENDING";
  created_at: string;
};