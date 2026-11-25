
import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { requireProject } from "./context";

export const requireBusinessProject = cache(
    async (projectId: string, write = false) => {
        const project = await requireProject(projectId);

        if (project.type !== "BUSINESS") {
            notFound();
        }

        if (write && project.role === "VIEWER") {
            redirect(`/p/${projectId}`);
        }

        return project;
    }
);
