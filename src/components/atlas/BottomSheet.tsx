import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  cat?: string | undefined;
}

export function BottomSheet({ open, onClose, children, cat }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" data-cat={cat}>
      <button
        aria-label="Close"
        className="absolute inset-0 bg-overlay/70 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />
      <div className="relative max-h-[85dvh] w-full max-w-md animate-sheet-up overflow-y-auto rounded-t-[2rem] border-t border-border bg-card px-5 pb-10 pt-3 shadow-card">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
