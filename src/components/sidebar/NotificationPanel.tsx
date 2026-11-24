import {
  BellOff,
  Info,
  MessageSquare,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppNotification } from "./types";

interface NotificationPanelProps {
  notifications: AppNotification[];
  onClearAll: () => void;
}

function formatTime(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date);
  } catch {
    return "";
  }
}

export default function NotificationPanel({
  notifications,
  onClearAll,
}: NotificationPanelProps) {
  const getIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "user_joined":
        return <UserPlus className="size-3.5 text-emerald-500" />;
      case "user_left":
        return <UserMinus className="size-3.5 text-rose-400" />;
      case "chat":
        return <MessageSquare className="size-3.5 text-primary" />;
      case "system":
      default:
        return <Info className="size-3.5 text-blue-400" />;
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {notifications.length > 0 && (
        <div className="flex items-center justify-between border-b bg-muted/10 px-3.5 py-1.5 text-xs">
          <span className="text-[11px] text-muted-foreground font-mono">
            {notifications.length} recent
          </span>
          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-3" />
            <span>Clear all</span>
          </button>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0 px-3.5 py-3">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 mb-2">
              <BellOff className="size-5 text-muted-foreground/60" />
            </div>
            <p className="text-xs font-medium">No new notifications</p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              Room joins, leaves, and activity alerts will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="flex items-start gap-2.5 rounded-lg border bg-card/60 p-2.5 text-xs transition-colors hover:bg-card/90"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/80 mt-0.5">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-semibold text-foreground text-[11px] truncate">
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {formatTime(notif.timestamp)}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px] mt-0.5 leading-snug">
                    {notif.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
