"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import {
    BookOpen,
    Database,
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
    ];

    return (
        <nav
            aria-label={t("title")}
            className="flex flex-wrap gap-2 md:flex-col"
        >
            {items.map((item) => {
                const active =
                    pathname === item.href;

                return (
                    <Button
                        key={item.href}
                        variant={
                            active
                                ? "secondary"
                                : "ghost"
                        }
                        className="justify-start"
                        asChild
                    >
                        <Link
                            href={item.href}
                            aria-current={
                                active
                                    ? "page"
                                    : undefined
                            }
                        >
                            <item.icon />

                            {item.label}
                        </Link>
                    </Button>
                );
            })}
        </nav>
    );
}