"use client";

import { ChevronLeft, X } from "lucide-react";
import type { ChatMessage } from "@/components/chat/ChatSidebar";
import ChatPanel from "./ChatPanel";
import NotificationPanel from "./NotificationPanel";
import SpacePanel from "./SpacePanel";
import type { AppNotification, RoomParticipant, SidebarTab } from "./types";

interface SidebarPanelProps {
    activeTab: SidebarTab | null;
    onClose: () => void;
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
}

const TAB_TITLES: Record<SidebarTab, string> = {
    space: "Space",
    chat: "Chat",
    notification: "Notifications",
};

export default function SidebarPanel({
    activeTab,
    onClose,
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
}: SidebarPanelProps) {
    if (!activeTab) {
        return null;
    }

    return (
        <section
            aria-label={`${TAB_TITLES[activeTab]} Panel`}
            className="flex h-full w-72 shrink-0 flex-col rounded-r-xl border-y border-r bg-background select-none overflow-hidden"
        >
            {/* Panel Header */}
            <div className="flex h-11 items-center justify-between border-b px-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {TAB_TITLES[activeTab]}
                </span>
                <button
                    id="sidebar-panel-close-btn"
                    type="button"
                    title="Collapse Panel"
                    aria-label="Collapse Panel"
                    onClick={onClose}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                    <ChevronLeft className="size-4" />
                </button>
            </div>

            {/* Panel Content */}
            <div className="flex flex-1 flex-col min-h-0">
                {activeTab === "space" && (
                    <SpacePanel
                        roomId={roomId}
                        participants={participants}
                        currentUsername={currentUsername}
                    />
                )}

                {activeTab === "chat" && (
                    <ChatPanel
                        messages={chatMessages}
                        draft={chatDraft}
                        onDraftChange={onChatDraftChange}
                        onSend={onSendChatMessage}
                        disabled={chatDisabled}
                        roomId={roomId}
                        currentUsername={currentUsername}
                    />
                )}

                {activeTab === "notification" && (
                    <NotificationPanel
                        notifications={notifications}
                        onClearAll={onClearNotifications}
                    />
                )}
            </div>
        </section>
    );
}
