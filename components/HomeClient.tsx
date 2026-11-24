"use client";

import {
    Direction,
    directionDelta,
    directionFromKey,
} from "@/constants/characterSprites";
import { STEP_MS, TILE_SIZE } from "@/constants/MapConstants";
import {
    isWalkable,
    MAP_COLS,
    MAP_ROWS,
    SPAWN_X,
    SPAWN_Y,
} from "@/constants/officeMap";
import { createSignalRConnection } from "@/services/signalr";
import { HubConnection } from "@microsoft/signalr";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./chat/ChatSidebar";
import type { AppNotification } from "./sidebar/types";
import Character from "./Character";
import Map from "./Map";
import LobbyLayout from "@/components/layout/LobbyLayout";
import RoomLobbyCard from "@/components/lobby/RoomLobbyCard";

const AppSidebar = dynamic(() => import("./sidebar/AppSidebar"), {
    ssr: false,
});

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
    const [username, setUsername] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatDraft, setChatDraft] = useState("");
    const [speechBubbles, setSpeechBubbles] = useState<Record<string, string>>({});
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

    const viewportRef = useRef<HTMLDivElement>(null);
    const worldRef = useRef<HTMLDivElement>(null);
    const cameraPosRef = useRef({ x: 0, y: 0 });
    const targetCameraPosRef = useRef({ x: 0, y: 0 });
    const isCameraInitializedRef = useRef(false);

    const connectionRef = useRef<HubConnection | null>(null);
    const userJoinedRef = useRef(userJoined);
    const speechTimeoutsRef = useRef<Record<string, number>>({});
    const pressedKeysRef = useRef(new Set<string>());
    const lastDirectionRef = useRef<Direction | null>(null);
    const isSteppingRef = useRef(false);
    const tryStartStepRef = useRef<() => void>(() => {});

    userJoinedRef.current = userJoined;

    // =========================
    // SIGNALR
    // =========================
    useEffect(() => {
        if (!username) {
            return;
        }

        setIsConnecting(true);

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

                setNotifications((previous) => [
                    {
                        id: `${Date.now()}-${Math.random()}`,
                        type: "user_joined",
                        title: "User Joined",
                        description: `${userJustJoined.username} entered the room`,
                        timestamp: new Date(),
                        read: false,
                    },
                    ...previous.slice(0, 49),
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
                // Ignore echoing our own movements from the server
                if (id === connection.connectionId || id === myConnectionId) {
                    return;
                }

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
            const departingUser = userJoinedRef.current.find(
                (user) => user.id === connectionId
            );
            const departingName = departingUser?.username || "A user";

            setUserJoined(prev =>
                prev.filter(user => user.id !== connectionId)
            );

            setNotifications((previous) => [
                {
                    id: `${Date.now()}-${Math.random()}`,
                    type: "user_left",
                    title: "User Left",
                    description: `${departingName} left the room`,
                    timestamp: new Date(),
                    read: false,
                },
                ...previous.slice(0, 49),
            ]);

            setSpeechBubbles((previous) => {
                const next = { ...previous };
                delete next[connectionId];
                return next;
            });

            const existingTimeout = speechTimeoutsRef.current[connectionId];

            if (existingTimeout) {
                window.clearTimeout(existingTimeout);
                delete speechTimeoutsRef.current[connectionId];
            }
        });

        connection.on(
            "MessageReceived",
            (senderUsername: string, message: string) => {
                setChatMessages((previous) => [
                    ...previous,
                    { username: senderUsername, message },
                ]);

                const sender = userJoinedRef.current.find(
                    (user) => user.username === senderUsername
                );

                if (!sender) {
                    return;
                }

                const senderId = sender.id;

                setSpeechBubbles((previous) => ({
                    ...previous,
                    [senderId]: message,
                }));

                const existingTimeout = speechTimeoutsRef.current[senderId];

                if (existingTimeout) {
                    window.clearTimeout(existingTimeout);
                }

                speechTimeoutsRef.current[senderId] = window.setTimeout(() => {
                    setSpeechBubbles((previous) => {
                        const next = { ...previous };
                        delete next[senderId];
                        return next;
                    });
                    delete speechTimeoutsRef.current[senderId];
                }, 3000);
            }
        );

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

                setNotifications((previous) => [
                    {
                        id: `${Date.now()}-${Math.random()}`,
                        type: "system",
                        title: "Connected",
                        description: `Joined ${roomId} as ${username}`,
                        timestamp: new Date(),
                        read: true,
                    },
                    ...previous,
                ]);
            } catch (error) {
                console.error(
                    "SignalR connection failed:",
                    error
                );
            } finally {
                setIsConnecting(false);
            }
        };

        void start();

        return () => {
            connection.off("RoomUsers");
            connection.off("UserJoined");
            connection.off("UserMoved");
            connection.off("UserLeft");
            connection.off("MessageReceived");

            for (const timeoutId of Object.values(speechTimeoutsRef.current)) {
                window.clearTimeout(timeoutId);
            }

            speechTimeoutsRef.current = {};

            connectionRef.current = null;

            void connection.stop();
        };
    }, [roomId, username]);

    // =========================
    // WALK CYCLE
    // =========================
    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setWalkFrame((previousFrame) => (previousFrame === 0 ? 1 : 0));
        }, 100);

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

            console.log(
                `[${performance.now().toFixed(2)}] SET STATE`
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

            // 👇 TARUH LOG DI SINI
            console.log(
                `[${performance.now().toFixed(2)}] APPLY NEXT STEP`,
                {
                    from: { x: me.x, y: me.y },
                    to: { x: nextX, y: nextY },
                    direction,
                }
            );

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
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

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

    const sendChatMessage = () => {
        const message = chatDraft.trim();

        if (!message || !username) {
            return;
        }

        void connectionRef.current?.invoke(
            "SendMessage",
            roomId,
            username,
            message
        );

        setChatDraft("");
    };

    const handleDisconnect = () => {
        if (connectionRef.current) {
            void connectionRef.current.stop();
            connectionRef.current = null;
        }
        setMyConnectionId(null);
        setUserJoined([]);
        setChatMessages([]);
        setNotifications([]);
        setSpeechBubbles({});
        setChatDraft("");
        setIsConnecting(false);
        setUsername(null);
        isCameraInitializedRef.current = false;
        cameraPosRef.current = { x: 0, y: 0 };
        targetCameraPosRef.current = { x: 0, y: 0 };
    };

    const localPlayerPixelRef = useRef({
        x: SPAWN_X * TILE_SIZE,
        y: SPAWN_Y * TILE_SIZE,
    });
    const viewportSizeRef = useRef({ width: 0, height: 0 });

    const updateCameraTarget = () => {
        const vpWidth = viewportSizeRef.current.width;
        const vpHeight = viewportSizeRef.current.height;

        if (vpWidth <= 0 || vpHeight <= 0) {
            return;
        }

        const playerCenterX = localPlayerPixelRef.current.x + TILE_SIZE / 2;
        const playerCenterY = localPlayerPixelRef.current.y + TILE_SIZE / 2;

        const mapPixelWidth = MAP_COLS * TILE_SIZE;
        const mapPixelHeight = MAP_ROWS * TILE_SIZE;

        let camX = 0;
        let camY = 0;

        if (vpWidth >= mapPixelWidth) {
            camX = -(vpWidth - mapPixelWidth) / 2;
        } else {
            const rawX = playerCenterX - vpWidth / 2;
            const maxScrollX = mapPixelWidth - vpWidth;
            camX = Math.max(0, Math.min(rawX, maxScrollX));
        }

        if (vpHeight >= mapPixelHeight) {
            camY = -(vpHeight - mapPixelHeight) / 2;
        } else {
            const rawY = playerCenterY - vpHeight / 2;
            const maxScrollY = mapPixelHeight - vpHeight;
            camY = Math.max(0, Math.min(rawY, maxScrollY));
        }

        targetCameraPosRef.current = { x: camX, y: camY };

        if (!isCameraInitializedRef.current) {
            cameraPosRef.current = { x: camX, y: camY };
            if (worldRef.current) {
                worldRef.current.style.transform = `translate3d(${-camX}px, ${-camY}px, 0)`;
            }
            isCameraInitializedRef.current = true;
        }
    };

    const handleMyPositionUpdate = (pixelX: number, pixelY: number) => {
        localPlayerPixelRef.current = { x: pixelX, y: pixelY };
        updateCameraTarget();
    };

    // =========================
    // CAMERA & VIEWPORT
    // =========================
    useEffect(() => {
        if (!username) {
            return;
        }

        const el = viewportRef.current;
        if (!el) {
            return;
        }

        const updateSize = () => {
            viewportSizeRef.current = {
                width: el.clientWidth,
                height: el.clientHeight,
            };
            setViewportSize(viewportSizeRef.current);
            updateCameraTarget();
        };

        updateSize();

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                viewportSizeRef.current = { width, height };
                setViewportSize(viewportSizeRef.current);
                updateCameraTarget();
            }
        });

        observer.observe(el);
        return () => observer.disconnect();
    }, [username]);

    // Continuous Frame Lerp Loop (rAF)
    useEffect(() => {
        if (!username) {
            return;
        }

        let animFrameId = 0;
        const LERP_FACTOR = 0.15; // Damping factor (smooth & responsive)

        const tick = () => {
            if (isCameraInitializedRef.current && worldRef.current) {
                const current = cameraPosRef.current;
                const target = targetCameraPosRef.current;

                current.x += (target.x - current.x) * LERP_FACTOR;
                current.y += (target.y - current.y) * LERP_FACTOR;

                worldRef.current.style.transform = `translate3d(${-current.x}px, ${-current.y}px, 0)`;
            }

            animFrameId = requestAnimationFrame(tick);
        };

        animFrameId = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(animFrameId);
        };
    }, [username]);

    // =========================
    // RENDER
    // =========================

    const participants = userJoined.map((user) => ({
        id: user.id,
        username: user.username,
        x: user.x,
        y: user.y,
        isMoving: user.isMoving,
        isSelf: user.id === myConnectionId,
    }));

    const mapPixelWidth = MAP_COLS * TILE_SIZE;
    const mapPixelHeight = MAP_ROWS * TILE_SIZE;

    if (!username) {
        return (
            <LobbyLayout>
                <RoomLobbyCard
                    roomId={roomId}
                    onJoin={(name) => {
                        setUsername(name);
                    }}
                    isConnecting={isConnecting}
                />
            </LobbyLayout>
        );
    }

    return (
        <main className="h-screen w-screen overflow-hidden bg-background text-foreground relative select-none">
            <AppSidebar
                roomId={roomId}
                participants={participants}
                currentUsername={username}
                chatMessages={chatMessages}
                chatDraft={chatDraft}
                onChatDraftChange={setChatDraft}
                onSendChatMessage={sendChatMessage}
                chatDisabled={!username}
                notifications={notifications}
                onClearNotifications={() => setNotifications([])}
                onDisconnect={handleDisconnect}
            />

            <div
                ref={viewportRef}
                className="w-full h-full relative overflow-hidden bg-muted/10"
            >
                <div
                    ref={worldRef}
                    className="absolute top-0 left-0"
                    style={{
                        width: mapPixelWidth,
                        height: mapPixelHeight,
                        willChange: "transform",
                    }}
                >
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
                            speechMessage={speechBubbles[user.id]}
                            onPositionUpdate={
                                user.id === myConnectionId
                                    ? handleMyPositionUpdate
                                    : undefined
                            }
                            onArrived={
                                user.id === myConnectionId
                                    ? () => {
                                        console.log(
                                            `[${performance.now().toFixed(2)}] ARRIVED`
                                        );
                                          isSteppingRef.current = false;
                                          tryStartStepRef.current();

                                        console.log(
                                            `[${performance.now().toFixed(2)}] NEXT STEP TRIGGERED`
                                        );
                                      }
                                    : undefined
                            }
                        />
                    ))}
                </div>
            </div>
        </main>
    );
}
