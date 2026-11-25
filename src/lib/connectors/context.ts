
import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireProject } from "@/lib/projects/context";
import { getConnector } from "./service";

export const requireDevelopmentProject = cache(
    async (projectId: string, write = false) => {
        const project = await requireProject(projectId);

        if (project.type !== "DEVELOPMENT") {
            notFound();
        }

        if (write && project.role === "VIEWER") {
            redirect(`/p/${projectId}/connectors`);
        }

        return project;
    }
);

export const requireOwnedConnector = cache(
    async (
        projectId: string,
        connectorId: string,
        write = false
    ) => {
        const project = await requireDevelopmentProject(
            projectId,
            write
        );

        if (!z.uuid().safeParse(connectorId).success) {
            notFound();
        }

        const supabase = await createClient();

        const { data, error } = await supabase.rpc(
            "is_project_connector",
            {
                p_project_id: projectId,
                p_connector_id: connectorId,
            }
        );

        if (error) throw error;
        if (!data) notFound();

        const connector = await getConnector(connectorId);

        return {
            project,
            connector,
            canWrite: project.role !== "VIEWER",
        };
    }
);
