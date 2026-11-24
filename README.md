# WFC Space

Interactive 2D virtual office built with **Vite + React 19 + TypeScript**, **Phaser**, **Zustand**, **Tailwind CSS v4 + Shadcn UI**, and **Cloudflare `PartyServer`** (`Workers` + `Durable Objects`).

## Tech Stack

- **Frontend:** Vite, React 19, TypeScript, React Router (`react-router-dom`)
- **2D World:** Phaser (`OfficeScene`, `PlayerEntity`) with 4-directional grid-snapped movement
- **UI & Styling:** Tailwind CSS v4, Shadcn UI (`@base-ui/react`), Lucide React
- **State:** Zustand (`src/stores/`)
- **Realtime Sync:** Cloudflare `PartyServer` (`worker/room.ts` + `wrangler`) via `src/services/roomTransport.ts`

## Project Structure

```text
├── public/assets/sprites/   # Character sprite frames
├── shared/                  # Shared TS types & 60×40 office map config
├── worker/                  # Cloudflare PartyServer Durable Object (room.ts)
└── src/
    ├── game/                # PhaserGame, OfficeScene, PlayerEntity, animations
    ├── stores/              # Zustand stores (useRoomStore, useChatStore)
    ├── services/            # roomTransport (PartySocket wrapper)
    ├── pages/               # LobbyPage (/), RoomPage (/room/:id)
    └── components/          # Shadcn UI, LobbyLayout, RoomLobbyCard, AppSidebar
```

## Getting Started

Install dependencies:

```bash
bun install
```

Run both Vite and the local Cloudflare `PartyServer` worker in one terminal:

```bash
bun dev
```

Or run them separately:

```bash
bun run dev:client   # Vite frontend (http://localhost:5173)
bun run dev:worker   # Wrangler PartyServer worker (http://127.0.0.1:8787)
```

## Verification

```bash
bunx tsc --noEmit
bunx tsc -p tsconfig.worker.json --noEmit
bun run lint
bun run build
```
