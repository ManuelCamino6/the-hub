import "server-only";

import type { Sql, TransactionSql } from "postgres";

import { getDatabase } from "@/lib/db";
import { DomainError } from "@/lib/api/domain-error";

import {
    getBiConfig,
    getBiConnectionUsername,
} from "./config";

import {
    getBiUsername,
    generateBiPassword,
} from "./credentials";

import {
    createBiRole,
    activateBiRole,
    disableBiRole,
    biRoleExists,
    requireBiRole,
} from "./roles";

import { requireBiAdmin } from "./authorization";
import { terminateBiSessions } from "./sessions";

import type {
    BiAccess,
    BiConnection,
    BiAccessDetail,
    BiCredentials,
    BiDisableResult,
    BiSessionTermination,
} from "./schemas";

type BiConfig = NonNullable<
    ReturnType<typeof getBiConfig>
>;

function requireBiConfig() {
    const config = getBiConfig();

    if (!config) {
        throw new DomainError(
            "BI_UNAVAILABLE",
            503
        );
    }

    return config;
}

function buildConnection(
    config: BiConfig,
    username: string
): BiConnection {
    return {
        host: config.host,
        port: config.port,
        database: config.database,
        schema: config.schema,
        username: getBiConnectionUsername(
            username,
            config.mode,
            config.projectRef
        ),
        ssl: true,
    };
}

async function findAccess(
    sql: Sql | TransactionSql,
    projectId: string
) {
    const [access] = await sql<BiAccess[]>`
        select
            project_id,
            username,
            enabled,
            created_at,
            updated_at,
            rotated_at
        from platform.bi_access
        where project_id = ${projectId}
    `;

    return access ?? null;
}

async function closeSessions(
    projectId: string
): Promise<BiSessionTermination> {
    try {
        return await terminateBiSessions(
            projectId
        );
    } catch {
        return {
            requested: 0,
            terminated: 0,
            complete: false,
        };
    }
}

export async function getBiAccess(
    userId: string,
    projectId: string
): Promise<BiAccessDetail> {
    console.log("[BI Service] 1. Starting");

    const sql = getDatabase();
    const config = getBiConfig();

    console.log(
        "[BI Service] 2. Database client obtained"
    );

    await requireBiAdmin(
        sql,
        userId,
        projectId
    );

    console.log(
        "[BI Service] 3. Admin authorized"
    );

    const access = await findAccess(
        sql,
        projectId
    );

    console.log(
        "[BI Service] 4. Access loaded"
    );

    return {
        available: config !== null,
        access,
        connection:
            config && access?.enabled
                ? buildConnection(
                    config,
                    access.username
                )
                : null,
    };
}

export async function enableBiAccess(
    userId: string,
    projectId: string
): Promise<BiCredentials> {
    const config = requireBiConfig();
    const sql = getDatabase();

    const username = getBiUsername(projectId);
    const password = generateBiPassword();

    await sql.begin(async (tx) => {
        await requireBiAdmin(
            tx,
            userId,
            projectId,
            true
        );

        const access = await findAccess(
            tx,
            projectId
        );

        if (access?.enabled) {
            throw new DomainError(
                "BI_ALREADY_ENABLED",
                409
            );
        }

        const roleExists = await biRoleExists(
            tx,
            projectId
        );

        if (roleExists && !access) {
            throw new DomainError(
                "BI_ROLE_CONFLICT",
                409
            );
        }

        if (roleExists) {
            await activateBiRole(
                tx,
                projectId,
                password
            );
        } else {
            await createBiRole(
                tx,
                projectId,
                password
            );
        }

        await tx`
            insert into platform.bi_access (
                project_id,
                username,
                enabled,
                rotated_at
            )
            values (
                ${projectId},
                ${username},
                true,
                now()
            )
            on conflict (project_id)
            do update set
                enabled = true,
                updated_at = now(),
                rotated_at = now()
        `;
    });

    const sessions = await closeSessions(
        projectId
    );

    return {
        connection: buildConnection(
            config,
            username
        ),
        password,
        sessions,
    };
}

export async function rotateBiAccess(
    userId: string,
    projectId: string
): Promise<BiCredentials> {
    const config = requireBiConfig();
    const sql = getDatabase();

    const password = generateBiPassword();

    const username = await sql.begin(
        async (tx) => {
            await requireBiAdmin(
                tx,
                userId,
                projectId,
                true
            );

            const access = await findAccess(
                tx,
                projectId
            );

            if (!access?.enabled) {
                throw new DomainError(
                    "BI_NOT_ENABLED",
                    409
                );
            }

            await requireBiRole(
                tx,
                projectId
            );

            await activateBiRole(
                tx,
                projectId,
                password
            );

            await tx`
                update platform.bi_access
                set
                    updated_at = now(),
                    rotated_at = now()
                where project_id = ${projectId}
            `;

            return access.username;
        }
    );

    const sessions = await closeSessions(
        projectId
    );

    return {
        connection: buildConnection(
            config,
            username
        ),
        password,
        sessions,
    };
}

export async function disableBiAccess(
    userId: string,
    projectId: string
): Promise<BiDisableResult> {
    const sql = getDatabase();

    await sql.begin(async (tx) => {
        await requireBiAdmin(
            tx,
            userId,
            projectId,
            true
        );

        const access = await findAccess(
            tx,
            projectId
        );

        if (!access) return;

        if (
            await biRoleExists(tx, projectId)
        ) {
            await disableBiRole(
                tx,
                projectId
            );
        }

        await tx`
            update platform.bi_access
            set
                enabled = false,
                updated_at = now()
            where project_id = ${projectId}
        `;
    });

    return {
        enabled: false,
        sessions: await closeSessions(
            projectId
        ),
    };
}