import PartySocket from "partysocket";
import type { ClientEvent, Direction, ServerEvent } from "@shared/types";
import { useChatStore } from "@/stores/useChatStore";
import { useRoomStore } from "@/stores/useRoomStore";

class RoomTransport {
  private socket: PartySocket | null = null;

  connect(roomId: string, username: string): void {
    this.closeSocketOnly();

    const roomStore = useRoomStore.getState();
    const chatStore = useChatStore.getState();
    chatStore.reset();
    roomStore.setConnecting(roomId, username);

    const host =
      import.meta.env.VITE_PARTYSERVER_HOST || window.location.host;

    const socket = new PartySocket({
      host,
      party: "room",
      room: roomId,
    });

    socket.addEventListener("open", () => {
      this.send({ type: "join", username });
    });

    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;

      let parsed: ServerEvent;
      try {
        parsed = JSON.parse(event.data) as ServerEvent;
      } catch {
        return;
      }

      this.handleServerEvent(roomId, parsed);
    });

    socket.addEventListener("error", () => {
      useRoomStore
        .getState()
        .setError(
          "Connection failed. Make sure the PartyServer worker is running (bun run dev:worker).",
        );
    });

    this.socket = socket;
  }

  sendMove(
    x: number,
    y: number,
    direction: Direction,
    isMoving: boolean,
    zoneId: string | null = null,
  ): void {
    this.send({
      type: "move",
      x,
      y,
      direction,
      isMoving,
      zoneId,
    });
  }

  sendChat(message: string): void {
    const trimmed = message.trim();
    if (!trimmed) return;
    this.send({ type: "chat", message: trimmed });
  }

  disconnect(): void {
    this.closeSocketOnly();
    useRoomStore.getState().reset();
    useChatStore.getState().reset();
  }

  private closeSocketOnly(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private send(event: ClientEvent): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(event));
  }

  private handleServerEvent(roomId: string, event: ServerEvent): void {
    const roomStore = useRoomStore.getState();
    const chatStore = useChatStore.getState();

    switch (event.type) {
      case "room_users": {
        roomStore.setConnected(event.selfId, event.users);
        chatStore.addNotification({
          type: "system",
          title: "Connected",
          description: `Joined ${roomId} (${event.users.length} online).`,
        });
        break;
      }

      case "user_joined": {
        roomStore.addPlayer(event.user);
        chatStore.addNotification({
          type: "user_joined",
          title: "User Joined",
          description: `${event.user.username} entered the room.`,
        });
        break;
      }

      case "user_moved": {
        roomStore.updatePlayerPosition(
          event.id,
          event.x,
          event.y,
          event.direction,
          event.isMoving,
          event.zoneId,
        );
        break;
      }

      case "user_left": {
        roomStore.removePlayer(event.id);
        chatStore.addNotification({
          type: "user_left",
          title: "User Left",
          description: `${event.username} left the room.`,
        });
        break;
      }

      case "message_received": {
        chatStore.addMessage(event.message);
        break;
      }
    }
  }
}

export const roomTransport = new RoomTransport();
