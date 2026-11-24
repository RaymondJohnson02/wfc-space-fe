import Phaser from "phaser";
import type { Direction } from "@shared/types";
import { ANIM_KEYS, SPRITE_KEYS } from "./animations";

const TARGET_SPRITE_HEIGHT = 42;

export class PlayerEntity extends Phaser.GameObjects.Container {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly nameTag: Phaser.GameObjects.Text;
  private readonly speechBubble: Phaser.GameObjects.Text;
  private bubbleExpiresAt = 0;
  private currentAnimKey = "";

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    username: string,
    isSelf = false,
  ) {
    super(scene, x, y);

    this.sprite = scene.add.sprite(0, 0, SPRITE_KEYS.downA);
    const scale = TARGET_SPRITE_HEIGHT / Math.max(this.sprite.height, 1);
    this.sprite.setScale(scale);

    this.nameTag = scene.add
      .text(0, -26, username, {
        fontFamily: "Geist, system-ui, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        color: isSelf ? "#38bdf8" : "#f8fafc",
        backgroundColor: "#0f172acc",
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 1);

    this.speechBubble = scene.add
      .text(0, -48, "", {
        fontFamily: "Geist, system-ui, sans-serif",
        fontSize: "11px",
        color: "#0f172a",
        backgroundColor: "#f8fafc",
        padding: { x: 8, y: 4 },
        wordWrap: { width: 160 },
      })
      .setOrigin(0.5, 1)
      .setVisible(false);

    this.add([this.sprite, this.nameTag, this.speechBubble]);
    scene.add.existing(this);

    this.applyMovementState("down", false);
  }

  applyMovementState(direction: Direction, isMoving: boolean): void {
    this.sprite.setFlipX(direction === "left");

    let nextAnim: string;
    if (direction === "up") {
      nextAnim = isMoving ? ANIM_KEYS.walkUp : ANIM_KEYS.idleUp;
    } else if (direction === "down") {
      nextAnim = isMoving ? ANIM_KEYS.walkDown : ANIM_KEYS.idleDown;
    } else {
      nextAnim = isMoving ? ANIM_KEYS.walkSide : ANIM_KEYS.idleSide;
    }

    if (this.currentAnimKey !== nextAnim) {
      this.currentAnimKey = nextAnim;
      this.sprite.play(nextAnim, true);
    }
  }

  showSpeechBubble(message: string, expiresAt: number): void {
    this.speechBubble.setText(message);
    this.speechBubble.setVisible(true);
    this.bubbleExpiresAt = expiresAt;
  }

  updateSpeechBubble(now: number): void {
    if (this.speechBubble.visible && now >= this.bubbleExpiresAt) {
      this.speechBubble.setVisible(false);
    }
  }
}
