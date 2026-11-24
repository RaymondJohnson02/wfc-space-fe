import { Link } from "react-router-dom";
import {
  Building2,
  Coffee,
  Compass,
  ExternalLink,
  MapPin,
  Users,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RoomParticipant } from "./types";

interface SpacePanelProps {
  roomId: string;
  participants: RoomParticipant[];
}

const AVAILABLE_ROOMS = [
  {
    id: "room-1",
    name: "Cafe",
    icon: Coffee,
    desc: "Casual chat & coffee breaks",
  },
  {
    id: "room-2",
    name: "Office",
    icon: Building2,
    desc: "Main workspace & collaboration",
  },
  {
    id: "room-3",
    name: "Plaza",
    icon: Compass,
    desc: "Open town square & events",
  },
];

export default function SpacePanel({ roomId, participants }: SpacePanelProps) {
  const currentRoom = AVAILABLE_ROOMS.find((r) => r.id === roomId) || {
    id: roomId,
    name: roomId,
    desc: "Custom Room",
    icon: Building2,
  };

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="flex flex-col gap-5 p-4">
        <div className="rounded-lg border bg-card/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <currentRoom.icon className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-none">
                  {currentRoom.name}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {currentRoom.id}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          {currentRoom.desc && (
            <p className="mt-2 text-xs text-muted-foreground">
              {currentRoom.desc}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Users className="size-3.5" />
              <span>Participants</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {participants.length} online
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border bg-card/30 p-1.5">
            {participants.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                No participants in this room
              </p>
            ) : (
              participants.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate font-medium flex items-center gap-1.5">
                      <span>{user.username}</span>
                      {user.isSelf && (
                        <span className="rounded bg-primary/10 px-1 py-0.2 text-[9px] font-semibold text-primary">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground text-[10px]">
                    <MapPin className="size-3" />
                    <span className="font-mono">
                      {user.x},{user.y}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Compass className="size-3.5" />
            <span>Other Rooms</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {AVAILABLE_ROOMS.map((room) => {
              const isCurrent = room.id === roomId;
              const Icon = room.icon;

              return (
                <Link
                  key={room.id}
                  to={`/room/${room.id}`}
                  className={`group flex items-center justify-between rounded-lg border p-2.5 text-xs transition-colors ${
                    isCurrent
                      ? "border-primary/50 bg-primary/5 font-medium text-foreground cursor-default"
                      : "border-transparent bg-card/40 hover:border-border hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`size-4 ${isCurrent ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                    />
                    <span>{room.name}</span>
                  </div>
                  {isCurrent ? (
                    <span className="text-[10px] text-primary font-semibold">
                      Current
                    </span>
                  ) : (
                    <ExternalLink className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
