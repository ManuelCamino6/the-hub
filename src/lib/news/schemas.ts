import { z } from "zod";

export const listNewsSchema = z.object({
  project_id: z.uuid(),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50),

  cursor: z.string()
    .max(512)
    .optional(),
}).strict();

export type ListNewsInput =
  z.infer<typeof listNewsSchema>;

export type News = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};