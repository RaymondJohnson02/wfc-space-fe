import climbA from "@/asset/character_beige_climb_a.png";
import climbB from "@/asset/character_beige_climb_b.png";
import front from "@/asset/character_beige_front.png";
import idle from "@/asset/character_beige_idle.png";
import walkA from "@/asset/character_beige_walk_a.png";
import walkB from "@/asset/character_beige_walk_b.png";
import downA from "@/asset/character_beige_down_a.png";
import downB from "@/asset/character_beige_down_b.png";
import type { StaticImageData } from "next/image";

export type Direction = "up" | "down" | "left" | "right";

export function directionFromKey(key: string): Direction | null {
    switch (key.toLowerCase()) {
        case "w":
        case "arrowup":
            return "up";
        case "s":
        case "arrowdown":
            return "down";
        case "a":
        case "arrowleft":
            return "left";
        case "d":
        case "arrowright":
            return "right";
        default:
            return null;
    }
}

export function directionDelta(direction: Direction): { x: number; y: number } {
    switch (direction) {
        case "up":
            return { x: 0, y: -1 };
        case "down":
            return { x: 0, y: 1 };
        case "left":
            return { x: -1, y: 0 };
        case "right":
            return { x: 1, y: 0 };
    }
}

export function getCharacterSprite(
    direction: Direction,
    isMoving: boolean,
    walkFrame: 0 | 1
): StaticImageData {

    // return idle;

    if (direction === "up") {
        if (!isMoving) {
            return climbA;
        }

        return walkFrame === 0 ? climbA : climbB;
    }

    if (direction === "down") {
        if (!isMoving) {
            return downA;
        }

        return walkFrame === 0 ? downA : downB;
    }

    if (!isMoving) {
        return idle;
    }

    return walkFrame === 0 ? walkA : walkB;
}
