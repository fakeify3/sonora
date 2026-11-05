"use client";

import { Menu, Sparkles } from "lucide-react";
import { useSonoraStore } from "@/lib/store";

export function TopBar() {
  const { setSidebarOpen } = useSonoraStore();
  return (
    <header className="lg:hidden sticky top-0 z-30 glass-strong border-b border-border/60">
      <div className="flex items-center justify-between px-4 h-14">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-foreground/10 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-sonora-gradient grid place-items-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-[0.18em] text-gradient">
            SONORA
          </span>
        </div>
        <div className="w-9" />
      </div>
    </header>
  );
}
