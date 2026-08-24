import { memo } from "react";

type TileProps = {
    type: number;
    x: number;
    y: number;
};

function Tile({ type, x, y }: TileProps) {
    return (
        <div
            style={{
                position: "absolute",
                left: x,
                top: y,
                width: 40,
                height: 40,
                backgroundColor: type === 1
                    ? "gray"
                    : "lightgray",
                border: "1px solid black",
            }}
        />
    );
}

export default memo(Tile);