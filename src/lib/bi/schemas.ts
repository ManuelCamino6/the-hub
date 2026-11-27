export type BiAccess = {
    project_id: string;
    username: string;
    enabled: boolean;
    created_at: string;
    updated_at: string;
    rotated_at: string | null;
};

export type BiConnection = {
    host: string;
    port: number;
    database: string;
    schema: "analytics";
    username: string;
    ssl: true;
};

export type BiAccessDetail = {
    available: boolean;
    access: BiAccess | null;
    connection: BiConnection | null;
};

export type BiCredentials = {
    connection: BiConnection;
    password: string;
};