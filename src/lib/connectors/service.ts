
import "server-only";

import { createClient } from "@/lib/supabase/server";

import {
    decodeCursor,
    paginate,
} from "@/lib/api/pagination";

import type {
    CreateConnectorInput,
    Connector,
    ListConnectorsInput,
    ConnectorDetail,
    ConnectorDistributionInput,
    UpdateConnectorInput,
} from "./schemas";

export async function createConnector(
    input: CreateConnectorInput
) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "create_connector",
        {
            p_project_id: input.project_id,
            p_name: input.name,
            p_description: input.description ?? null,
            p_parameters: input.parameters,
            p_models_permissions: input.models_permissions,
        }
    );

    if (error) throw error;

    return data as {
        id: string;
        token: string;
    };
}

export async function rotateConnectorToken(
    connectorId: string
) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "rotate_connector_token",
        {
            p_connector_id: connectorId,
        }
    );

    if (error) throw error;

    return data as {
        token: string;
    };
}

export async function listConnectors(
    input: ListConnectorsInput
) {
    const supabase = await createClient();
    const cursor = decodeCursor(input.cursor);

    const { data, error } = await supabase.rpc(
        "list_connectors",
        {
            p_project_id: input.project_id,
            p_name: input.name ?? null,
            p_status: input.status ?? null,
            p_visibility: input.visibility ?? null,
            p_limit: input.limit + 1,
            p_cursor_created_at: cursor?.created_at ?? null,
            p_cursor_id: cursor?.id ?? null,
        }
    );

    if (error) throw error;

    return paginate(
        (data ?? []) as Connector[],
        input.limit
    );
}


export async function getConnector(id: string) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "get_connector",
        { p_connector_id: id }
    );

    if (error) throw error;

    return data as ConnectorDetail;
}

export async function updateConnector(
    id: string,
    input: UpdateConnectorInput
) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "update_connector",
        {
            p_connector_id: id,
            p_name: input.name,
            p_description: input.description ?? null,
            p_status: input.status,
            p_parameters: input.parameters,
            p_models_permissions: input.models_permissions,
        }
    );

    if (error) throw error;

    return data as {
        id: string;
        affected_instances: number;
    };
}

export async function deleteConnector(id: string) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "delete_connector",
        { p_connector_id: id }
    );

    if (error) throw error;

    return data as { id: string };
}

export async function getConnectorDistribution(
    id: string
) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "get_connector_distribution",
        { p_connector_id: id }
    );

    if (error) throw error;

    return data as ConnectorDistributionInput;
}

export async function updateConnectorDistribution(
    id: string,
    input: ConnectorDistributionInput
) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "update_connector_distribution",
        {
            p_connector_id: id,
            p_visibility: input.visibility,
            p_project_ids: input.project_ids,
        }
    );

    if (error) throw error;

    return data as ConnectorDistributionInput & {
        id: string;
    };
}


export async function getCatalogConnector(
    projectId: string,
    connectorId: string
) {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "get_catalog_connector",
        {
            p_project_id: projectId,
            p_connector_id: connectorId,
        }
    );

    if (error) throw error;

    return data as ConnectorDetail;
}
