import Phaser from "phaser";
import {
  getZoneAtTile,
  isWalkable,
  MAP,
  MAP_COLS,
  MAP_ROWS,
  SPAWN_PIXEL_X,
  SPAWN_PIXEL_Y,
  SPAWN_TILE_X,
  SPAWN_TILE_Y,
  STEP_MS,
  TILE_SIZE,
  TILE_SIZE_HALF,
  ZONES,
} from "@shared/mapConfig";
import type { Direction, PlayerState } from "@shared/types";
import { roomTransport } from "@/services/roomTransport";
import { useChatStore, type SpeechBubbleState } from "@/stores/useChatStore";
import { useRoomStore } from "@/stores/useRoomStore";
import {
  preloadCharacterSprites,
  registerCharacterAnimations,
} from "./animations";
import { PlayerEntity } from "./PlayerEntity";

const DIRECTION_DELTAS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

interface MovementKeys {
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

interface ActiveStep {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  elapsedMs: number;
}

interface RemotePlayerEntry {
  entity: PlayerEntity;
  target: PlayerState;
}

function isTypingInInput(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    (active as HTMLElement).isContentEditable
  );
}

function tileToPixelCenter(tileCoord: number): number {
  return tileCoord * TILE_SIZE + TILE_SIZE_HALF;
}

export class OfficeScene extends Phaser.Scene {
  private localPlayer: PlayerEntity | null = null;
  private remotePlayers = new Map<string, RemotePlayerEntry>();
  private lastBubbleExpiry = new Map<string, number>();
  private keys: MovementKeys | null = null;
  private facing: Direction = "down";
  private tileX = SPAWN_TILE_X;
  private tileY = SPAWN_TILE_Y;
  private activeStep: ActiveStep | null = null;
  private unsubscribes: Array<() => void> = [];

  constructor() {
    super({ key: "OfficeScene" });
  }

  preload(): void {
    preloadCharacterSprites(this);
  }

