import Phaser from "phaser";
import { OfficeScene } from "./OfficeScene";

function mountPhaserGame(container: HTMLDivElement | null) {
  if (!container) return;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: container.clientWidth || window.innerWidth,
    height: container.clientHeight || window.innerHeight,
    backgroundColor: "#0f172a",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [OfficeScene],
  });

  return () => {
    game.destroy(true);
  };
}

export default function PhaserGame() {
  return (
    <div
      ref={mountPhaserGame}
      className="h-full w-full overflow-hidden"
      aria-label="2D Virtual Office Canvas"
    />
  );
}
