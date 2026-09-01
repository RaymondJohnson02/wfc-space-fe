"use client";

import Image from "next/image";
import { Bell, Compass, MessageSquare } from "lucide-react";
import logoImg from "@/asset/logo-wfc-space.png";
import type { SidebarTab } from "./types";

interface SidebarActivityBarProps {
    activeTab: SidebarTab | null;
    onSelectTab: (tab: SidebarTab) => void;
    unreadChatCount?: number;
    unreadNotificationCount?: number;
    onDisconnect?: () => void;
}

interface ActivityBarItem {
    id: SidebarTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeCount?: number;
}

export default function SidebarActivityBar({
    activeTab,
    onSelectTab,
    unreadChatCount = 0,
    unreadNotificationCount = 0,
    onDisconnect,
}: SidebarActivityBarProps) {
    const items: ActivityBarItem[] = [
        {
            id: "space",
            label: "Space",
            icon: Compass,
        },
        {
            id: "chat",
            label: "Chat",
            icon: MessageSquare,
            badgeCount: unreadChatCount,
        },
        {
            id: "notification",
            label: "Notifications",
            icon: Bell,
            badgeCount: unreadNotificationCount,
        },
    ];

    return (
        <nav
            aria-label="Activity Bar"
            className="relative flex h-full w-13 shrink-0 flex-col items-center border-r bg-sidebar py-2.5 select-none"
        >
            <div className="flex w-full flex-col items-center gap-1.5">
                {/* Topmost Logo / Home Button */}
                <button
                    id="activity-bar-logo-btn"
                    type="button"
                    title="Leave room & return to lobby"
                    aria-label="Leave room and return to lobby"
                    onClick={onDisconnect}
                    className="group relative flex h-11 w-11 items-center justify-center rounded-lg cursor-pointer transition-transform duration-150 hover:scale-105 hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <div className="relative size-8 overflow-hidden rounded-lg shadow-xs transition-shadow group-hover:shadow-md">
                        <Image
                            src={logoImg}
                            alt="WFC Space Logo"
                            width={32}
                            height={32}
                            className="size-full object-cover"
                            priority
                        />
                    </div>
                </button>

                {/* Subtle Divider */}
                <div className="w-7 h-px bg-border/60 my-0.5" aria-hidden="true" />

                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const hasBadge = (item.badgeCount ?? 0) > 0;

                    return (
                        <button
                            key={item.id}
                            id={`activity-bar-item-${item.id}`}
                            type="button"
                            title={item.label}
                            aria-label={item.label}
                            aria-pressed={isActive}
                            onClick={() => onSelectTab(item.id)}
                            className={`group relative flex h-11 w-11 items-center justify-center rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                            }`}
                        >
                            {/* Left active indicator pill (VS Code style) */}
                            {isActive && (
                                <span
                                    className="absolute left-0 top-2 bottom-2 w-0.75 rounded-r-full bg-primary"
                                    aria-hidden="true"
                                />
                            )}

                            <Icon className="size-5 transition-transform duration-150 group-hover:scale-105" />

                            {/* Badge counter */}
                            {hasBadge && (
                                <span
                                    className="absolute top-1.5 right-1.5 flex min-w-4 h-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm"
                                    aria-label={`${item.badgeCount} unread`}
                                >
                                    {item.badgeCount! > 99 ? "99+" : item.badgeCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
