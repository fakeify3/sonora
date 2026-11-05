"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Trash2,
  Download,
  Pencil,
  X,
  Calendar,
  Palette as PaletteIcon,
  Music2,
  Filter,
  Clock,
} from "lucide-react";
import { useSonoraStore } from "@/lib/store";
import {
  ART_STYLES,
  ArtStyleId,
  ArtworkProject,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  deleteArtworkImage,
  getArtworkImage,
} from "@/lib/storage";
import { downloadDataUrl } from "@/lib/export-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function GalleryView() {
  const { projects, removeProject, upsertProject, setView } = useSonoraStore();
  const [search, setSearch] = useState("");
  const [styleFilter, setStyleFilter] = useState<ArtStyleId | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selected, setSelected] = useState<ArtworkProject | null>(null);
  const [renaming, setRenaming] = useState<ArtworkProject | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ArtworkProject | null>(null);

  const filtered = useMemo(() => {
    let list = [...projects];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.trackTitle.toLowerCase().includes(q) ||
          p.trackArtist.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q)
      );
    }
    if (styleFilter !== "all") {
      list = list.filter((p) => p.styleId === styleFilter);
    }
    list.sort((a, b) =>
      sortOrder === "newest"
        ? b.createdAt - a.createdAt
        : a.createdAt - b.createdAt
    );
    return list;
  }, [projects, search, styleFilter, sortOrder]);

  const handleRename = (p: ArtworkProject) => {
    setRenaming(p);
    setRenameValue(p.title);
  };

  const confirmRename = () => {
    if (!renaming) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast.error("Title cannot be empty");
      return;
    }
    upsertProject({ ...renaming, title: trimmed });
    setRenaming(null);
    toast.success("Renamed");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteArtworkImage(deleteTarget.id);
    removeProject(deleteTarget.id);
    if (selected?.id === deleteTarget.id) setSelected(null);
    setDeleteTarget(null);
    toast.success("Deleted");
  };

  const handleDownload = async (p: ArtworkProject) => {
    toast.info("Loading full-resolution image…");
    const full = await getArtworkImage(p.id);
    const url = full || p.thumbnail;
    downloadDataUrl(url, `${p.title.replace(/\s+/g, "_")}.png`);
    toast.success("Downloaded");
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            My <span className="text-gradient">Gallery</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length === 0
              ? "Your saved creations will appear here."
              : `${projects.length} creation${
                  projects.length === 1 ? "" : "s"
                } · stored locally in your browser`}
          </p>
        </div>
        <Button
          onClick={() => setView("studio")}
          className="bg-sonora-gradient text-white gap-2"
        >
          Create new
        </Button>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl border border-border/60 p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by track name or artist…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/60"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={styleFilter}
            onChange={(e) =>
              setStyleFilter(e.target.value as ArtStyleId | "all")
            }
            className="bg-background/60 border border-border/70 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All styles</option>
            {ART_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value as "newest" | "oldest")
            }
            className="bg-background/60 border border-border/70 rounded-lg px-3 py-2 text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyGallery
          hasProjects={projects.length > 0}
          onCreate={() => setView("studio")}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="group relative rounded-xl overflow-hidden glass border border-border/60 hover:border-[var(--sonora-accent)]/50 transition-all"
            >
              <button
                onClick={() => setSelected(p)}
                className="block w-full aspect-square"
              >
                <img
                  src={p.thumbnail}
                  alt={p.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-2.5 text-white">
                <div className="text-xs font-medium truncate">{p.title}</div>
                <div className="text-[10px] text-white/70 truncate">
                  {p.trackTitle} · {p.trackArtist}
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <IconBtn
                  onClick={() => handleRename(p)}
                  title="Rename"
                >
                  <Pencil className="h-3 w-3" />
                </IconBtn>
                <IconBtn
                  onClick={() => handleDownload(p)}
                  title="Download"
                >
                  <Download className="h-3 w-3" />
                </IconBtn>
                <IconBtn
                  onClick={() => setDeleteTarget(p)}
                  title="Delete"
                  danger
                >
                  <Trash2 className="h-3 w-3" />
                </IconBtn>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <DialogContent className="max-w-3xl bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="grid md:grid-cols-[1fr_220px] gap-4">
              <div className="rounded-xl overflow-hidden bg-black/40 grid place-items-center">
                <img
                  src={selected.thumbnail}
                  alt={selected.title}
                  className="max-h-[60vh] w-full object-contain"
                />
              </div>
              <div className="space-y-3 text-sm">
                <DetailRow
                  icon={Music2}
                  label="Track"
                  value={`${selected.trackTitle} — ${selected.trackArtist}`}
                />
                <DetailRow
                  icon={Palette}
                  label="Style"
                  value={
                    ART_STYLES.find((s) => s.id === selected.styleId)?.name ||
                    selected.styleId
                  }
                />
                <DetailRow
                  icon={Calendar}
                  label="Created"
                  value={new Date(selected.createdAt).toLocaleString()}
                />
                {selected.bpm ? (
                  <DetailRow
                    icon={Clock}
                    label="BPM"
                    value={String(selected.bpm)}
                  />
                ) : null}
                {selected.mood ? (
                  <DetailRow icon={Filter} label="Mood" value={selected.mood} />
                ) : null}
                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    onClick={() => handleDownload(selected)}
                    className="bg-sonora-gradient text-white gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PNG
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleRename(selected);
                      setSelected(null);
                    }}
                    className="gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Rename
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteTarget(selected);
                      setSelected(null);
                    }}
                    className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename creation</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Enter new title"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && confirmRename()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmRename}
              className="bg-sonora-gradient text-white"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this creation?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently removed from your
              gallery. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={cn(
        "h-7 w-7 rounded-full glass-strong grid place-items-center text-white hover:scale-110 transition-transform",
        danger && "bg-destructive/80"
      )}
    >
      {children}
    </button>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-sm truncate">{value}</div>
      </div>
    </div>
  );
}

function EmptyGallery({
  hasProjects,
  onCreate,
}: {
  hasProjects: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="glass rounded-2xl border border-dashed border-border/60 p-12 text-center">
      <div className="inline-flex h-14 w-14 rounded-xl bg-foreground/5 grid place-items-center mb-3">
        <PaletteIcon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-lg">
        {hasProjects ? "No creations match your filters" : "Your gallery is empty"}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        {hasProjects
          ? "Try adjusting your search or filters."
          : "Save an artwork from the studio and it will appear here, stored locally in your browser."}
      </p>
      <Button onClick={onCreate} className="mt-4 bg-sonora-gradient text-white gap-2">
        Open Studio
      </Button>
    </div>
  );
}
