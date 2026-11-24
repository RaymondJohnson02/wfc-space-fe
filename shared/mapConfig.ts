import type { Zone } from "./types";

export const MAP_ROWS = 40;
export const MAP_COLS = 60;
export const TILE_SIZE = 40;
export const TILE_SIZE_HALF = TILE_SIZE / 2;
export const STEP_MS = 150;

export const SPAWN_TILE_X = Math.floor(MAP_COLS / 2);
export const SPAWN_TILE_Y = Math.floor(MAP_ROWS / 2);
export const SPAWN_PIXEL_X = SPAWN_TILE_X * TILE_SIZE + TILE_SIZE_HALF;
export const SPAWN_PIXEL_Y = SPAWN_TILE_Y * TILE_SIZE + TILE_SIZE_HALF;

function createOfficeMap(): number[][] {
  const tiles = Array.from({ length: MAP_ROWS }, () =>
    Array<number>(MAP_COLS).fill(0),
  );

  const wall = (x: number, y: number) => {
    if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) {
      tiles[y][x] = 1;
    }
  };

  const hWall = (y: number, x1: number, x2: number, doors: number[] = []) => {
    for (let x = x1; x <= x2; x++) {
      if (!doors.includes(x)) {
        wall(x, y);
      }
    }
  };

  const vWall = (x: number, y1: number, y2: number, doors: number[] = []) => {
    for (let y = y1; y <= y2; y++) {
      if (!doors.includes(y)) {
        wall(x, y);
      }
    }
  };

  // Outer perimeter walls
  hWall(0, 0, MAP_COLS - 1);
  hWall(MAP_ROWS - 1, 0, MAP_COLS - 1);
  vWall(0, 0, MAP_ROWS - 1);
  vWall(MAP_COLS - 1, 0, MAP_ROWS - 1);

  // Main Central Corridor walls with doorways for 4 North and 4 South rooms
  const doorColumns = [7, 8, 22, 23, 37, 38, 52, 53];
  hWall(17, 0, MAP_COLS - 1, doorColumns);
  hWall(23, 0, MAP_COLS - 1, doorColumns);

  // Vertical dividers for 4 North rooms (y: 0..17)
  vWall(15, 0, 17);
  vWall(30, 0, 17);
  vWall(45, 0, 17);

  // Vertical dividers for 4 South rooms (y: 23..39)
  vWall(15, 23, MAP_ROWS - 1);
  vWall(30, 23, MAP_ROWS - 1);
  vWall(45, 23, MAP_ROWS - 1);

  return tiles;
}

export const MAP = createOfficeMap();

export const ZONES: Zone[] = [
  { id: "north-1", name: "Focus Pod A", x1: 1, y1: 1, x2: 14, y2: 16 },
  { id: "north-2", name: "Design Studio", x1: 16, y1: 1, x2: 29, y2: 16 },
  { id: "north-3", name: "Engineering", x1: 31, y1: 1, x2: 44, y2: 16 },
  { id: "north-4", name: "Lounge", x1: 46, y1: 1, x2: 58, y2: 16 },
  { id: "south-1", name: "Meeting Room 1", x1: 1, y1: 24, x2: 14, y2: 38 },
  { id: "south-2", name: "Meeting Room 2", x1: 16, y1: 24, x2: 29, y2: 38 },
  { id: "south-3", name: "War Room", x1: 31, y1: 24, x2: 44, y2: 38 },
  { id: "south-4", name: "Quiet Library", x1: 46, y1: 24, x2: 58, y2: 38 },
];

export function isWalkable(tileX: number, tileY: number): boolean {
  if (tileY < 0 || tileY >= MAP.length || tileX < 0 || tileX >= MAP[0].length) {
    return false;
  }
  return MAP[tileY][tileX] !== 1;
}

export function getZoneAtTile(tileX: number, tileY: number): Zone | null {
  for (const zone of ZONES) {
    const isInsideZone =
      tileX >= zone.x1 &&
      tileX <= zone.x2 &&
      tileY >= zone.y1 &&
      tileY <= zone.y2;
    if (isInsideZone) {
      return zone;
    }
  }
  return null;
}
