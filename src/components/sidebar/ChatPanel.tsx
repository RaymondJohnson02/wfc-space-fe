import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "./types";

interface ChatPanelProps {
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  currentUsername?: string | null;
}

export default function ChatPanel({
  messages,
  draft,
  onDraftChange,
  onSend,
  disabled = false,
  currentUsername,
}: ChatPanelProps) {
  const attachAutoScroll = (listNode: HTMLDivElement | null) => {
    if (!listNode) return;

    const scrollToBottom = () => {
      listNode.lastElementChild?.scrollIntoView({ behavior: "smooth" });
    };

    scrollToBottom();
    const observer = new MutationObserver(scrollToBottom);
    observer.observe(listNode, { childList: true });

    return () => observer.disconnect();
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <ScrollArea className="flex-1 min-h-0 px-3.5 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 mb-2">
              <MessageSquare className="size-5 text-muted-foreground/60" />
            </div>
            <p className="text-xs font-medium">No messages yet</p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              Say hello to everyone in the room!
            </p>
          </div>
        ) : (
          <div ref={attachAutoScroll} className="flex flex-col gap-2.5">
            {messages.map((entry, index) => {
              const isSelf =
                currentUsername && entry.username === currentUsername;

              return (
                <div
                  key={index}
                  className={`flex flex-col text-xs rounded-lg p-2.5 transition-colors ${
                    isSelf
                      ? "bg-primary/10 border border-primary/20 ml-2"
                      : "bg-card/70 border mr-2"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-foreground text-[11px] flex items-center gap-1">
                      {entry.username}
                      {isSelf && (
                        <span className="text-[9px] font-normal text-muted-foreground">
                          (You)
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="text-foreground leading-relaxed break-words">
                    {entry.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <form
        className="flex gap-2 border-t bg-muted/20 p-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <Input
          id="sidebar-chat-input"
          type="text"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder={disabled ? "Connecting..." : "Type a message..."}
          disabled={disabled}
          className="flex-1 h-8 text-xs bg-background"
        />
        <Button
          id="sidebar-chat-send-btn"
          type="submit"
          size="sm"
          disabled={disabled || !draft.trim()}
          className="h-8 px-3"
        >
          <Send className="size-3.5" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
