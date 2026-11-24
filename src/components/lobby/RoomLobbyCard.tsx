import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Coffee,
  Loader2,
  Sparkles,
  Trees,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RoomLobbyCardProps {
  roomId: string;
  onJoin: (username: string) => void;
  isConnecting?: boolean;
}

const ROOM_METADATA: Record<
  string,
  { name: string; description: string; icon: typeof Coffee }
> = {
  "room-1": {
    name: "Cafe",
    description: "A cozy spot for informal chats and casual catchups.",
    icon: Coffee,
  },
  "room-2": {
    name: "Office",
    description: "Focused collaboration zone for deep team work.",
    icon: Briefcase,
  },
  "room-3": {
    name: "Plaza",
    description: "Open town hall area for all-hands and announcements.",
    icon: Trees,
  },
};

function getSavedUsername(): string {
  try {
    return localStorage.getItem("wfc_space_username") ?? "";
  } catch {
    return "";
  }
}

export default function RoomLobbyCard({
  roomId,
  onJoin,
  isConnecting = false,
}: RoomLobbyCardProps) {
  const [nameInput, setNameInput] = useState(getSavedUsername);
  const [error, setError] = useState<string | null>(null);

  const roomInfo = ROOM_METADATA[roomId] || {
    name: roomId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: "Virtual gathering space.",
    icon: Sparkles,
  };

  const RoomIcon = roomInfo.icon;

  const handleSubmit = (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const trimmed = nameInput.trim();
    if (!trimmed) {
      setError("Please enter your name to join the space.");
      return;
    }

    if (trimmed.length > 25) {
      setError("Name must be 25 characters or fewer.");
      return;
    }

    setError(null);

    try {
      localStorage.setItem("wfc_space_username", trimmed);
    } catch {
      // Ignore storage errors
    }

    onJoin(trimmed);
  };

  return (
    <div className="w-full max-w-md animate-in fade-in-50 zoom-in-95 duration-300">
      <div className="bg-card text-card-foreground border border-border/70 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 rounded-xl bg-primary/10 text-primary">
              <RoomIcon className="size-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Selected Space
              </span>
              <h2 className="text-base font-bold text-foreground leading-tight">
                {roomInfo.name}
              </h2>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-1 px-2 rounded-lg hover:bg-muted"
          >
            <ArrowLeft className="size-3.5" />
            <span>Change</span>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Input
              id="username-input"
              type="text"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Your Name / Nickname"
              autoFocus
              disabled={isConnecting}
              maxLength={25}
              className={`h-11 text-sm font-medium rounded-xl transition-all ${
                error
                  ? "border-destructive focus-visible:ring-destructive/30"
                  : "focus-visible:ring-primary/30"
              }`}
            />
            {error && (
              <p className="text-xs text-destructive font-medium mt-1 animate-in fade-in">
                {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isConnecting || !nameInput.trim()}
            className="w-full h-11 text-sm font-semibold rounded-xl shadow-md transition-all duration-200 mt-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Connecting to Room...
              </>
            ) : (
              <>Join Room as Guest</>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
