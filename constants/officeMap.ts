export const MAP_ROWS = 40;
export const MAP_COLS = 60;
export const SPAWN_X = Math.floor(MAP_COLS / 2);
export const SPAWN_Y = Math.floor(MAP_ROWS / 2);

const ROWS = MAP_ROWS;
const COLS = MAP_COLS;

function createMap(): number[][] {
    const tiles = Array.from({ length: ROWS }, () =>
        Array<number>(COLS).fill(0)
    );

    const wall = (x: number, y: number) => {
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
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
    hWall(0, 0, COLS - 1);
    hWall(ROWS - 1, 0, COLS - 1);
    vWall(0, 0, ROWS - 1);
    vWall(COLS - 1, 0, ROWS - 1);

    // Main Central Corridor walls (y=17 North wall, y=23 South wall)
    // Doors for the 4 North rooms at x = [7, 8], [22, 23], [37, 38], [52, 53]
    hWall(17, 0, COLS - 1, [7, 8, 22, 23, 37, 38, 52, 53]);
    // Doors for the 4 South rooms at x = [7, 8], [22, 23], [37, 38], [52, 53]
    hWall(23, 0, COLS - 1, [7, 8, 22, 23, 37, 38, 52, 53]);

    // Vertical dividers for the 4 North rooms (y: 0 to 17)
    vWall(15, 0, 17);
    vWall(30, 0, 17);
    vWall(45, 0, 17);

    // Vertical dividers for the 4 South rooms (y: 23 to 39)
    vWall(15, 23, ROWS - 1);
    vWall(30, 23, ROWS - 1);
    vWall(45, 23, ROWS - 1);

    return tiles;
}

export const MAP = createMap();

export function isWalkable(x: number, y: number): boolean {
    if (y < 0 || y >= MAP.length || x < 0 || x >= MAP[0].length) {
        return false;
    }

    return MAP[y][x] !== 1;
}
