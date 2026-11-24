export type Direction = "up" | "down" | "left" | "right";

export interface PlayerState {
  id: string;
  username: string;
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
  zoneId: string | null;
}

export interface RoomChatMessage {
  id: string;
  senderId: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface Zone {
  id: string;
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type ClientEvent =
  | {
      type: "join";
      username: string;
    }
  | {
      type: "move";
      x: number;
      y: number;
      direction: Direction;
      isMoving: boolean;
      zoneId?: string | null;
    }
  | {
      type: "chat";
      message: string;
    };

export type ServerEvent =
  | {
      type: "room_users";
      selfId: string;
      users: PlayerState[];
    }
  | {
      type: "user_joined";
      user: PlayerState;
    }
  | {
      type: "user_moved";
      id: string;
      x: number;
      y: number;
      direction: Direction;
      isMoving: boolean;
      zoneId: string | null;
    }
  | {
      type: "user_left";
      id: string;
      username: string;
    }
  | {
      type: "message_received";
      message: RoomChatMessage;
    };
