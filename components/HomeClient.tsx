"use client";

import { createSignalRConnection } from "@/services/signalr";
import { HubConnection } from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";

interface UserJoined {
    id: string;
    username: string;
    x: number;
    y: number;
}

export default function HomeClient() {
    const [userJoined, setUserJoined] = useState<UserJoined[]>([]);
    const [myConnectionId, setMyConnectionId] = useState<string | null>(null);

    // Menyimpan connection yang sama supaya bisa dipakai
    // oleh keyboard handler
    const connectionRef = useRef<HubConnection | null>(null);

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

        // User yang sudah ada ketika kita join
        connection.on("RoomUsers", (users: UserJoined[]) => {
            console.log("Existing users:", users);

            setUserJoined(users);
        });

        // User baru masuk
        connection.on(
            "UserJoined",
            (userJustJoined: UserJoined) => {
                console.log(
                    `${userJustJoined.username} joined the room`
                );

                setUserJoined((previousUsers) => [
                    ...previousUsers,
                    userJustJoined
                ]);
            }
        );

        // User lain bergerak
        connection.on(
            "UserMoved",
            (id: string, x: number, y: number) => {
                console.log("User moved:", id, x, y);

                setUserJoined((previousUsers) =>
                    previousUsers.map((user) => {
                        if (user.id !== id) {
                            return user;
                        }

                        return {
                            ...user,
                            x,
                            y
                        };
                    })
                );
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
                    "room-123",
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

            connectionRef.current = null;

            void connection.stop();
        };
    }, []);

    // =========================
    // KEYBOARD MOVEMENT
    // =========================
    useEffect(() => {
        if (!myConnectionId) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            setUserJoined((previousUsers) =>
                previousUsers.map((user) => {
                    // Bukan player kita
                    if (user.id !== myConnectionId) {
                        return user;
                    }

                    let newX = user.x;
                    let newY = user.y;

                    switch (event.key.toLowerCase()) {
                        case "w":
                        case "arrowup":
                            newY -= 10;
                            break;

                        case "s":
                        case "arrowdown":
                            newY += 10;
                            break;

                        case "a":
                        case "arrowleft":
                            newX -= 10;
                            break;

                        case "d":
                        case "arrowright":
                            newX += 10;
                            break;

                        default:
                            return user;
                    }

                    // =========================
                    // LOCAL UPDATE
                    // =========================

                    const updatedUser = {
                        ...user,
                        x: newX,
                        y: newY
                    };

                    // =========================
                    // SEND TO BACKEND
                    // =========================

                    void connectionRef.current?.invoke(
                        "UpdatePosition",
                        "room-123",
                        newX,
                        newY
                    );

                    return updatedUser;
                })
            );
        };

        window.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [myConnectionId]);

    // =========================
    // RENDER
    // =========================

    return (
        <main>
            <h1>Virtual Office</h1>

            <div
                style={{
                    position: "relative",
                    width: "800px",
                    height: "500px",
                    border: "2px solid black"
                }}
            >
                {userJoined.map((user) => (
                    <div
                        key={user.id}
                        style={{
                            position: "absolute",
                            left: `${user.x}px`,
                            top: `${user.y}px`
                        }}
                    >
                        👤
                        <div>{user.username}</div>
                    </div>
                ))}
            </div>
        </main>
    );
}