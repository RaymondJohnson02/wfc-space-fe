# Gather.town Speedrun: Checkpoints & Milestone Roadmap

> **Sprint Rule:** We work one checkpoint at a time. Each checkpoint must pass its Acceptance Criteria across 2 browser windows before you give the green light to move to the next.

---

## Architectural Ground Rules & Speedrun Constraints

1. **Strictly In-Scope:** 2D office tilemap, WASD movement & collision, multiplayer sync, proximity audio/video fade, private sound zones, iframe props (Excalidraw whiteboard), screensharing, text chat.
2. **Strictly Out-of-Scope:** In-game map editor, complex OAuth/passwords (use guest names + localStorage), persistent DB migrations, custom canvas sync engine.
3. **No `useEffect` for State, Sync, or Game Logic:** 
   * `useEffect` is prohibited for synchronizing state, tracking sockets, or bridging Phaser $\leftrightarrow$ React.
   * State is managed externally via **Zustand** (or `useSyncExternalStore`) so changes update outside the React render tree without triggering cascading re-renders at 60 FPS.
   * WebRTC tracks are handled via event listeners and LiveKit's official reactive hooks.
4. **Pure Client SPA (Vite + React):** No SSR, no server components. The browser has 100% immediate access to WebGL, Web Audio, and `navigator.mediaDevices`.
5. **Client-Authoritative Movement:** Movement and collisions are calculated locally and broadcast at ~20Hz via PartyKit. No server-side physics simulation.
6. **45-Minute Rabbit Hole Breaker:** Any technical hurdle taking >45 min gets an immediate working fallback.

---

## Overview Timeline (Estimated: ~24 - 36 Working Hours)

```
[CP 0: Scaffolding] ──▶ [CP 1: 2D World & Collisions] ──▶ [CP 2: Multiplayer Sync]
                                                                    │
[CP 5: Private Zones] ◀── [CP 4: Proximity Audio/Video] ◀── [CP 3: WebRTC A/V]
        │
        ▼
[CP 6: Interactive Props] ──▶ [CP 7: Screenshare & Chat] ──▶ [CP 8: Polish & Deploy]
```

---

### Checkpoint 0: Project Scaffolding & Shared Type System
* **Estimated Time:** 1 - 2 hours
* **Goal:** Set up a clean full-stack TypeScript workspace with React + Phaser on the frontend and PartyKit for WebSockets, with shared types.
* **Deliverables:**
  - Vite + React + TypeScript + Tailwind CSS client scaffold.
  - PartyKit WebSocket server setup.
  - Shared TypeScript data contracts (`PlayerState`, `Zone`, `ServerEvents`, `ClientEvents`).
  - Zustand stores configured for external UI/state management.
* **Acceptance Criteria:**
  - Client loads a placeholder canvas.
  - WebSocket client connects to local PartyKit server (`localhost:1999`) and logs a successful handshake.

---

### Checkpoint 1: 2D World, Tilemap & Player Movement
* **Estimated Time:** 3 - 4 hours
* **Goal:** "User can roam around the cozy office map with wall and furniture boundary collisions."
* **Deliverables:**
  - Top-down 2D office tilemap loaded into Phaser (floors, walls, desks, conference tables).
  - Character sprite rendering with 4-directional movement (WASD / Arrow keys).
  - Arcade Physics collision layer so players cannot walk through walls or furniture.
  - Smooth camera tracking centered on the local player.
* **Acceptance Criteria:**
  - Local avatar can walk around smoothly.
  - Avatar stops when bumping into walls, tables, and obstacles.

---

### Checkpoint 2: Realtime Multiplayer Movement & Presence
* **Estimated Time:** 3 - 4 hours
* **Goal:** "Two players in separate browser windows see each other moving around smoothly in real time."
* **Deliverables:**
  - Connect player positions to PartyKit WebSocket room.
  - Broadcast coordinate packets `(x, y, direction)` throttled at ~20Hz.
  - Peer avatar spawning and despawning on connect/disconnect.
  - Client-side linear interpolation (`lerp`) to prevent peer stuttering.
  - Floating nametags rendered above avatars.
* **Acceptance Criteria:**
  - Open Tab A and Tab B: Avatar A sees Avatar B spawn.
  - Moving Avatar A in Tab A updates Avatar A's position smoothly in Tab B.
  - Closing Tab A removes Avatar A from Tab B without crashes.

---

