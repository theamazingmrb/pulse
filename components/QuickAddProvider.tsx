"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useQuickAddShortcut } from "@/hooks/useKeyboardShortcut";
import QuickAddModal from "./QuickAddModal";

interface QuickAddContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const QuickAddContext = createContext<QuickAddContextType | null>(null);

export function useQuickAdd() {
  const context = useContext(QuickAddContext);
  if (!context) {
    throw new Error("useQuickAdd must be used within a QuickAddProvider");
  }
  return context;
}

interface QuickAddProviderProps {
  children: React.ReactNode;
}

export default function QuickAddProvider({ children }: QuickAddProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  useQuickAddShortcut(() => {
    setIsOpen((prev) => !prev);
  }, true);

  return (
    <QuickAddContext.Provider value={{ isOpen, open, close }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="sm:max-w-xl p-0 gap-0 overflow-hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Quick Add Task</DialogTitle>
          <QuickAddModal open={isOpen} onOpenChange={setIsOpen} />
        </DialogContent>
      </Dialog>
    </QuickAddContext.Provider>
  );
}