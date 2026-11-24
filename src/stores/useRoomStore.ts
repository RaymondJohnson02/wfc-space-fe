import { create } from "zustand";
import type { Direction, PlayerState } from "@shared/types";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface RoomStoreState {
  roomId: string | null;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  localPlayerId: string | null;
  localUsername: string | null;
  players: Record<string, PlayerState>;
  setConnecting: (roomId: string, username: string) => void;
  setConnected: (selfId: string, users: PlayerState[]) => void;
  setError: (message: string) => void;
  addPlayer: (user: PlayerState) => void;
  updatePlayerPosition: (
    id: string,
    x: number,
    y: number,
    direction: Direction,
    isMoving: boolean,
    zoneId: string | null,
  ) => void;
  removePlayer: (id: string) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  roomId: null,
  connectionStatus: "idle" as ConnectionStatus,
  connectionError: null,
  localPlayerId: null,
  localUsername: null,
  players: {} as Record<string, PlayerState>,
};

export const useRoomStore = create<RoomStoreState>((set) => ({
  ...INITIAL_STATE,

  setConnecting: (roomId, username) =>
    set({
      roomId,
      localUsername: username,
      connectionStatus: "connecting",
      connectionError: null,
    }),

  setConnected: (selfId, users) => {
    const playersById: Record<string, PlayerState> = {};
    for (const user of users) {
      playersById[user.id] = user;
    }
    set({
      localPlayerId: selfId,
      connectionStatus: "connected",
      connectionError: null,
      players: playersById,
    });
  },

  setError: (message) =>
    set({
      connectionStatus: "error",
      connectionError: message,
    }),

  addPlayer: (user) =>
    set((state) => ({
      players: {
        ...state.players,
        [user.id]: user,
      },
    })),

  updatePlayerPosition: (id, x, y, direction, isMoving, zoneId) =>
    set((state) => {
      const existing = state.players[id];
      if (!existing) return state;

      return {
        players: {
          ...state.players,
          [id]: {
            ...existing,
            x,
            y,
            direction,
            isMoving,
            zoneId,
          },
        },
      };
    }),

  removePlayer: (id) =>
    set((state) => {
      if (!state.players[id]) return state;
      const nextPlayers = { ...state.players };
      delete nextPlayers[id];
      return { players: nextPlayers };
    }),

  reset: () => set(INITIAL_STATE),
}));
