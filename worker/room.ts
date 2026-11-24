import {
  routePartykitRequest,
  Server,
  type Connection,
  type WSMessage,
} from "partyserver";
import { SPAWN_PIXEL_X, SPAWN_PIXEL_Y } from "../shared/mapConfig";
import type {
  ClientEvent,
  PlayerState,
  RoomChatMessage,
  ServerEvent,
} from "../shared/types";

function sendEvent(connection: Connection, event: ServerEvent): void {
  connection.send(JSON.stringify(event));
}

function parseClientEvent(message: WSMessage): ClientEvent | null {
  if (typeof message !== "string") return null;

  try {
    const parsed = JSON.parse(message) as Partial<ClientEvent>;
    if (!parsed || typeof parsed.type !== "string") return null;
    return parsed as ClientEvent;
  } catch {
    return null;
  }
}

export class Room extends Server<Env> {
  static options = {
    hibernate: true,
  };

  onMessage(connection: Connection<PlayerState>, message: WSMessage): void {
    const event = parseClientEvent(message);
    if (!event) return;

    switch (event.type) {
      case "join": {
        const trimmedName = event.username.trim().slice(0, 25);
        if (!trimmedName) return;

        const player: PlayerState = {
          id: connection.id,
          username: trimmedName,
          x: SPAWN_PIXEL_X,
          y: SPAWN_PIXEL_Y,
          direction: "down",
          isMoving: false,
          zoneId: null,
        };

        connection.setState(player);

        const activeUsers: PlayerState[] = [];
        for (const conn of this.getConnections<PlayerState>()) {
          if (conn.state) {
            activeUsers.push(conn.state);
          }
        }

        sendEvent(connection, {
          type: "room_users",
          selfId: connection.id,
          users: activeUsers,
        });

        const joinedEvent: ServerEvent = {
          type: "user_joined",
          user: player,
        };
        this.broadcast(JSON.stringify(joinedEvent), [connection.id]);
        break;
      }

      case "move": {
        const current = connection.state;
        if (!current) return;

        const zoneId = event.zoneId ?? null;
        connection.setState({
          ...current,
          x: event.x,
          y: event.y,
          direction: event.direction,
          isMoving: event.isMoving,
          zoneId,
        });

        const movedEvent: ServerEvent = {
          type: "user_moved",
          id: connection.id,
          x: event.x,
          y: event.y,
          direction: event.direction,
          isMoving: event.isMoving,
          zoneId,
        };
        this.broadcast(JSON.stringify(movedEvent), [connection.id]);
        break;
      }

      case "chat": {
        const current = connection.state;
        if (!current) return;

        const trimmedMessage = event.message.trim();
        if (!trimmedMessage) return;

        const chatMessage: RoomChatMessage = {
          id: crypto.randomUUID(),
          senderId: connection.id,
          username: current.username,
          message: trimmedMessage,
          timestamp: Date.now(),
        };

        const chatEvent: ServerEvent = {
          type: "message_received",
          message: chatMessage,
        };
        this.broadcast(JSON.stringify(chatEvent));
        break;
      }
    }
  }

  onClose(connection: Connection<PlayerState>): void {
    const current = connection.state;
    if (!current) return;

    const leftEvent: ServerEvent = {
      type: "user_left",
      id: connection.id,
      username: current.username,
    };
    this.broadcast(JSON.stringify(leftEvent), [connection.id]);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await routePartykitRequest(request, env);
    return response ?? new Response("Not found", { status: 404 });
  },
};
