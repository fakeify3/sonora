"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  AppSettings,
  DEFAULT_SETTINGS,
  ViewId,
  AccentPreset,
  ArtworkProject,
  ArtStyleId,
  ColorPaletteId,
  GenerationMode,
} from "./types";

interface SonoraState {
  // navigation
  view: ViewId;
  setView: (v: ViewId) => void;

  // settings
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setAccent: (a: AccentPreset) => void;

  // studio in-progress state
  currentTrackId: string | null;
  setCurrentTrackId: (id: string | null) => void;
  selectedMode: GenerationMode;
  setMode: (m: GenerationMode) => void;
  selectedStyle: ArtStyleId;
  setStyle: (s: ArtStyleId) => void;
  selectedPalette: ColorPaletteId;
  setPalette: (p: ColorPaletteId) => void;
  intensity: number; // 0..1
  setIntensity: (n: number) => void;
  animSpeed: number; // 0..1
  setAnimSpeed: (n: number) => void;

  // gallery (in-memory cache; persistence via IndexedDB)
  projects: ArtworkProject[];
  setProjects: (p: ArtworkProject[]) => void;
  upsertProject: (p: ArtworkProject) => void;
  removeProject: (id: string) => void;

  // sidebar mobile open state
  sidebarOpen: boolean;
  setSidebarOpen: (b: boolean) => void;
}

export const useSonoraStore = create<SonoraState>()(
  persist(
    (set) => ({
      view: "dashboard",
      setView: (v) => set({ view: v }),

      settings: DEFAULT_SETTINGS,
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      setAccent: (a) =>
        set((s) => ({ settings: { ...s.settings, accent: a } })),

      currentTrackId: null,
      setCurrentTrackId: (id) => set({ currentTrackId: id }),
      selectedMode: DEFAULT_SETTINGS.defaultMode,
      setMode: (m) => set({ selectedMode: m }),
      selectedStyle: DEFAULT_SETTINGS.defaultStyle,
      setStyle: (s) => set({ selectedStyle: s }),
      selectedPalette: DEFAULT_SETTINGS.defaultPalette,
      setPalette: (p) => set({ selectedPalette: p }),
      intensity: 0.7,
      setIntensity: (n) => set({ intensity: n }),
      animSpeed: 0.6,
      setAnimSpeed: (n) => set({ animSpeed: n }),

      projects: [],
      setProjects: (p) => set({ projects: p }),
      upsertProject: (p) =>
        set((s) => {
          const idx = s.projects.findIndex((x) => x.id === p.id);
          const next = [...s.projects];
          if (idx >= 0) next[idx] = p;
          else next.unshift(p);
          return { projects: next };
        }),
      removeProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      sidebarOpen: false,
      setSidebarOpen: (b) => set({ sidebarOpen: b }),
    }),
    {
      name: "sonora-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist settings + studio selections + projects metadata
      // (IndexedDB will separately hold image data, but we keep thumbnail data URLs here too)
      partialize: (s) => ({
        settings: s.settings,
        selectedMode: s.selectedMode,
        selectedStyle: s.selectedStyle,
        selectedPalette: s.selectedPalette,
        intensity: s.intensity,
        animSpeed: s.animSpeed,
        projects: s.projects,
      }),
    }
  )
);
