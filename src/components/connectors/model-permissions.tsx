
"use client";

import { useTranslations } from "next-intl";

import { Checkbox } from "@/components/ui/checkbox";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {
    permissionKeys,
    type ModelPermission,
} from "@/lib/connectors/schemas";

import type { ProtocolTable } from "@/lib/protocol/service";

type PermissionKey = typeof permissionKeys[number];

type Props = {
    tables: ProtocolTable[];
    value: ModelPermission[];
    onChange: (value: ModelPermission[]) => void;
    disabled?: boolean;
};

function emptyPermission(
    tableId: string
): ModelPermission {
    return {
        table_id: tableId,
        can_list: false,
        can_send_post: false,
        can_receive_post: false,
        can_send_update: false,
        can_receive_update: false,
        can_send_delete: false,
        can_receive_delete: false,
    };
}

export function ModelPermissions({
    tables,
    value,
    onChange,
    disabled,
}: Props) {
    const t = useTranslations("Connectors");

    function update(
        tableId: string,
        key: PermissionKey,
        checked: boolean
    ) {
        const current =
            value.find((item) => item.table_id === tableId)
            ?? emptyPermission(tableId);

        const next = {
            ...current,
            [key]: checked,
        };

        const remaining = value.filter(
            (item) => item.table_id !== tableId
        );

        onChange(
            permissionKeys.some((key) => next[key])
                ? [...remaining, next]
                : remaining
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("permissions")}</CardTitle>
                <CardDescription>
                    {t("permissionsDescription")}
                </CardDescription>
            </CardHeader>

            <CardContent>
                {!tables.length ? (
                    <p className="text-sm text-muted-foreground">
                        {t("noModels")}
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("model")}</TableHead>

                                    {permissionKeys.map((key) => (
                                        <TableHead
                                            key={key}
                                            className="text-center"
                                        >
                                            {t(`operations.${key}`)}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {tables.map((table) => {
                                    const permission = value.find(
                                        (item) => item.table_id === table.id
                                    );

                                    return (
                                        <TableRow key={table.id}>
                                            <TableCell className="font-medium">
                                                {table.name}
                                            </TableCell>

                                            {permissionKeys.map((key) => (
                                                <TableCell
                                                    key={key}
                                                    className="text-center"
                                                >
                                                    <Checkbox
                                                        checked={permission?.[key] ?? false}
                                                        disabled={disabled}
                                                        aria-label={
                                                            `${table.name}: ${t(`operations.${key}`)}`
                                                        }
                                                        onCheckedChange={(checked) =>
                                                            update(
                                                                table.id,
                                                                key,
                                                                checked === true
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
