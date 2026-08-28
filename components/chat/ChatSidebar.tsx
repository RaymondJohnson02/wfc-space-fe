"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useEffect, useRef } from "react";

export interface ChatMessage {
    username: string;
    message: string;
}

interface ChatSidebarProps {
    messages: ChatMessage[];
    draft: string;
    onDraftChange: (value: string) => void;
    onSend: () => void;
    disabled?: boolean;
    roomId?: string;
}

export default function ChatSidebar({
    messages,
    draft,
    onDraftChange,
    onSend,
    disabled = false,
    roomId,
}: ChatSidebarProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <aside
            className="fixed left-4 top-4 bottom-4 z-50 flex w-72 flex-col rounded-xl border bg-background/95 shadow-lg backdrop-blur-sm"
        >
            <div className="px-4 py-3">
                <h2 className="text-sm font-semibold">Chat</h2>
                {roomId && (
                    <p className="text-xs text-muted-foreground">{roomId}</p>
                )}
            </div>

            <Separator />

            <ScrollArea className="flex-1 min-h-0 px-4 py-3">
                {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No messages yet
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {messages.map((entry, index) => (
                            <p key={index} className="text-sm leading-snug">
                                <span className="font-medium text-muted-foreground">
                                    {entry.username}:
                                </span>
                                {" "}
                                {entry.message}
                            </p>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                )}
            </ScrollArea>

            <Separator />

            <form
                className="flex gap-2 p-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    onSend();
                }}
            >
                <Input
                    type="text"
                    value={draft}
                    onChange={(event) => onDraftChange(event.target.value)}
                    placeholder="Type a message"
                    disabled={disabled}
                    className="flex-1"
                />
                <Button type="submit" disabled={disabled}>
                    Send
                </Button>
            </form>
        </aside>
    );
}
