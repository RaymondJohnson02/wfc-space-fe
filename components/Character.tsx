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
    onPositionUpdate?: (pixelX: number, pixelY: number) => void;
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
    onPositionUpdate,
}: CharacterProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const pixelRef = useRef({
        x: x * TILE_SIZE,
        y: y * TILE_SIZE,
    });
    const [isAnimating, setIsAnimating] = useState(false);
    const onArrivedRef = useRef(onArrived);
    const onPositionUpdateRef = useRef(onPositionUpdate);

    onArrivedRef.current = onArrived;
    onPositionUpdateRef.current = onPositionUpdate;

    useEffect(() => {

        const effectStartedAt = performance.now();

        console.log(
            `[${effectStartedAt.toFixed(2)}] CHARACTER EFFECT START`,
            { x, y }
        );

        const targetX = x * TILE_SIZE;
        const targetY = y * TILE_SIZE;
        const fromX = pixelRef.current.x;
        const fromY = pixelRef.current.y;
        const dist = Math.hypot(targetX - fromX, targetY - fromY);


        console.log(
            `[${performance.now().toFixed(2)}] CHARACTER EFFECT CALCULATED`,
            { fromX, fromY, targetX, targetY, dist }
        );

        if (dist < 0.5) {
            pixelRef.current = { x: targetX, y: targetY };
            if (rootRef.current) {
                rootRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
            }
            onPositionUpdateRef.current?.(targetX, targetY);
            setIsAnimating(false);
            return;
        }

        const duration = (dist / TILE_SIZE) * STEP_MS;
        const startedAt = performance.now();
        let frameId = 0;

        setIsAnimating(true);

        const tick = (now: number) => {
            const t = Math.min(1, (now - startedAt) / duration);
            const currentX = lerp(fromX, targetX, t);
            const currentY = lerp(fromY, targetY, t);

            pixelRef.current = { x: currentX, y: currentY };

            if (rootRef.current) {
                rootRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
            }
            onPositionUpdateRef.current?.(currentX, currentY);

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
            ref={rootRef}
            style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: TILE_SIZE,
                height: TILE_SIZE,
                transform: `translate3d(${pixelRef.current.x}px, ${pixelRef.current.y}px, 0)`,
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
