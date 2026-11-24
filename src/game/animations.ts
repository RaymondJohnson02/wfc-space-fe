import type Phaser from "phaser";

export const SPRITE_KEYS = {
  idle: "character_beige_idle",
  walkA: "character_beige_walk_a",
  walkB: "character_beige_walk_b",
  downA: "character_beige_down_a",
  downB: "character_beige_down_b",
  climbA: "character_beige_climb_a",
  climbB: "character_beige_climb_b",
} as const;

const SPRITE_FILES: Record<keyof typeof SPRITE_KEYS, string> = {
  idle: "/assets/sprites/character_beige_idle.png",
  walkA: "/assets/sprites/character_beige_walk_a.png",
  walkB: "/assets/sprites/character_beige_walk_b.png",
  downA: "/assets/sprites/character_beige_down_a.png",
  downB: "/assets/sprites/character_beige_down_b.png",
  climbA: "/assets/sprites/character_beige_climb_a.png",
  climbB: "/assets/sprites/character_beige_climb_b.png",
};

export const ANIM_KEYS = {
  idleDown: "player-idle-down",
  idleUp: "player-idle-up",
  idleSide: "player-idle-side",
  walkDown: "player-walk-down",
  walkUp: "player-walk-up",
  walkSide: "player-walk-side",
} as const;

export function preloadCharacterSprites(scene: Phaser.Scene): void {
  for (const [prop, key] of Object.entries(SPRITE_KEYS)) {
    const file = SPRITE_FILES[prop as keyof typeof SPRITE_KEYS];
    if (!scene.textures.exists(key)) {
      scene.load.image(key, file);
    }
  }
}

export function registerCharacterAnimations(scene: Phaser.Scene): void {
  const createIfMissing = (
    key: string,
    frames: string[],
    frameRate: number,
    repeat: number,
  ) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: frames.map((frameKey) => ({ key: frameKey })),
      frameRate,
      repeat,
    });
  };

  createIfMissing(ANIM_KEYS.idleDown, [SPRITE_KEYS.downA], 1, 0);
  createIfMissing(ANIM_KEYS.idleUp, [SPRITE_KEYS.climbA], 1, 0);
  createIfMissing(ANIM_KEYS.idleSide, [SPRITE_KEYS.idle], 1, 0);

  createIfMissing(
    ANIM_KEYS.walkDown,
    [SPRITE_KEYS.downA, SPRITE_KEYS.downB],
    7,
    -1,
  );
  createIfMissing(
    ANIM_KEYS.walkUp,
    [SPRITE_KEYS.climbA, SPRITE_KEYS.climbB],
    7,
    -1,
  );
  createIfMissing(
    ANIM_KEYS.walkSide,
    [SPRITE_KEYS.walkA, SPRITE_KEYS.walkB],
    7,
    -1,
  );
}
