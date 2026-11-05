"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  LayoutDashboard,
  Palette,
  Compass,
  Settings as SettingsIcon,
  Music4,
  ChevronRight,
} from "lucide-react";
import { useSonoraStore } from "@/lib/store";
import { ViewId } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV: Array<{
  id: ViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    desc: "Welcome & quick start",
  },
  {
    id: "studio",
    label: "Live Studio",
    icon: Music4,
    desc: "Create artwork",
  },
  {
    id: "gallery",
    label: "My Gallery",
    icon: Palette,
    desc: "Saved creations",
  },
  {
    id: "explore",
    label: "Explore",
    icon: Compass,
    desc: "Inspiration & styles",
  },
  {
    id: "settings",
    label: "Settings",
    icon: SettingsIcon,
    desc: "Theme & preferences",
  },
];

export function Sidebar() {
  const { view, setView, sidebarOpen, setSidebarOpen } = useSonoraStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed lg:static z-50 lg:z-auto top-0 left-0 h-full lg:h-screen w-[260px] shrink-0",
          "glass-strong border-r border-border/60",
          "transition-transform duration-300 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="px-6 pt-7 pb-5">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative h-10 w-10 rounded-xl bg-sonora-gradient grid place-items-center shadow-sonora"
              >
                <Sparkles className="h-5 w-5 text-white" />
                <div className="absolute inset-0 rounded-xl ring-1 ring-white/20 pointer-events-none" />
              </motion.div>
              <div>
                <div className="text-lg font-semibold tracking-[0.18em] text-gradient">
                  SONORA
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Music → Art Studio
                </div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="px-3 flex-1 overflow-y-auto no-scrollbar">
            <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Navigation
            </div>
            <ul className="space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setView(item.id);
                        setSidebarOpen(false);
                      }}
                      className={cn(
                        "group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                        active
                          ? "bg-sonora-gradient/15 text-foreground ring-1 ring-sonora-accent/30"
                          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      {active && (
                        <motion.div
                          layoutId="nav-active"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-full bg-sonora-gradient"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <Icon
                        className={cn(
                          "h-4.5 w-4.5 shrink-0 transition-colors",
                          active
                            ? "text-[var(--sonora-accent)]"
                            : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground/80 truncate">
                          {item.desc}
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 transition-opacity",
                          active ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User / profile area */}
          <div className="p-4">
            <div className="glass rounded-xl p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-sonora-gradient grid place-items-center text-white text-sm font-semibold shadow-sonora">
                S
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">Studio Artist</div>
                <div className="text-[11px] text-muted-foreground">
                  Local creator
                </div>
              </div>
            </div>
            <div className="mt-3 text-center text-[10px] text-muted-foreground/60">
              SONORA · v1.0 · Offline-first
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
