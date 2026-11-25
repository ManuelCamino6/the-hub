
"use client";

import { useTranslations } from "next-intl";
import { Settings2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

import {
    Card,
    CardContent,
} from "@/components/ui/card";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
    columnTypes,
    type ColumnType,
    type ModelSummary,
} from "@/lib/protocol/schemas";

import type {
    ColumnRow,
} from "@/lib/protocol/form";

type Props = {
    column: ColumnRow;
    models: ModelSummary[];
    disabled: boolean;
    onChange: (column: ColumnRow) => void;
    onRemove: () => void;
};

export function ColumnEditor({
    column,
    models,
    disabled,
    onChange,
    onRemove,
}: Props) {
    const t = useTranslations("Admin");

    const prefix = `column-${column.rowId}`;

    function update(
        changes: Partial<ColumnRow>
    ) {
        onChange({
            ...column,
            ...changes,
        });
    }

    return (
        <Card>
            <CardContent className="flex flex-col gap-4">
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor={`${prefix}-name`}>
                            {t("columnName")}
                        </Label>

                        <Input
                            id={`${prefix}-name`}
                            value={column.name}
                            disabled={disabled}
                            maxLength={63}
                            onChange={(event) =>
                                update({
                                    name: event.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor={`${prefix}-type`}>
                            {t("columnType")}
                        </Label>

                        <Select
                            value={column.type}
                            disabled={disabled}
                            onValueChange={(value) => {
                                const type = value as ColumnType;

                                update({
                                    type,
                                    foreign_key:
                                        type === "UUID"
                                            ? column.foreign_key
                                            : null,
                                });
                            }}
                        >
                            <SelectTrigger id={`${prefix}-type`}>
                                <SelectValue />
                            </SelectTrigger>

                            <SelectContent>
                                {columnTypes.map((type) => (
                                    <SelectItem
                                        key={type}
                                        value={type}
                                    >
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={`${prefix}-nullable`}
                            checked={column.nullable}
                            disabled={disabled}
                            onCheckedChange={(value) =>
                                update({
                                    nullable: value === true,
                                })
                            }
                        />

                        <Label htmlFor={`${prefix}-nullable`}>
                            {t("nullable")}
                        </Label>
                    </div>

                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={`${prefix}-constant`}
                            checked={column.constant}
                            disabled={disabled}
                            onCheckedChange={(value) =>
                                update({
                                    constant: value === true,
                                })
                            }
                        />

                        <Label htmlFor={`${prefix}-constant`}>
                            {t("constant")}
                        </Label>
                    </div>
                </div>

                <Collapsible>
                    <div className="flex items-center justify-between gap-2">
                        <CollapsibleTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                            >
                                <Settings2 />
                                {t("advanced")}
                            </Button>
                        </CollapsibleTrigger>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={disabled}
                            onClick={onRemove}
                            aria-label={t("removeColumn")}
                        >
                            <Trash2 />
                        </Button>
                    </div>

                    <CollapsibleContent className="flex flex-col gap-4 pt-4">
                        <Separator />

                        <div className="flex flex-col gap-2">
                            <Label htmlFor={`${prefix}-description`}>
                                {t("description")}
                            </Label>

                            <Textarea
                                id={`${prefix}-description`}
                                value={column.description ?? ""}
                                disabled={disabled}
                                maxLength={2000}
                                onChange={(event) =>
                                    update({
                                        description:
                                            event.target.value || null,
                                    })
                                }
                            />
                        </div>

                        {column.type === "UUID" && (
                            <div className="flex flex-col gap-2">
                                <Label htmlFor={`${prefix}-fk`}>
                                    {t("foreignKey")}
                                </Label>

                                <Select
                                    value={
                                        column.foreign_key ?? "none"
                                    }
                                    disabled={disabled}
                                    onValueChange={(value) =>
                                        update({
                                            foreign_key:
                                                value === "none"
                                                    ? null
                                                    : value,
                                        })
                                    }
                                >
                                    <SelectTrigger id={`${prefix}-fk`}>
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="none">
                                            {t("noForeignKey")}
                                        </SelectItem>

                                        {models.map((model) => (
                                            <SelectItem
                                                key={model.id}
                                                value={model.id}
                                            >
                                                {model.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id={`${prefix}-has-default`}
                                checked={
                                    column.default_value !== null
                                }
                                disabled={disabled}
                                onCheckedChange={(value) =>
                                    update({
                                        default_value:
                                            value === true
                                                ? column.default_value ?? ""
                                                : null,
                                    })
                                }
                            />

                            <Label htmlFor={`${prefix}-has-default`}>
                                {t("hasDefault")}
                            </Label>
                        </div>

                        {column.default_value !== null && (
                            <div className="flex flex-col gap-2">
                                <Label htmlFor={`${prefix}-default`}>
                                    {t("defaultValue")}
                                </Label>

                                <Input
                                    id={`${prefix}-default`}
                                    value={column.default_value}
                                    disabled={disabled}
                                    maxLength={10000}
                                    onChange={(event) =>
                                        update({
                                            default_value:
                                                event.target.value,
                                        })
                                    }
                                />
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <Label htmlFor={`${prefix}-values`}>
                                {t("possibleValues")}
                            </Label>

                            <Textarea
                                id={`${prefix}-values`}
                                value={column.possibleValuesText}
                                disabled={disabled}
                                onChange={(event) =>
                                    update({
                                        possibleValuesText:
                                            event.target.value,
                                    })
                                }
                            />

                            <p>{t("possibleValuesDescription")}</p>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </CardContent>
        </Card>
    );
}
