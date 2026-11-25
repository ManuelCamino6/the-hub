
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import {
    Building2,
    Code2,
    LayoutDashboard,
    Settings,
    ChevronsUpDown,
    FolderOpen,
    Plus,
    Users,
    Compass,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Project } from "@/lib/projects/schemas";

export function ProjectSidebar({
    project,
}: {
    project: Project;
}) {
    const t = useTranslations("Workspace");
    const projects = useTranslations("Projects");
    const pathname = usePathname();

    const base = `/p/${project.id}`;

    const ProjectIcon =
        project.type === "BUSINESS"
            ? Building2
            : Code2;

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton size="lg">
                                    <ProjectIcon />

                                    <div className="grid flex-1 text-left text-sm">
                                        <span className="truncate font-semibold">
                                            {project.name}
                                        </span>

                                        <span className="truncate text-xs">
                                            {projects(`types.${project.type}`)}
                                        </span>
                                    </div>

                                    <ChevronsUpDown />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                align="start"
                                className="w-56"
                            >
                                <DropdownMenuItem asChild>
                                    <Link href="/projects">
                                        <FolderOpen />
                                        {t("projects")}
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                    <Link href="/projects/new">
                                        <Plus />
                                        {projects("create")}
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>
                        {t("project")}
                    </SidebarGroupLabel>

                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === base}
                            >
                                <Link href={`${base}/connectors`}>
                                    {project.type === "BUSINESS"
                                        ? <LayoutDashboard />
                                        : <Code2 />}

                                    <span>
                                        {project.type === "BUSINESS"
                                            ? t("overview")
                                            : t("connectors")}
                                    </span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        {project.type === "BUSINESS" && (
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.startsWith(`${base}/catalog`)}
                                >
                                    <Link href={`${base}/catalog`}>
                                        <Compass />
                                        <span>{t("catalog")}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}
                    </SidebarMenu>
                </SidebarGroup>

                {project.role === "ADMIN" && (
                    <SidebarGroup>
                        <SidebarGroupLabel>
                            {t("settings")}
                        </SidebarGroupLabel>

                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={
                                        pathname === `${base}/settings`
                                    }
                                >
                                    <Link href={`${base}/settings`}>
                                        <Settings />
                                        <span>{t("general")}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === `${base}/members`}
                                >
                                    <Link href={`${base}/members`}>
                                        <Users />
                                        <span>{t("members")}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                )}
            </SidebarContent>
        </Sidebar>
    );
}