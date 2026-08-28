"use client";

import { Bell, Compass, MessageSquare } from "lucide-react";
import type { SidebarTab } from "./types";

interface SidebarActivityBarProps {
    activeTab: SidebarTab | null;
    onSelectTab: (tab: SidebarTab) => void;
    unreadChatCount?: number;
    unreadNotificationCount?: number;
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
                            className={`group relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
