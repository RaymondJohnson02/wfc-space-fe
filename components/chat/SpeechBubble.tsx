interface SpeechBubbleProps {
    message: string;
}

export default function SpeechBubble({ message }: SpeechBubbleProps) {
    return (
        <div
            key={message}
            className="speech-bubble-fade relative mb-1 max-w-[140px] rounded-lg border bg-popover px-2 py-1 text-center text-xs text-popover-foreground shadow-sm break-words"
            style={{
                whiteSpace: "normal",
                pointerEvents: "none",
            }}
        >
            {message}
            <span
                className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-popover"
                style={{ marginTop: -1 }}
            />
        </div>
    );
}
