import { Info, LogIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  if (!isOpen) return null;

  const attachModalListeners = (node: HTMLDivElement | null) => {
    if (!node) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  };

  return (
    <div
      ref={attachModalListeners}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div
        className="relative w-full max-w-md bg-card text-card-foreground border border-border/80 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground rounded-lg p-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary">
            <LogIn className="size-5" />
          </div>
          <div>
            <h2
              id="login-modal-title"
              className="text-lg font-semibold tracking-tight"
            >
              Member Login
            </h2>
            <p className="text-xs text-muted-foreground">
              Account & Authentication
            </p>
          </div>
        </div>

        <div className="bg-muted/40 border border-border/50 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <Info className="size-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-foreground">
                Currently only support login as guest
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Full account authentication is coming soon. You can join any
                room immediately as a guest by entering your display name.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5"
          >
            Continue as Guest
          </Button>
        </div>
      </div>
    </div>
  );
}
