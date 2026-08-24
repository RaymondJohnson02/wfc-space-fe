"use client";

import {
    Direction,
    directionDelta,
    directionFromKey,
} from "@/constants/characterSprites";
import { isWalkable } from "@/constants/officeMap";
import { createSignalRConnection } from "@/services/signalr";
import { HubConnection } from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";
import Character from "./Character";
import Map from "./Map";

interface UserJoined {
    id: string;
    username: string;
    x: number;
    y: number;
    direction: Direction;
    isMoving: boolean;
}

function normalizeUser(user: UserJoined): UserJoined {
    return {
        ...user,
        direction: user.direction ?? "down",
        isMoving: user.isMoving ?? false,
    };
}

export default function HomeClient({ roomId }: { roomId: string }) {
    const [userJoined, setUserJoined] = useState<UserJoined[]>([]);
    const [myConnectionId, setMyConnectionId] = useState<string | null>(null);
    const [walkFrame, setWalkFrame] = useState<0 | 1>(0);

    const connectionRef = useRef<HubConnection | null>(null);
    const userJoinedRef = useRef(userJoined);
    const pressedKeysRef = useRef(new Set<string>());
    const lastDirectionRef = useRef<Direction | null>(null);
    const isSteppingRef = useRef(false);
    const tryStartStepRef = useRef<() => void>(() => {});

    userJoinedRef.current = userJoined;

    // =========================
    // SIGNALR
    // =========================
    useEffect(() => {
        const username = prompt("Enter your username");

        if (!username) {
            return;
        }

        const connection = createSignalRConnection();

        connectionRef.current = connection;

        connection.on("RoomUsers", (users: UserJoined[]) => {
            console.log("Existing users:", users);

            setUserJoined(users.map(normalizeUser));
        });

        connection.on(
            "UserJoined",
            (userJustJoined: UserJoined) => {
                console.log(
                    `${userJustJoined.username} joined the room`
                );

                setUserJoined((previousUsers) => [
                    ...previousUsers,
                    normalizeUser(userJustJoined)
                ]);
            }
        );

        connection.on(
            "UserMoved",
            (
                id: string,
                x: number,
                y: number,
                direction: Direction,
                isMoving: boolean
            ) => {
                console.log("User moved:", id, x, y, direction, isMoving);

                setUserJoined((previousUsers) =>
                    previousUsers.map((user) => {
                        if (user.id !== id) {
                            return user;
                        }

                        return {
                            ...user,
                            x,
                            y,
                            direction: direction ?? user.direction,
                            isMoving: isMoving ?? false
                        };
                    })
                );
            }
        );

        connection.on("UserLeft", (connectionId) => {
            setUserJoined(prev =>
                prev.filter(user => user.id !== connectionId)
            );
        });

        const start = async () => {
            try {
                await connection.start();

                console.log("SignalR connected!");

                const connectionId = connection.connectionId;

                console.log(
                    "My connection ID:",
                    connectionId
                );

                setMyConnectionId(connectionId);

                await connection.invoke(
                    "JoinRoom",
                    roomId,
                    username
                );
            } catch (error) {
                console.error(
                    "SignalR connection failed:",
                    error
                );
            }
        };

        void start();

        return () => {
            connection.off("RoomUsers");
            connection.off("UserJoined");
            connection.off("UserMoved");
            connection.off("UserLeft");

            connectionRef.current = null;

            void connection.stop();
        };
    }, [roomId]);

    // =========================
    // WALK CYCLE
    // =========================
    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setWalkFrame((previousFrame) => (previousFrame === 0 ? 1 : 0));
        }, 180);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    // =========================
    // KEYBOARD MOVEMENT
    // =========================
    useEffect(() => {
        if (!myConnectionId) {
            return;
        }

        const applyLocalUser = (updatedUser: UserJoined) => {
            userJoinedRef.current = userJoinedRef.current.map((user) =>
                user.id === myConnectionId ? updatedUser : user
            );

            setUserJoined((previousUsers) =>
                previousUsers.map((user) =>
                    user.id === myConnectionId ? updatedUser : user
                )
            );
        };

        const sendPosition = (
            x: number,
            y: number,
            direction: Direction,
            isMoving: boolean
        ) => {
            void connectionRef.current?.invoke(
                "UpdatePosition",
                roomId,
                x,
                y,
                direction,
                isMoving
            );
        };

        const getHeldDirection = (): Direction | null => {
            if (lastDirectionRef.current) {
                for (const key of pressedKeysRef.current) {
                    if (directionFromKey(key) === lastDirectionRef.current) {
                        return lastDirectionRef.current;
                    }
                }
            }

            for (const key of pressedKeysRef.current) {
                const heldDirection = directionFromKey(key);

                if (heldDirection) {
                    lastDirectionRef.current = heldDirection;
                    return heldDirection;
                }
            }

            lastDirectionRef.current = null;
            return null;
        };

        const tryStartStep = () => {
            if (isSteppingRef.current) {
                return;
            }

            const me = userJoinedRef.current.find(
                (user) => user.id === myConnectionId
            );

            if (!me) {
                return;
            }

            const direction = getHeldDirection();

            if (!direction) {
                if (!me.isMoving) {
                    return;
                }

                const updatedUser: UserJoined = {
                    ...me,
                    isMoving: false
                };

                applyLocalUser(updatedUser);
                sendPosition(
                    updatedUser.x,
                    updatedUser.y,
                    updatedUser.direction,
                    false
                );
                return;
            }

            const delta = directionDelta(direction);
            const nextX = me.x + delta.x;
            const nextY = me.y + delta.y;
            const canWalk = isWalkable(nextX, nextY);

            if (!canWalk) {
                if (me.direction === direction && !me.isMoving) {
                    return;
                }

                const updatedUser: UserJoined = {
                    ...me,
                    direction,
                    isMoving: false
                };

                applyLocalUser(updatedUser);
                sendPosition(
                    updatedUser.x,
                    updatedUser.y,
                    updatedUser.direction,
                    false
                );
                return;
            }

            isSteppingRef.current = true;

            const updatedUser: UserJoined = {
                ...me,
                direction,
                x: nextX,
                y: nextY,
                isMoving: true
            };

            applyLocalUser(updatedUser);
            sendPosition(
                updatedUser.x,
                updatedUser.y,
                updatedUser.direction,
                true
            );
        };

        tryStartStepRef.current = tryStartStep;

        const handleKeyDown = (event: KeyboardEvent) => {
            const direction = directionFromKey(event.key);

            if (!direction) {
                return;
            }

            event.preventDefault();

            if (event.repeat) {
                return;
            }

            pressedKeysRef.current.add(event.key.toLowerCase());
            lastDirectionRef.current = direction;
            tryStartStep();
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            const direction = directionFromKey(event.key);

            if (!direction) {
                return;
            }

            pressedKeysRef.current.delete(event.key.toLowerCase());

            if (isSteppingRef.current) {
                return;
            }

            tryStartStep();
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [myConnectionId, roomId]);

    // =========================
    // RENDER
    // =========================

    return (
        <main>
            <h1>Virtual Office</h1>

            <div style={{ position: "relative" }}>
                <Map />
                {userJoined.map((user) => (
                    <Character
                        key={user.id}
                        username={user.username}
                        x={user.x}
                        y={user.y}
                        direction={user.direction}
                        isMoving={user.isMoving}
                        walkFrame={walkFrame}
                        onArrived={
                            user.id === myConnectionId
                                ? () => {
                                    isSteppingRef.current = false;
                                    tryStartStepRef.current();
                                }
                                : undefined
                        }
                    />
                ))}
            </div>
        </main>
    );
}
