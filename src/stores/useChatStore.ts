import { create } from "zustand";
import type { RoomChatMessage } from "@shared/types";
import type { AppNotification } from "@/components/sidebar/types";

const SPEECH_BUBBLE_TTL_MS = 3000;

export interface SpeechBubbleState {
  message: string;
  expiresAt: number;
}

interface ChatStoreState {
  messages: RoomChatMessage[];
  notifications: AppNotification[];
  speechBubbles: Record<string, SpeechBubbleState>;
  addMessage: (message: RoomChatMessage) => void;
  addNotification: (
    notification: Omit<AppNotification, "id" | "timestamp" | "read">,
  ) => void;
  clearNotifications: () => void;
  pruneExpiredBubbles: (now?: number) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  messages: [] as RoomChatMessage[],
  notifications: [] as AppNotification[],
  speechBubbles: {} as Record<string, SpeechBubbleState>,
};

export const useChatStore = create<ChatStoreState>((set) => ({
  ...INITIAL_STATE,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      speechBubbles: {
        ...state.speechBubbles,
        [message.senderId]: {
          message: message.message,
          expiresAt: Date.now() + SPEECH_BUBBLE_TTL_MS,
        },
      },
    })),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: new Date(),
          read: false,
        },
        ...state.notifications,
      ],
    })),

  clearNotifications: () => set({ notifications: [] }),

  pruneExpiredBubbles: (now = Date.now()) =>
    set((state) => {
      let hasExpired = false;
      const nextBubbles: Record<string, SpeechBubbleState> = {};

      for (const [playerId, bubble] of Object.entries(state.speechBubbles)) {
        if (bubble.expiresAt > now) {
          nextBubbles[playerId] = bubble;
        } else {
          hasExpired = true;
        }
      }

      return hasExpired ? { speechBubbles: nextBubbles } : state;
    }),

  reset: () => set(INITIAL_STATE),
}));
