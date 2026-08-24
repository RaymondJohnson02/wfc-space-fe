import { TILE_SIZE } from "@/constants/MapConstants";
import { MAP } from "@/constants/officeMap";
import { memo } from "react";
import Tile from "./Tile";

const mapStyle = {
    position: "relative" as const,
    width: MAP[0].length * TILE_SIZE,
    height: MAP.length * TILE_SIZE,
};

const tiles = MAP.flatMap((row, y) =>
    row.map((type, x) => ({
        key: `${x}-${y}`,
        type,
        x: x * TILE_SIZE,
        y: y * TILE_SIZE,
    }))
);

function Map() {
    return (
        <div style={mapStyle}>
            {tiles.map((tile) => (
                <Tile
                    key={tile.key}
                    type={tile.type}
                    x={tile.x}
                    y={tile.y}
                />
            ))}
        </div>
    );
}

export default memo(Map);
