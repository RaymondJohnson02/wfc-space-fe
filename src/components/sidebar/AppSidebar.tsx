import { useState } from "react";
import SidebarActivityBar from "./SidebarActivityBar";
import SidebarPanel from "./SidebarPanel";
import type {
  AppNotification,
  ChatMessage,
  RoomParticipant,
  SidebarTab,
} from "./types";

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
  onDisconnect?: () => void;
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
  onDisconnect,
}: AppSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab | null>(defaultTab);
  const [lastSeenMsgCount, setLastSeenMsgCount] = useState(chatMessages.length);
  const [lastSeenNotifCount, setLastSeenNotifCount] = useState(
    notifications.length,
  );

  // Derived unread counts without useEffect cascades
  const unreadChatCount =
    activeTab === "chat"
      ? 0
      : Math.max(0, chatMessages.length - lastSeenMsgCount);
  const unreadNotifCount =
    activeTab === "notification"
      ? 0
      : Math.max(0, notifications.length - lastSeenNotifCount);

  const syncSeenCountForTab = (tab: SidebarTab | null) => {
    if (tab === "chat") {
      setLastSeenMsgCount(chatMessages.length);
    } else if (tab === "notification") {
      setLastSeenNotifCount(notifications.length);
    }
  };

  const handleSelectTab = (tab: SidebarTab) => {
    syncSeenCountForTab(activeTab);

    if (activeTab === tab) {
      setActiveTab(null);
      return;
    }

    syncSeenCountForTab(tab);
    setActiveTab(tab);
  };

  const handleClosePanel = () => {
    syncSeenCountForTab(activeTab);
    setActiveTab(null);
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
        onDisconnect={onDisconnect}
      />

      <SidebarPanel
        activeTab={activeTab}
        onClose={handleClosePanel}
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
