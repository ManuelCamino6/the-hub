
"use client";

import { useTranslations } from "next-intl";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    projectRoles,
    type ProjectRole,
} from "@/lib/projects/schemas";

type Props = {
    value: ProjectRole;
    onChange: (value: ProjectRole) => void;
    disabled?: boolean;
};

export function RoleSelect({
    value,
    onChange,
    disabled,
}: Props) {
    const t = useTranslations("Members");

    return (
        <Select
            value={value}
            onValueChange={(value) =>
                onChange(value as ProjectRole)
            }
            disabled={disabled}
        >
            <SelectTrigger
                className="w-full"
                aria-label={t("role")}
            >
                <SelectValue />
            </SelectTrigger>

            <SelectContent>
                {projectRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                        {t(`roles.${role}`)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
