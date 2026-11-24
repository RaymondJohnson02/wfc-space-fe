## 1. Tech Stack & Architecture
- **Frontend**: Vite, React 19, TypeScript (**Pure Client SPA** — no SSR).
- **Routing**: React Router (`react-router-dom`).
- **2D World & Physics**: Phaser 3 (Canvas/WebGL tilemaps, sprites, Arcade Physics, camera).
- **Styling & UI**: Tailwind CSS v4 with Shadcn UI (`@base-ui/react`) and Lucide React (`lucide-react`).
- **State Management**: Zustand (`src/stores/`) for external room, chat, and media state; URL params for room routes.
- **Realtime Sync**: Cloudflare `PartyServer` (`worker/room.ts` + `wrangler`) with `PartySocket` isolated behind `src/services/roomTransport.ts`, sharing contracts in `shared/types.ts`.
- **Audio / Video / Screenshare**: LiveKit (`livekit-client`, `@livekit/components-react`) behind `src/services/livekit.ts` (env-driven URL/token config so LiveKit Cloud → self-hosted Docker is a config-only swap).

## 2. Code Style & Conventions
- **Architecture Boundaries**:
  - Keep all game loops, WASD/Arrow movement, collisions, peer interpolation (`lerp`), and camera tracking inside **Phaser (`src/game/`)** — never inside React components.
  - Bridge Phaser ↔ React exclusively through **Zustand** (`store.subscribe` / `store.getState()` in Phaser; selector hooks in React).
  - Keep `PartySocket` isolated inside `src/services/roomTransport.ts` and LiveKit connection/token logic inside `src/services/livekit.ts` so realtime/media providers remain swappable.
- **File & Component Naming**:
  - Components & Phaser Scenes/Entities: PascalCase (e.g., `SidebarActivityBar.tsx`, `OfficeScene.ts`, `PlayerEntity.ts`).
  - Stores & Hooks: camelCase with `use` prefix (e.g., `useRoomStore.ts`, `useChatStore.ts`).
  - Services & Utilities: camelCase (e.g., `roomTransport.ts`, `formatDate.ts`).
- **Imports**:
  - Use path aliases (e.g., `@/components/...`, `@/stores/...`, `@/services/...`, `@/lib/...`, `@shared/...`).
  - Group imports: built-ins -> external libraries -> internal modules -> styles.
- **Explicit, Self-Documenting Code**:
  - Extract meaningful domain checks, thresholds, and compound conditions into clearly named booleans or predicate functions so code stays readable for both humans and agents (trivial null guards like `if (!user) return;` don't need wrapping).
  ```ts
  // Explicit (preferred)
  const isAdult = age >= 18;
  if (isAdult) {
    // ...
  }

  // Or as a reusable predicate
  const checkIsAdult = (age: number): boolean => age >= 18;
  if (checkIsAdult(age)) {
    // ...
  }

  // Non-explicit (avoid): raw inline condition hides intent
  if (age >= 18) {
    // ...
  }
  ```
- **Comments**:
  - Prefer explicit naming over comments.
  - Keep necessary comments brief (1–2 lines max) explaining *why* (e.g., a non-obvious browser quirk or invariant), never restating *what* the code does.

## 3. Strict Constraints (DOs & DON'Ts)
- **DO NOT use `useEffect` in React** (enforced via ESLint):
  - *Derived state* → compute during render or update atomically inside Zustand actions.
  - *Reading `localStorage`* → use lazy `useState(() => ...)` or Zustand `persist`.
  - *WebSocket / room connect & disconnect* → trigger directly in user event handlers (`onJoin`, `onDisconnect`) and container unmount cleanup.
  - *DOM mount/cleanup* (Phaser canvas, `<video>`/`<audio>` `srcObject`, `ResizeObserver`) → use **React 19 callback `ref` cleanup functions** (`ref={(el) => { ...; return () => cleanup(); }}`).
  - *Game loop, timers & keyboard input* → lives inside Phaser (`OfficeScene`), never React.
  - *Escape hatch*: If a third-party library genuinely forces an unavoidable exception, isolate it in a dedicated infrastructure wrapper with an explicit `eslint-disable-next-line` justification — never inside feature components, UI panels, or stores.
- **DO NOT** store high-frequency (60 FPS) movement/coordinate updates in React `useState`; keep them in Phaser / Zustand outside the React render tree.
- **DO NOT** import `partysocket` directly inside React components or Phaser scenes; go through `src/services/roomTransport.ts`.
- **DO NOT** use inline styles or raw CSS files for new components; use Tailwind classes.
- **DO NOT** use `any` in TypeScript. Always define explicit interfaces or types (put shared client/server contracts in `shared/types.ts`).
- **DO NOT** write paragraph-long comments or narrative block comments — stale prose misleads agents and clutters diffs/git history.
- **DO NOT** import entire library bundles if named sub-imports exist.
- **DO** handle loading and error states explicitly for all asynchronous operations.
- **DO** keep components modular and under 250 lines of code where possible.

## 4. Workflow & Verification
- Follow checkpoint-by-checkpoint delivery (`MIGRATION_PLAN.md` & `CHECKPOINTS.md`): verify each milestone across 2 browser windows before moving on.
- When creating or modifying UI components, ensure they are responsive (mobile-first approach).
- Before finishing a task, verify there are no TypeScript compile errors (`tsc --noEmit`), lint errors (`bun run lint`), or build failures (`bun run build`).
