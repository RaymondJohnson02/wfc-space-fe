# WFC Space — Architecture Migration Plan

> **Status:** Planning document only. No project source files have been modified yet.
> **Goal:** Transition `wfc-space-fe` to the `CHECKPOINTS.md` tech stack (capable of **10+ concurrent users** with smooth 60 FPS rendering and reliable proximity A/V) while **reusing all valuable UI, styling, assets, and room flows already built**, and keeping a clean path back to a full-stack SaaS product later.

---

## 1. Decision: Are We Ditching the Backend for Now?

**Yes — pause/archive the separate ASP.NET Core + SignalR backend for now.**

Instead of maintaining two repos and two languages (C# + TypeScript) during the MVP build:
- **Cloudflare `PartyServer` (Workers + Durable Objects)** replaces the SignalR hub as a lightweight TypeScript WebSocket room server living inside this same repository (`worker/room.ts`), sharing exact TypeScript types with the frontend. *(Note: standalone `partykit.dev` shut down in Oct 2026; `partyserver` + `wrangler` is its official Cloudflare successor.)*
- **LiveKit (SFU)** replaces the raw P2P WebRTC voice POC so **10+ concurrent users** can share audio, video, and screenshares reliably across NATs/firewalls.
  - **Cost strategy:** Develop and test for **$0** on LiveKit Cloud's free Build Plan (5,000 participant-minutes/mo, 50 GB egress), connect lazily only when near peers or inside a meeting zone, and switch to **self-hosted open-source LiveKit (Docker on a ~$5–$10/mo VPS)** via `.env` config if daily 8h × 10-person usage outgrows the free tier.
- **No traditional database/auth yet:** Guest names + `localStorage` (already implemented in `RoomLobbyCard.tsx`) keep iteration fast.

### Keeping the Door Open for a Full-Stack Product Later
Pausing the custom backend now does **not** lock you out of building a real SaaS later. If we enforce two thin boundaries from day one:
1. **`src/services/roomTransport.ts`** — All WebSocket/PartySocket code stays behind a transport interface that writes into Zustand. Phaser and React never import `partysocket` directly. (Swapping back to SignalR or a custom Node/Go WebSocket server later only touches this file.)
2. **`src/services/livekit.ts`** — Server URL and token fetching stay behind environment variables + an async `fetchLiveKitToken(roomId, username)` function. Swapping from LiveKit Cloud → self-hosted LiveKit (or adding authenticated backend token signing) requires zero UI/game changes.

When you are ready for accounts, saved offices, persistent chat, or billing, you can add a backend (ASP.NET Core, Supabase, or Node/Hono) alongside this Vite + Phaser + LiveKit + PartyServer setup without rewriting the frontend.

---

## 2. Target Tech Stack Summary

| Layer | Current Stack | Target Stack (`CHECKPOINTS.md` Updated) | Why Change? |
|---|---|---|---|
| **Build & Routing** | Next.js 16 (App Router, SSR) | **Vite + React 19 + React Router** (Pure Client SPA) | Virtual offices are 100% browser-API driven (WebGL, Web Audio, WebRTC). Removes SSR hydration workarounds (`ssr: false`, `'use client'`). |
| **UI & Styling** | Tailwind CSS v4 + Shadcn (`@base-ui/react`) + Lucide | **Keep as-is** | Already polished and framework-agnostic. |
| **2D World & Physics** | DOM `<div>` grid (2,400 nodes) + CSS `translate3d` | **Phaser 3** (Canvas/WebGL + Tilemaps + Arcade Physics) | Eliminates DOM overhead, gives real collisions, Y-sorting, smooth camera follow, and 60 FPS with 10+ avatars. |
| **State Management** | React `useState` / `useEffect` in `HomeClient.tsx` | **Zustand** (external store) | Stops 10x/sec `walkFrame` and socket updates from re-rendering the entire React tree. |
| **Realtime Sync** | Separate ASP.NET Core + `@microsoft/signalr` | **Cloudflare `PartyServer`** (`partyserver` + `partysocket` + `wrangler`) | Single TS codebase, shared types, zero server ops, free Cloudflare Durable Objects tier (100k req/day). |
| **Audio / Video** | Raw WebRTC P2P Mesh + STUN (`app/voice-poc`) | **LiveKit** (`livekit-client` + `@livekit/components-react`) | P2P mesh breaks past ~4–6 users with video and lacks TURN. Dev free on LiveKit Cloud; self-host open-source LiveKit via Docker (~$5–$10/mo VPS) if daily 8h × 10-user traffic outgrows free minutes. |

---

## 3. Codebase Audit: Keep vs. Adapt vs. Replace vs. Drop

You do **not** need to start from scratch. A large portion of your UI, styling, and assets can be carried over directly.

### A. Keep As-Is (Direct Copy / Minimal to Zero Changes)
These files have **zero Next.js dependencies** and are ready to reuse:

- **Shadcn UI primitives & utilities**
  - `components/ui/button.tsx`
  - `components/ui/input.tsx`
  - `components/ui/scroll-area.tsx`
  - `components/ui/separator.tsx`
  - `lib/utils.ts`
  - `components.json`
- **Sidebar & Chat UI panels**
  - `components/sidebar/ChatPanel.tsx`
  - `components/sidebar/NotificationPanel.tsx`
  - `components/sidebar/SidebarPanel.tsx`
  - `components/sidebar/types.ts`
  - `components/chat/ChatSidebar.tsx`
  - `components/auth/LoginModal.tsx` *(keep as placeholder or hide trigger until real auth is added)*
- **Theme & Design System**
  - `app/globals.css` → move to `src/index.css` (keeps all Tailwind v4 tokens, OKLCH light/dark palette, and animations; only update Geist font loading since `next/font` is removed).
- **Visual Assets**
  - `asset/character_beige_*.png` (all 12 sprite frames) → move to `public/assets/sprites/` so Phaser can preload them cleanly.
  - `asset/logo-wfc-space.png` and `asset/logo.png` → move to `src/assets/` or `public/assets/`.

### B. Reuse & Adapt (Small Refactors)
These already represent real progress (Lobby, Room Picker, Sidebar Shell, Map layout) and only need light adaptation:

| Current File | Target Location | Changes Needed |
|---|---|---|
| `app/page.tsx` | `src/pages/LobbyPage.tsx` | Replace `next/link` with `react-router-dom` `Link`. Remove the `/voice-poc` banner once LiveKit is built into rooms. |
| `components/layout/LobbyLayout.tsx` | `src/components/layout/LobbyLayout.tsx` | Replace `next/image` with standard `<img>`, `next/link` with `Link`, remove `"use client"`. |
| `components/lobby/RoomLobbyCard.tsx` | `src/components/lobby/RoomLobbyCard.tsx` | Replace `next/link` with `Link`. Later (CP 8) extend with avatar color picker & mic/cam preview. |
| `components/sidebar/AppSidebar.tsx` | `src/components/sidebar/AppSidebar.tsx` | Read/write chat, notifications, and participants from **Zustand** instead of prop-drilling from `HomeClient`. Replace the `useEffect` unread counters with derived state in Zustand. |
| `components/sidebar/SidebarActivityBar.tsx` | `src/components/sidebar/SidebarActivityBar.tsx` | Replace `next/image` with `<img>`. |
| `components/sidebar/SpacePanel.tsx` | `src/components/sidebar/SpacePanel.tsx` | Replace `next/link` with `Link`. |
| `constants/officeMap.ts` & `constants/MapConstants.ts` | `shared/mapConfig.ts` | Reuse your room layout dimensions (`60x40`, corridor + 8 rooms, spawn coordinates) as the starting blueprint for the Phaser tilemap and add `zoneId` regions (for private meeting rooms in CP 5). |
| `constants/characterSprites.ts` | `src/game/animations.ts` | Keep `Direction` type and key-mapping logic; remove `StaticImageData` (`next/image`) and register Phaser sprite animations using the existing `character_beige_*.png` frames. |

### C. Replace (Core Engine & Realtime Upgrades)
These files are tightly coupled to DOM rendering, React `useEffect` game loops, SignalR, or P2P WebRTC and should be replaced with the new architecture:

| Current File(s) | Replacement | Reason |
|---|---|---|
| `components/Map.tsx` & `components/Tile.tsx` | `src/game/OfficeScene.ts` (Phaser Tilemap) | Replaces 2,400 DOM `<div>`s with hardware-accelerated Canvas/WebGL tilemap layers + Arcade Physics walls/furniture. |
| `components/Character.tsx` & `components/chat/SpeechBubble.tsx` | `src/game/PlayerEntity.ts` (Phaser Sprite + Container) | Renders avatar sprite, directional animation, smooth `lerp`, floating nametag, and speech/emoji bubble inside Phaser at 60 FPS. |
| `components/HomeClient.tsx` | `src/pages/RoomPage.tsx` + `src/game/PhaserGame.tsx` + `src/stores/*` | Splits the 765-line monolith into: (1) Zustand stores for room/chat/media state, (2) Phaser canvas wrapper, and (3) React HUD overlays (`AppSidebar`, media toolbar, LiveKit video bubbles). |
| `services/signalr.ts` | `worker/room.ts` + `src/services/roomTransport.ts` | Replaces ASP.NET Core SignalR connection with Cloudflare `PartyServer` room worker + abstracted client transport. |
| `app/voice-poc/page.tsx` | `src/services/livekit.ts` + `src/components/media/*` | Replaces standalone P2P voice POC with room-integrated LiveKit audio/video/screenshare + proximity distance attenuation. |

### D. Drop / Remove
- `next.config.ts`, `next-env.d.ts`, `app/layout.tsx`, `app/room/[id]/page.tsx` (replaced by Vite `index.html`, `vite.config.ts`, `src/App.tsx`).
- `eslint-config-next` (replace with standard Vite React/TS ESLint config).
- `@microsoft/signalr` dependency.
- Separate ASP.NET Core backend *(keep its repo archived intact as a reference or future full-stack API foundation)*.

---

## 4. Target Workspace Structure

```text
wfc-space-fe/
├── index.html
├── vite.config.ts
├── wrangler.jsonc               # Cloudflare Workers + Durable Objects config
├── package.json
├── public/
│   └── assets/
│       ├── sprites/             # Moved from asset/character_beige_*.png
│       └── maps/                # Tiled JSON tilemap + tileset (CP 1)
├── shared/
│   ├── types.ts                 # PlayerState, Zone, ClientEvents, ServerEvents
│   └── mapConfig.ts             # Shared zones, spawn points, room metadata
├── worker/
│   └── room.ts                  # PartyServer WebSocket room (presence, 20Hz move, chat, LK token)
└── src/
    ├── main.tsx
    ├── App.tsx                  # React Router: "/" (LobbyPage), "/room/:id" (RoomPage)
    ├── index.css                # Migrated from app/globals.css
    ├── assets/                  # logo-wfc-space.png
    ├── pages/
    │   ├── LobbyPage.tsx        # Migrated from app/page.tsx
    │   └── RoomPage.tsx         # Thin shell: <PhaserGame /> + <AppSidebar /> + A/V overlays
    ├── stores/
    │   ├── useRoomStore.ts      # Local/remote players, current zoneId, connection status
    │   ├── useChatStore.ts      # Room/proximity messages, unread count, notifications
    │   └── useMediaStore.ts     # Mic/cam/screenshare state, proximity volume map
    ├── services/
    │   ├── roomTransport.ts     # PartySocket wrapper (swappable later)
    │   └── livekit.ts           # Env-driven URL + async token fetcher (Cloud or self-hosted)
    ├── game/
    │   ├── PhaserGame.tsx       # React mount wrapper (no game state in React)
    │   ├── OfficeScene.ts       # Tilemap, collisions, camera, proximity/zone checks
    │   └── PlayerEntity.ts      # Sprite, animations, lerp, nametag, speech bubble
    ├── components/
    │   ├── ui/                  # Kept as-is (Shadcn)
    │   ├── layout/              # Adapted LobbyLayout
    │   ├── lobby/               # Adapted RoomLobbyCard
    │   ├── sidebar/             # Adapted AppSidebar + panels
    │   ├── media/               # LiveKit video bubbles, bottom A/V toolbar (CP 3–7)
    │   └── props/               # Excalidraw / iframe modal overlay (CP 6)
    └── lib/
        └── utils.ts             # Kept as-is
```

---

## 5. Package / Dependency Changes

### Remove
- `next`
- `eslint-config-next`
- `@microsoft/signalr`

### Keep
- `react`, `react-dom`
- `tailwindcss`, `@tailwindcss/postcss` *(or `@tailwindcss/vite`)*, `tw-animate-css`
- `shadcn`, `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`
- `typescript`, `eslint`, `@types/react`, `@types/react-dom`

### Add
- **Build & Routing:** `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `react-router-dom`
- **Game Engine:** `phaser`
- **State:** `zustand`
- **Realtime:** `partyserver`, `partysocket`, `wrangler` *(devDependency)*
- **WebRTC (CP 3+):** `livekit-client`, `@livekit/components-react` *(plus JWT token signing in `worker/room.ts` using Web Crypto / `jose` so API secrets stay off the client)*

---

## 6. How Existing Progress Accelerates `CHECKPOINTS.md`

Because you already built the Lobby, Room Selection, Guest Name persistence, Sidebar, Notifications, Chat UI, and Character Sprites, several checkpoints become much faster:

| Checkpoint | Impact of Existing Progress |
|---|---|
| **CP 0: Scaffolding & Shared Types** | Swap Next.js → Vite + React Router, preserve Shadcn/Tailwind theme, port `LobbyPage`, `LobbyLayout`, `RoomLobbyCard`, and `AppSidebar`, wire up `worker/room.ts` (`PartyServer`) + Zustand stores. |
| **CP 1: 2D World & Movement** | Reuse your `character_beige_*.png` sprites and `officeMap.ts` corridor/room blueprint inside Phaser `OfficeScene`. |
| **CP 2: Multiplayer Sync** | Port your existing SignalR event mental model (`RoomUsers`, `UserJoined`, `UserMoved`, `UserLeft`) directly to `worker/room.ts` + `roomTransport.ts` with 20Hz throttling and Phaser lerp. |
| **CP 3: LiveKit A/V** | Fresh build (replaces `voice-poc`), using LiveKit Cloud Build Plan ($0) for dev and env-driven config so self-hosted LiveKit is a 1-line switch later. |
| **CP 4 & 5: Proximity & Private Zones** | Fresh build; leverages the 8-room + corridor layout already envisioned in `officeMap.ts`. Connect/subscribe to LiveKit lazily when near peers or in a zone to conserve free minutes. |
| **CP 6: Interactive Props** | Fresh build (whiteboard/Excalidraw modal using existing Shadcn styling). |
| **CP 7: Screenshare & Chat** | **Already ~50% done** — `ChatPanel`, `NotificationPanel`, `AppSidebar`, and speech-bubble UX already exist; just hook them into Zustand + PartyServer and add LiveKit screenshare. |
| **CP 8: Lobby, Polish & Deploy** | **Already ~60% done** — `LobbyPage` and `RoomLobbyCard` (with `localStorage` guest name) are built; just add avatar selection, mic/cam preview, and deploy (Cloudflare Pages/Vercel + `wrangler deploy`). |

---

## 7. Step-by-Step Parity Migration Plan

Goal: Reach **100% feature parity** with the current working app (Lobby → Room Entry → 2D Office Map & Movement → Multiplayer Sync → Sidebar, Chat, Notifications & Speech Bubbles) on the new stack before moving to Checkpoints 3–8. Each step ends in a verifiable state.

### Step 1: Git Branch & Vite + React Router Scaffold
1. Create a clean git branch (`feat/migrate-phaser-partyserver`) so the current Next.js + SignalR version stays preserved in git history.
2. Update `package.json`:
   - Remove `next`, `eslint-config-next`, `@microsoft/signalr`.
   - Add `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `react-router-dom`, `phaser`, `zustand`, `partyserver`, `partysocket`, and `wrangler`.
3. Add `index.html`, `vite.config.ts` (with `@` path alias + Tailwind plugin), updated `tsconfig.json`, and ESLint config (including the `no-useEffect` rule — see Section 8).
4. Move `app/globals.css` → `src/index.css` (keep exact Tailwind v4 / OKLCH theme; load Geist fonts via CSS/Google Fonts instead of `next/font`) and copy `lib/utils.ts` + `components/ui/*` untouched into `src/`.
5. Move `asset/character_beige_*.png` → `public/assets/sprites/` and logos → `src/assets/`.
6. Remove Next.js-only files (`next.config.ts`, `next-env.d.ts`, `app/`).
- **Verify:** `bun run dev` starts cleanly with zero TS errors and renders a Shadcn-styled route.

### Step 2: Port Lobby, Room Entry Card & Sidebar UI
1. Set up `src/App.tsx` with React Router (`/` → `LobbyPage`, `/room/:id` → `RoomPage`).
2. Port `LobbyLayout`, `LoginModal`, `LobbyPage` (from `app/page.tsx`), and `RoomLobbyCard`:
   - Swap `next/link` → `react-router-dom` `Link` and `next/image` → `<img>`.
   - Replace `RoomLobbyCard`'s `localStorage` `useEffect` with a lazy `useState(() => ...)` initializer.
3. Port `AppSidebar`, `SidebarActivityBar`, `SidebarPanel`, `SpacePanel`, `ChatPanel`, `NotificationPanel`, and `ChatSidebar` into `src/components/sidebar/`.
   - Remove `useEffect` unread-count syncing in `AppSidebar` and drive unread counts directly from Zustand actions/selectors.
- **Verify:** Browse `/`, open Login modal, select Cafe/Office/Plaza, enter a guest name on `/room/room-1`, and toggle the left sidebar tabs.

### Step 3: Shared Contracts, Zustand Stores & Cloudflare `PartyServer`
1. Create `shared/types.ts` (`PlayerState`, `ChatMessage`, `ClientEvent`, `ServerEvent`).
2. Create `shared/mapConfig.ts` reusing the `60×40` corridor + 8-room layout and spawn coordinates from `constants/officeMap.ts`.
3. Create Zustand stores:
   - `src/stores/useRoomStore.ts` (local player, remote peers map, connection status, disconnect reset)
   - `src/stores/useChatStore.ts` (messages, unread counts, speech bubbles with 3s expiry, join/leave/system notifications)
4. Create `wrangler.jsonc` + `worker/room.ts` (`PartyServer` Durable Object) implementing `join` (`room_users` + `user_joined`), `move` (`user_moved`), `chat` (`message_received`), and `onClose` (`user_left`).
5. Create `src/services/roomTransport.ts` wrapping `PartySocket` (connect/disconnect triggered explicitly by user actions and container unmount — never `useEffect`).
- **Verify:** Run `wrangler dev` + `bun run dev`, open 2 browser tabs into `/room/room-1`, confirm both appear in `SpacePanel`, log join/leave notifications, and exchange live chat messages.

### Step 4: Phaser 3 2D Office World & Local Movement
1. Create `src/game/PhaserGame.tsx` using a **React 19 callback `ref` with cleanup** (zero `useEffect`) to mount and destroy the Phaser canvas cleanly.
2. Create `src/game/OfficeScene.ts`:
   - Preload the 12 `character_beige_*.png` sprites from `public/assets/sprites/` and register 4-directional idle/walk animations.
   - Render the `60×40` office layout from `shared/mapConfig.ts` with Phaser Arcade Physics wall collisions.
   - Implement WASD / Arrow movement (auto-disabled while typing in inputs) and smooth camera tracking (`startFollow` with lerp + world bounds clamping).
3. Create `src/game/PlayerEntity.ts` (Phaser `Container` with sprite, floating nametag, and 3-second speech bubble).
- **Verify:** Local avatar spawns in the center corridor, walks smoothly in 4 directions, collides with walls/doorways, and camera tracks at 60 FPS.

### Step 5: Wire Multiplayer Movement, Lerp & Speech Bubbles in Phaser
1. Subscribe `OfficeScene` directly to `useRoomStore.subscribe(...)` (outside React's render tree):
   - Spawn/despawn remote `PlayerEntity` instances on peer join/leave.
   - Broadcast local `(x, y, direction, isMoving)` via `roomTransport` at ~20Hz while moving or on stop.
   - Interpolate (`lerp`) remote peer positions per frame in `update()` with directional walk/idle animations.
2. Subscribe `OfficeScene` to `useChatStore` to pop 3-second speech bubbles above the speaking avatar.
3. Wire the sidebar **Disconnect** button (and room unmount cleanup) to close the socket, destroy Phaser, reset Zustand stores, and return to `RoomLobbyCard`.
- **Verify (Full Parity Acceptance Check across 2+ browser tabs):**
  - Open Tab A & Tab B → pick `Office` → join with different names.
  - Both avatars appear with nametags and show up in the **Space** sidebar tab.
  - Moving in Tab A smoothly animates in Tab B without lag or wall clipping.
  - Chat messages appear in the **Chat** tab (with unread badge when closed) AND trigger a 3-second speech bubble above the avatar in both tabs.
  - Closing or disconnecting Tab A removes the avatar in Tab B and logs a **User Left** notification.

### Step 6: Cleanup & Documentation Alignment
1. Run `tsc --noEmit`, `bun run lint`, and `bun run build` to verify zero TypeScript, lint, or bundle errors.
2. Update `AGENTS.md` and `README.md` with the new architecture rules (including the No-`useEffect` rule) and dev commands (`bun run dev` + `wrangler dev`).
3. *(Proceed to `CHECKPOINTS.md` CP 3+: LiveKit A/V, Proximity Fade, Private Zones, Whiteboard Props, Screenshare; switch to self-hosted LiveKit via Docker on a ~$5–$10/mo VPS whenever daily 8h × 10-user usage outgrows LiveKit Cloud's free minutes.)*

---

## 8. New Coding Rule: Ban `useEffect` in React

To eliminate stale closures, React StrictMode double-connections, derived-state cascades, and hard-to-trace timing bugs experienced in the previous stack, **we ban `useEffect` across the React codebase** and enforce it via ESLint (`no-restricted-imports` / `no-restricted-syntax` blocking `useEffect`).

### What Replaces Every Common `useEffect` Pattern

| Old `useEffect` Pattern (Banned) | Clean Replacement in This Stack |
|---|---|
| **Derived state** (e.g., `AppSidebar` unread counts) | Compute directly during render or update atomically inside **Zustand actions** (`addMessage`, `setActiveTab`). |
| **Reading `localStorage`** (e.g., `RoomLobbyCard` saved name) | Use a lazy initializer `useState(() => localStorage.getItem(...) ?? "")` or Zustand `persist`. |
| **WebSocket / PartyServer connect & disconnect** | Trigger `roomTransport.connect()` directly in the **Join event handler** (`onJoin`) and `disconnect()` in the **Disconnect handler** (plus unmount cleanup via callback `ref` if user navigates back). |
| **Game loop, animations, keyboard input, camera** | Lives 100% inside **Phaser (`OfficeScene`)**, completely outside React. |
| **Bridging Phaser ↔ React** | Both read/write **Zustand** (`useRoomStore.subscribe` in Phaser; `useRoomStore(selector)` in React). |
| **Mounting/cleaning up a DOM resource** (Phaser canvas, `<video>`/`<audio>` `srcObject`, `ResizeObserver`) | Use **React 19 callback `ref` cleanup functions**: `ref={(el) => { const instance = mount(el); return () => instance.destroy(); }}`. |
| **LiveKit tracks & media state** | Use LiveKit's official reactive hooks (`useTracks`, `useParticipants`, `useLocalParticipant`) and event listeners inside `services/livekit.ts`. |

> **Enforcement:** Add an ESLint error rule forbidding `useEffect` in `src/` (and document it in `AGENTS.md`). If a third-party library genuinely forces an unavoidable exception, it must be isolated in a single dedicated infrastructure wrapper with an explicit `eslint-disable-next-line` justification — never inside feature components, UI panels, or stores.