  create(): void {
    registerCharacterAnimations(this);

    const worldWidth = MAP_COLS * TILE_SIZE;
    const worldHeight = MAP_ROWS * TILE_SIZE;

    this.drawFloorAndZones(worldWidth, worldHeight);
    this.drawWalls();

    const { localUsername, localPlayerId, players } = useRoomStore.getState();
    this.tileX = SPAWN_TILE_X;
    this.tileY = SPAWN_TILE_Y;
    this.activeStep = null;

    this.localPlayer = new PlayerEntity(
      this,
      SPAWN_PIXEL_X,
      SPAWN_PIXEL_Y,
      localUsername ?? "You",
      true,
    );

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.localPlayer, true, 0.14, 0.14);

    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys(
        {
          w: Phaser.Input.Keyboard.KeyCodes.W,
          a: Phaser.Input.Keyboard.KeyCodes.A,
          s: Phaser.Input.Keyboard.KeyCodes.S,
          d: Phaser.Input.Keyboard.KeyCodes.D,
          up: Phaser.Input.Keyboard.KeyCodes.UP,
          down: Phaser.Input.Keyboard.KeyCodes.DOWN,
          left: Phaser.Input.Keyboard.KeyCodes.LEFT,
          right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        },
        false,
      ) as MovementKeys;
    }

    // Initial sync + store subscriptions outside React render tree
    this.syncRemotePlayers(players, localPlayerId);
    this.syncSpeechBubbles(useChatStore.getState().speechBubbles);

    const unsubRoom = useRoomStore.subscribe((state) => {
      this.syncRemotePlayers(state.players, state.localPlayerId);
    });

    const unsubChat = useChatStore.subscribe((state) => {
      this.syncSpeechBubbles(state.speechBubbles);
    });

    this.unsubscribes = [unsubRoom, unsubChat];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupSubscriptions);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupSubscriptions);
  }

  update(_time: number, delta: number): void {
    if (!this.localPlayer) return;

    const now = Date.now();
    let stepFinishedThisFrame = false;

    if (this.activeStep) {
      this.activeStep.elapsedMs += delta;
      const progress = Math.min(1, this.activeStep.elapsedMs / STEP_MS);

      const nextX = Phaser.Math.Linear(
        this.activeStep.startX,
        this.activeStep.targetX,
        progress,
      );
      const nextY = Phaser.Math.Linear(
        this.activeStep.startY,
        this.activeStep.targetY,
        progress,
      );
      this.localPlayer.setPosition(nextX, nextY);

      if (progress >= 1) {
        this.localPlayer.setPosition(
          this.activeStep.targetX,
          this.activeStep.targetY,
        );
        this.activeStep = null;
        stepFinishedThisFrame = true;
      }
    }

    if (!this.activeStep) {
      const requestedDir = this.getRequestedDirection();

      if (requestedDir) {
        this.facing = requestedDir;
        const { dx, dy } = DIRECTION_DELTAS[requestedDir];
        const nextTileX = this.tileX + dx;
        const nextTileY = this.tileY + dy;

        if (isWalkable(nextTileX, nextTileY)) {
          this.tileX = nextTileX;
          this.tileY = nextTileY;
          const targetX = tileToPixelCenter(nextTileX);
          const targetY = tileToPixelCenter(nextTileY);

          this.activeStep = {
            startX: this.localPlayer.x,
            startY: this.localPlayer.y,
            targetX,
            targetY,
            elapsedMs: 0,
          };

          this.publishLocalMove(targetX, targetY, true);
        } else if (stepFinishedThisFrame) {
          this.publishLocalMove(this.localPlayer.x, this.localPlayer.y, false);
        }
      } else if (stepFinishedThisFrame) {
        this.publishLocalMove(this.localPlayer.x, this.localPlayer.y, false);
      }
    }

    const isMoving = this.activeStep !== null;
    this.localPlayer.applyMovementState(this.facing, isMoving);
    this.localPlayer.setDepth(this.localPlayer.y);
    this.localPlayer.updateSpeechBubble(now);

    this.updateRemotePlayers(delta, now);
  }

  private publishLocalMove(x: number, y: number, isMoving: boolean): void {
    const zoneId = getZoneAtTile(this.tileX, this.tileY)?.id ?? null;
    const { localPlayerId, updatePlayerPosition } = useRoomStore.getState();

    if (localPlayerId) {
      updatePlayerPosition(
        localPlayerId,
        x,
        y,
        this.facing,
        isMoving,
        zoneId,
      );
    }

    roomTransport.sendMove(x, y, this.facing, isMoving, zoneId);
  }

  private syncRemotePlayers(
    players: Record<string, PlayerState>,
    localPlayerId: string | null,
  ): void {
    for (const [id, entry] of this.remotePlayers.entries()) {
      if (!players[id] || id === localPlayerId) {
        entry.entity.destroy();
        this.remotePlayers.delete(id);
        this.lastBubbleExpiry.delete(id);
      }
    }

    for (const [id, player] of Object.entries(players)) {
      if (id === localPlayerId) continue;

      const existing = this.remotePlayers.get(id);
      if (existing) {
        existing.target = player;
      } else {
        const entity = new PlayerEntity(
          this,
          player.x,
          player.y,
          player.username,
          false,
        );
        entity.applyMovementState(player.direction, player.isMoving);
        entity.setDepth(player.y);
        this.remotePlayers.set(id, { entity, target: player });
      }
    }
  }

  private updateRemotePlayers(delta: number, now: number): void {
    const lerpFactor = Math.min(1, delta / 75);

    for (const { entity, target } of this.remotePlayers.values()) {
      const dx = target.x - entity.x;
      const dy = target.y - entity.y;
      const isCloseEnough = Math.abs(dx) < 0.75 && Math.abs(dy) < 0.75;

      if (isCloseEnough) {
        entity.setPosition(target.x, target.y);
        entity.applyMovementState(target.direction, target.isMoving);
      } else {
        entity.setPosition(
          Phaser.Math.Linear(entity.x, target.x, lerpFactor),
          Phaser.Math.Linear(entity.y, target.y, lerpFactor),
        );
        entity.applyMovementState(target.direction, true);
      }

      entity.setDepth(entity.y);
      entity.updateSpeechBubble(now);
    }
  }

  private syncSpeechBubbles(
    speechBubbles: Record<string, SpeechBubbleState>,
  ): void {
    const { localPlayerId } = useRoomStore.getState();

    for (const [playerId, bubble] of Object.entries(speechBubbles)) {
      const prevExpiry = this.lastBubbleExpiry.get(playerId) ?? 0;
      if (bubble.expiresAt <= prevExpiry) continue;

      this.lastBubbleExpiry.set(playerId, bubble.expiresAt);

      const targetEntity =
        playerId === localPlayerId
          ? this.localPlayer
          : (this.remotePlayers.get(playerId)?.entity ?? null);

      targetEntity?.showSpeechBubble(bubble.message, bubble.expiresAt);
    }
  }

  private cleanupSubscriptions = (): void => {
    for (const unsubscribe of this.unsubscribes) {
      unsubscribe();
    }
    this.unsubscribes = [];

    for (const entry of this.remotePlayers.values()) {
      entry.entity.destroy();
    }
    this.remotePlayers.clear();
  };

  private getRequestedDirection(): Direction | null {
    if (!this.keys || isTypingInInput()) return null;

    if (this.keys.w.isDown || this.keys.up.isDown) return "up";
    if (this.keys.s.isDown || this.keys.down.isDown) return "down";
    if (this.keys.a.isDown || this.keys.left.isDown) return "left";
    if (this.keys.d.isDown || this.keys.right.isDown) return "right";

    return null;
  }

  private drawFloorAndZones(worldWidth: number, worldHeight: number): void {
    const floor = this.add.graphics();

    floor.fillStyle(0x1e293b, 1);
    floor.fillRect(0, 0, worldWidth, worldHeight);

    floor.lineStyle(1, 0x334155, 0.35);
    for (let col = 0; col <= MAP_COLS; col++) {
      const x = col * TILE_SIZE;
      floor.lineBetween(x, 0, x, worldHeight);
    }
    for (let row = 0; row <= MAP_ROWS; row++) {
      const y = row * TILE_SIZE;
      floor.lineBetween(0, y, worldWidth, y);
    }

    for (const zone of ZONES) {
      const zx = zone.x1 * TILE_SIZE;
      const zy = zone.y1 * TILE_SIZE;
      const zw = (zone.x2 - zone.x1 + 1) * TILE_SIZE;
      const zh = (zone.y2 - zone.y1 + 1) * TILE_SIZE;

      floor.fillStyle(0x0f172a, 0.35);
      floor.fillRect(zx, zy, zw, zh);

      this.add
        .text(zx + zw / 2, zy + 22, zone.name.toUpperCase(), {
          fontFamily: "Geist, system-ui, sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "#64748b",
        })
        .setOrigin(0.5, 0.5);
    }
  }

  private drawWalls(): void {
    const walls = this.add.graphics();
    walls.fillStyle(0x475569, 1);
    walls.lineStyle(1, 0x64748b, 0.8);

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        if (MAP[row][col] === 1) {
          const x = col * TILE_SIZE;
          const y = row * TILE_SIZE;
          walls.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          walls.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
      }
    }
  }
}
