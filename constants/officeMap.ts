export const MAP_ROWS = 40;
export const MAP_COLS = 40;
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

    hWall(0, 0, COLS - 1);
    hWall(ROWS - 1, 0, COLS - 1);
    vWall(0, 0, ROWS - 1);
    vWall(COLS - 1, 0, ROWS - 1);

    vWall(8, 0, 10, [4, 5]);
    hWall(10, 0, COLS - 1, [3, 4, 11, 12]);
    vWall(8, 10, ROWS - 1, [14, 15]);

    return tiles;
}

export const MAP = createMap();

export function isWalkable(x: number, y: number): boolean {
    if (y < 0 || y >= MAP.length || x < 0 || x >= MAP[0].length) {
        return false;
    }

    return MAP[y][x] !== 1;
}
