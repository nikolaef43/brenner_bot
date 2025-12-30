"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const CloseIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: BottomSheetProps) {
  const [exiting, setExiting] = React.useState(false);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const startY = React.useRef<number>(0);
  const currentY = React.useRef<number>(0);

  const handleClose = React.useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setExiting(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleClose]);

  // Touch handlers for swipe-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0]?.clientY ?? 0;
    currentY.current = startY.current;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0]?.clientY ?? 0;
    const deltaY = currentY.current - startY.current;

    if (deltaY > 0 && sheetRef.current) {
      // Only allow dragging down
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleTouchEnd = () => {
    const deltaY = currentY.current - startY.current;

    if (sheetRef.current) {
      sheetRef.current.style.transform = "";

      // If dragged down more than 100px, close the sheet
      if (deltaY > 100) {
        handleClose();
      }
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "bottom-sheet-backdrop",
          exiting && "animate-fade-out"
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "bottom-sheet-title" : undefined}
        className={cn(
          "bottom-sheet",
          exiting && "animate-sheet-down",
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="bottom-sheet-handle" />

        {/* Header */}
        {title && (
          <div className="bottom-sheet-header">
            <div className="flex items-center justify-between">
              <h2 id="bottom-sheet-title" className="bottom-sheet-title">
                {title}
              </h2>
              <button
                onClick={handleClose}
                className="size-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-manipulation"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bottom-sheet-content">{children}</div>
      </div>
    </>
  );
}

// Helper hook to manage bottom sheet state
export function useBottomSheet() {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

// Context for bottom sheet actions
interface BottomSheetAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

export function BottomSheetActions({
  actions,
  onClose,
}: {
  actions: BottomSheetAction[];
  onClose: () => void;
}) {
  return (
    <div className="space-y-1">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => {
            action.onClick();
            onClose();
          }}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left",
            "hover:bg-muted transition-colors",
            action.destructive && "text-destructive hover:bg-destructive/10"
          )}
        >
          {action.icon && (
            <span className="size-5 text-muted-foreground">{action.icon}</span>
          )}
          <span className="font-medium">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
