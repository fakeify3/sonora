"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSonoraStore } from "@/lib/store";
import { ACCENT_PRESETS } from "@/lib/types";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { DashboardView } from "@/components/views/DashboardView";
import { StudioView } from "@/components/views/StudioView";
import { GalleryView } from "@/components/views/GalleryView";
import { ExploreView } from "@/components/views/ExploreView";
import { SettingsView } from "@/components/views/SettingsView";

export default function Home() {
  const { view, setView, settings } = useSonoraStore();

  // Apply accent + theme on mount and when they change
  useEffect(() => {
    const preset = ACCENT_PRESETS[settings.accent];
    const root = document.documentElement;
    root.style.setProperty("--sonora-accent", preset.accent);
    root.style.setProperty("--sonora-accent-2", preset.accent2);
    // Build a soft variant
    root.style.setProperty(
      "--sonora-accent-soft",
      `${preset.accent.replace(")", " / 0.18)")}`
    );
  }, [settings.accent]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [settings.theme]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopBar />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={
                view === "studio"
                  ? "h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col"
                  : "p-4 md:p-6 lg:p-8"
              }
            >
              {view === "dashboard" && (
                <DashboardView onOpenStudio={() => setView("studio")} />
              )}
              {view === "studio" && <StudioView />}
              {view === "gallery" && <GalleryView />}
              {view === "explore" && <ExploreView />}
              {view === "settings" && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
