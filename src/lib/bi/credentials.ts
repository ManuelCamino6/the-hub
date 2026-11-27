import "server-only";

import { randomBytes } from "node:crypto";
import { z } from "zod";

export function getBiUsername(projectId: string) {
    const id = z.uuid().parse(projectId);

    return `hub.${id.toLowerCase()}`;
}

export function generateBiPassword() {
    return randomBytes(32).toString("base64url");
}