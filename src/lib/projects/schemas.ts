
import { z } from "zod";

export const projectTypes = [
  "BUSINESS",
  "DEVELOPMENT",
] as const;

export const projectRoles = [
  "ADMIN",
  "EDITOR",
  "VIEWER",
] as const;

export const projectTypeSchema = z.enum(projectTypes);

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: projectTypeSchema,
}).strict();

export const listProjectsSchema = z.object({
  name: z.string().trim().max(120).optional(),
  type: projectTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200)
    .default(50),
  cursor: z.string().max(512).optional(),
});

export const projectCursorSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});

export type ProjectType = z.infer<
  typeof projectTypeSchema
>;

export type ProjectRole =
  (typeof projectRoles)[number];

export type CreateProjectInput = z.infer<
  typeof createProjectSchema
>;

export type ListProjectsInput = z.infer<
  typeof listProjectsSchema
>;

export type Project = {
  id: string;
  name: string;
  type: ProjectType;
  image_url: string | null;
  role: ProjectRole;
  created_at: string;
};
