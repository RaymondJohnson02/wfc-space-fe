"use client";

import { STEP_MS, TILE_SIZE } from "@/constants/MapConstants";
import {
    Direction,
    getCharacterSprite,
} from "@/constants/characterSprites";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import SpeechBubble from "./chat/SpeechBubble";

type CharacterProps = {
    username: string;
    x: number;
    y: number;
    direction: Direction;
    isMoving: boolean;
    walkFrame: 0 | 1;
    speechMessage?: string;
    onArrived?: () => void;
};

function lerp(from: number, to: number, t: number) {
    return from + (to - from) * t;
}

export default function Character({
    username,
    x,
    y,
    direction,
    isMoving,
    walkFrame,
    speechMessage,
    onArrived,
}: CharacterProps) {
    const [pixel, setPixel] = useState({
        x: x * TILE_SIZE,
        y: y * TILE_SIZE,
    });
    const [isAnimating, setIsAnimating] = useState(false);
    const pixelRef = useRef(pixel);
    const onArrivedRef = useRef(onArrived);

    onArrivedRef.current = onArrived;

    useEffect(() => {
        const targetX = x * TILE_SIZE;
        const targetY = y * TILE_SIZE;
        const fromX = pixelRef.current.x;
        const fromY = pixelRef.current.y;
        const dist = Math.hypot(targetX - fromX, targetY - fromY);

        if (dist < 0.5) {
            pixelRef.current = { x: targetX, y: targetY };
            setPixel(pixelRef.current);
            setIsAnimating(false);
            return;
        }

        const duration = (dist / TILE_SIZE) * STEP_MS;
        const startedAt = performance.now();
        let frameId = 0;

        setIsAnimating(true);

        const tick = (now: number) => {
            const t = Math.min(1, (now - startedAt) / duration);
            const next = {
                x: lerp(fromX, targetX, t),
                y: lerp(fromY, targetY, t),
            };

            pixelRef.current = next;
            setPixel(next);

            if (t < 1) {
                frameId = window.requestAnimationFrame(tick);
                return;
            }

            setIsAnimating(false);
            onArrivedRef.current?.();
        };

        frameId = window.requestAnimationFrame(tick);

        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [x, y]);

    return (
        <div
            style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: TILE_SIZE,
                height: TILE_SIZE,
                transform: `translate(${pixel.x}px, ${pixel.y}px)`,
                willChange: "transform",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    bottom: "100%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    pointerEvents: "none",
                    marginBottom: 2,
                }}
            >
                {speechMessage && (
                    <SpeechBubble message={speechMessage} />
                )}
                <div
                    style={{
                        whiteSpace: "nowrap",
                        fontSize: 12,
                        lineHeight: 1.2,
                    }}
                >
                    {username}
                </div>
            </div>
            <div
                style={{
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    transform:
                        direction === "left" ? "scaleX(-1)" : undefined,
                    transformOrigin: "center",
                    lineHeight: 0,
                }}
            >
                <Image
                    src={getCharacterSprite(
                        direction,
                        isMoving || isAnimating,
                        walkFrame
                    )}
                    alt={username}
                    width={TILE_SIZE}
                    height={TILE_SIZE}
                />
            </div>
        </div>
    );
}
