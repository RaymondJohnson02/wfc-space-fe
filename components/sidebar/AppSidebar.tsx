"use client";

import { useEffect, useState } from "react";
import type { ChatMessage } from "@/components/chat/ChatSidebar";
import SidebarActivityBar from "./SidebarActivityBar";
import SidebarPanel from "./SidebarPanel";
import type { AppNotification, RoomParticipant, SidebarTab } from "./types";

interface AppSidebarProps {
    roomId: string;
    participants: RoomParticipant[];
    currentUsername?: string | null;
    chatMessages: ChatMessage[];
    chatDraft: string;
    onChatDraftChange: (value: string) => void;
    onSendChatMessage: () => void;
    chatDisabled?: boolean;
    notifications: AppNotification[];
    onClearNotifications: () => void;
    defaultTab?: SidebarTab;
}

export default function AppSidebar({
    roomId,
    participants,
    currentUsername,
    chatMessages,
    chatDraft,
    onChatDraftChange,
    onSendChatMessage,
    chatDisabled = false,
    notifications,
    onClearNotifications,
    defaultTab = "chat",
}: AppSidebarProps) {
    const [activeTab, setActiveTab] = useState<SidebarTab | null>(defaultTab);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);
    const [lastSeenMsgCount, setLastSeenMsgCount] = useState(chatMessages.length);
    const [lastSeenNotifCount, setLastSeenNotifCount] = useState(notifications.length);

    // Update unread chat counts when new messages arrive
    useEffect(() => {
        if (activeTab === "chat") {
            setUnreadChatCount(0);
            setLastSeenMsgCount(chatMessages.length);
        } else {
            const diff = chatMessages.length - lastSeenMsgCount;
            if (diff > 0) {
                setUnreadChatCount(diff);
            }
        }
    }, [chatMessages.length, activeTab, lastSeenMsgCount]);

    // Update unread notification count
    useEffect(() => {
        if (activeTab === "notification") {
            setUnreadNotifCount(0);
            setLastSeenNotifCount(notifications.length);
        } else {
            const diff = notifications.length - lastSeenNotifCount;
            if (diff > 0) {
                setUnreadNotifCount(diff);
            }
        }
    }, [notifications.length, activeTab, lastSeenNotifCount]);

    const handleSelectTab = (tab: SidebarTab) => {
        if (activeTab === tab) {
            // Toggle / collapse panel if clicking current active tab
            setActiveTab(null);
        } else {
            setActiveTab(tab);
            if (tab === "chat") {
                setUnreadChatCount(0);
                setLastSeenMsgCount(chatMessages.length);
            } else if (tab === "notification") {
                setUnreadNotifCount(0);
                setLastSeenNotifCount(notifications.length);
            }
        }
    };

    const isExpanded = activeTab !== null;

    return (
        <aside
            id="app-ide-sidebar"
            aria-label="Application Sidebar"
            className={`fixed inset-y-0 left-0 z-50 flex h-full select-none transition-all duration-150 ${
                isExpanded
                    ? "rounded-r-xl border-y border-r bg-background shadow-md overflow-hidden"
                    : "bg-sidebar"
            }`}
        >
            <SidebarActivityBar
                activeTab={activeTab}
                onSelectTab={handleSelectTab}
                unreadChatCount={unreadChatCount}
                unreadNotificationCount={unreadNotifCount}
            />

            <SidebarPanel
                activeTab={activeTab}
                onClose={() => setActiveTab(null)}
                roomId={roomId}
                participants={participants}
                currentUsername={currentUsername}
                chatMessages={chatMessages}
                chatDraft={chatDraft}
                onChatDraftChange={onChatDraftChange}
                onSendChatMessage={onSendChatMessage}
                chatDisabled={chatDisabled}
                notifications={notifications}
                onClearNotifications={onClearNotifications}
            />
        </aside>
    );
}
