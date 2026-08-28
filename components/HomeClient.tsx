"use client";

import {
    Direction,
    directionDelta,
    directionFromKey,
} from "@/constants/characterSprites";
import { isWalkable } from "@/constants/officeMap";
import { createSignalRConnection } from "@/services/signalr";
import { HubConnection } from "@microsoft/signalr";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./chat/ChatSidebar";
import type { AppNotification } from "./sidebar/types";
import Character from "./Character";
import Map from "./Map";

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
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatDraft, setChatDraft] = useState("");
    const [speechBubbles, setSpeechBubbles] = useState<Record<string, string>>({});
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

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
        const enteredUsername = prompt("Enter your username");

        if (!enteredUsername) {
            return;
        }

        setUsername(enteredUsername);

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
                    enteredUsername
                );

                setNotifications((previous) => [
                    {
                        id: `${Date.now()}-${Math.random()}`,
                        type: "system",
                        title: "Connected",
                        description: `Joined ${roomId} as ${enteredUsername}`,
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

    return (
        <main>
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
            />

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
                        speechMessage={speechBubbles[user.id]}
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
