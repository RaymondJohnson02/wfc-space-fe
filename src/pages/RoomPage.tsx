import { useState } from "react";
import { useParams } from "react-router-dom";
import { TILE_SIZE } from "@shared/mapConfig";
import LobbyLayout from "@/components/layout/LobbyLayout";
import RoomLobbyCard from "@/components/lobby/RoomLobbyCard";
import AppSidebar from "@/components/sidebar/AppSidebar";
import type { RoomParticipant } from "@/components/sidebar/types";
import PhaserGame from "@/game/PhaserGame";
import { roomTransport } from "@/services/roomTransport";
import { useChatStore } from "@/stores/useChatStore";
import { useRoomStore } from "@/stores/useRoomStore";

function attachRoomCleanup(node: HTMLDivElement | null) {
  if (!node) return;
  return () => {
    roomTransport.disconnect();
  };
}

function RoomView({ roomId }: { roomId: string }) {
  const [chatDraft, setChatDraft] = useState("");

  const connectionStatus = useRoomStore((s) => s.connectionStatus);
  const connectionError = useRoomStore((s) => s.connectionError);
  const localPlayerId = useRoomStore((s) => s.localPlayerId);
  const localUsername = useRoomStore((s) => s.localUsername);
  const playersMap = useRoomStore((s) => s.players);

  const messages = useChatStore((s) => s.messages);
  const notifications = useChatStore((s) => s.notifications);
  const clearNotifications = useChatStore((s) => s.clearNotifications);

  const isConnecting = connectionStatus === "connecting";
  const isConnected = connectionStatus === "connected";

  const handleJoin = (enteredName: string) => {
    roomTransport.connect(roomId, enteredName);
  };

  const handleDisconnect = () => {
    roomTransport.disconnect();
  };

  const handleSendChatMessage = () => {
    const trimmed = chatDraft.trim();
    if (!trimmed) return;
    roomTransport.sendChat(trimmed);
    setChatDraft("");
  };

  const participants: RoomParticipant[] = Object.values(playersMap).map(
    (player) => ({
      id: player.id,
      username: player.username,
      x: Math.floor(player.x / TILE_SIZE),
      y: Math.floor(player.y / TILE_SIZE),
      isMoving: player.isMoving,
      isSelf: player.id === localPlayerId,
    }),
  );

  return (
    <div ref={attachRoomCleanup} className="min-h-screen">
      {!isConnected ? (
        <LobbyLayout>
          <div className="flex w-full flex-col items-center gap-3">
            <RoomLobbyCard
              roomId={roomId}
              onJoin={handleJoin}
              isConnecting={isConnecting}
            />
            {connectionError && (
              <p className="max-w-md text-center text-xs font-medium text-destructive">
                {connectionError}
              </p>
            )}
          </div>
        </LobbyLayout>
      ) : (
        <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
          <AppSidebar
            roomId={roomId}
            participants={participants}
            currentUsername={localUsername}
            chatMessages={messages}
            chatDraft={chatDraft}
            onChatDraftChange={setChatDraft}
            onSendChatMessage={handleSendChatMessage}
            chatDisabled={!isConnected}
            notifications={notifications}
            onClearNotifications={clearNotifications}
            defaultTab="space"
            onDisconnect={handleDisconnect}
          />

          <main className="h-full w-full pl-13">
            <PhaserGame />
          </main>
        </div>
      )}
    </div>
  );
}

export default function RoomPage() {
  const { id = "room-1" } = useParams<{ id: string }>();
  return <RoomView key={id} roomId={id} />;
}