### Checkpoint 3: LiveKit WebRTC Integration (Base A/V)
* **Estimated Time:** 3 - 4 hours
* **Goal:** "Players can see their local webcam/mic feed and connect to a common audio/video room."
* **Deliverables:**
  - LiveKit token generation endpoint (or client-side dev token generator).
  - Local camera/mic preview and toggle buttons (Mute, Camera Off).
  - Video feed container mapping LiveKit participant IDs to connected player IDs.
* **Acceptance Criteria:**
  - Two browser tabs request camera/mic permissions and successfully establish an active LiveKit connection.
  - Audio and video pass between both tabs when connected.

---

### Checkpoint 4: Spatial Proximity Engine
* **Estimated Time:** 4 - 5 hours
* **Goal:** "Walking close to another player fades in their video and audio; walking away fades it out and disconnects."
* **Deliverables:**
  - Euclidean distance calculation loop between local player and all peers.
  - Proximity threshold:
    - Distance $> 5$ tiles: Peer video window hidden; peer audio track muted / 0% volume.
    - Distance $\le 5$ tiles: Peer video window appears; peer audio volume attenuates smoothly from 0% to 100%.
  - Floating video bubbles above characters or dock-in-grid UI.
* **Acceptance Criteria:**
  - When Avatar A is 10 tiles away from Avatar B, no audio or video is transmitted/rendered.
  - As Avatar A walks toward Avatar B, Avatar B's webcam pops up and voice gets louder.

---

### Checkpoint 5: Private Zones & Meeting Rooms
* **Estimated Time:** 3 - 4 hours
* **Goal:** "Avatars sitting at a conference table can only hear and see people sitting at the same table."
* **Deliverables:**
  - Tilemap zones designated with a `zoneId` (e.g. `table_alpha`, `meeting_room_1`).
  - Zone detection logic on player tile entry/exit.
  - Audio matrix override:
    - If `player.zoneId === peer.zoneId` (and not null), lock audio/video to 100% volume regardless of distance within that room.
    - If `player.zoneId !== peer.zoneId`, completely isolate audio/video.
  - Visual floor highlight or boundary badge ("Entering Meeting Room 1").
* **Acceptance Criteria:**
  - Avatar A and Avatar B enter "Meeting Room 1": Both hear and see each other.
  - Avatar C stands 1 tile outside the room door: Cannot hear or see Avatar A and B.

---

### Checkpoint 6: Interactive Props ("Press [E] to Interact")
* **Estimated Time:** 2 - 3 hours
* **Goal:** "Approaching a whiteboard prompts the player to press [E], opening an embedded collaborative whiteboard."
* **Deliverables:**
  - Interactive object definitions in map (whiteboard, lounge TV).
  - Proximity trigger: "Press [E] to use Whiteboard" floating action hint.
  - Modal overlay embedding collaborative Excalidraw or document iframe.
  - Disabling player movement input while the modal is open.
* **Acceptance Criteria:**
  - Walking up to a whiteboard displays the `[E]` key prompt.
  - Pressing `E` opens the whiteboard; closing it returns movement control.

---

### Checkpoint 7: Screen Sharing, Controls & Text Chat
* **Estimated Time:** 3 - 4 hours
* **Goal:** "Players can share their screen to nearby peers and send proximity or room text messages."
* **Deliverables:**
  - LiveKit screen share toggle button on bottom toolbar.
  - Screen share video tile spotlight in the UI.
  - Chat drawer supporting Room Chat and Proximity Chat (messages only delivered within radius).
  - Quick emoji reactions (e.g., press `1` to pop a thumbs-up bubble over the avatar).
* **Acceptance Criteria:**
  - Tab A starts screenshare: Tab B sees Tab A's screen track rendered.
  - Sending a chat message in Tab A appears in Tab B's chat log.

---

### Checkpoint 8: Avatar Selection, Polish & Deployment
* **Estimated Time:** 2 - 3 hours
* **Goal:** "Polished entry screen where users pick their name & character color, fully deployed and playable over the internet."
* **Deliverables:**
  - Welcome / Lobby screen: Enter display name, choose avatar sprite/color, test mic/cam before joining.
  - Deploy frontend to Vercel.
  - Deploy PartyKit room server to live edge (`partykit deploy`).
* **Acceptance Criteria:**
  - Share live URL with a friend on another network: Both connect, walk around, talk, and interact seamlessly.
