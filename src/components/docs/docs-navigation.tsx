"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import {
    BookOpen,
    Database,
    Code2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export function DocsNavigation() {
    const pathname = usePathname();
    const t = useTranslations("Docs");

    const items = [
        {
            href: "/docs",
            label: t("overview"),
            icon: BookOpen,
        },
        {
            href: "/docs/model",
            label: t("model"),
            icon: Database,
        },
        {
            href: "/docs/api",
            label: t("apiReference"),
            icon: Code2,
        },
    ];

    return (
        <nav
            aria-label={t("title")}
            className="flex flex-wrap gap-2 md:flex-col"
        >
            {items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;

                return (
                    <Button
                        key={item.href}
                        variant={active ? "secondary" : "ghost"}
                        className="justify-start"
                        asChild
                    >
                        <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                        >
                            <Icon />
                            {item.label}
                        </Link>
                    </Button>
                );
            })}
        </nav>
    );
}