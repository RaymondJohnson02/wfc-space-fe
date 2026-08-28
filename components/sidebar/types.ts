export type SidebarTab = "space" | "chat" | "notification";

export interface AppNotification {
    id: string;
    type: "user_joined" | "user_left" | "system" | "chat";
    title: string;
    description: string;
    timestamp: Date;
    read: boolean;
}

export interface RoomParticipant {
    id: string;
    username: string;
    x: number;
    y: number;
    isMoving: boolean;
    isSelf: boolean;
}
