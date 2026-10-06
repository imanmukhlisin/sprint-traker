"use client";

import React from "react";
import { Drawer } from "vaul";
import { TaskItem } from "@/types/itinerary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Check, Trash2, MapPin, Star, ArrowLeftRight } from "lucide-react";

interface TaskDrawerProps {
  task: TaskItem | null;
  isOpen: boolean;
  isCompleted: boolean;
  onClose: () => void;
  onToggleComplete: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onTogglePlanB?: (taskId: string) => void;
}

export function TaskDrawer({
  task,
  isOpen,
  isCompleted,
  onClose,
  onToggleComplete,
  onDelete,
  onTogglePlanB,
}: TaskDrawerProps) {
  if (!task) return null;

  const currentTitle =
    task.isPlanBActive && task.planBTitle ? task.planBTitle : task.title;
  const currentAddress =
    task.isPlanBActive && task.planBAddress ? task.planBAddress : task.address;

  // Dynamic Google Maps link based on active title & address
  const searchQuery = [currentTitle, currentAddress, "Yogyakarta"]
    .filter(Boolean)
    .join(" ");
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    searchQuery
  )}`;

  const handleDelete = () => {
    if (!task || !onDelete) return;
    onDelete(task.taskId);
    onClose();
  };

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-[#002112]/30 backdrop-blur-xs transition-opacity" />

        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] rounded-t-3xl border-t border-primary/30 bg-white p-5 pb-8 shadow-xl focus:outline-none flex flex-col">
          <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-text-muted/30" />

          {/* Top Bar: Category, Time, and Actions */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="neon" className="font-space uppercase tracking-wider text-xs">
                {task.category}
              </Badge>
              {task.venueType && (
                <span className="font-space text-xs text-text-muted border border-text-muted/20 px-2 py-0.5 rounded-full">
                  {task.venueType}
                </span>
              )}
              <span className="font-space text-xs font-semibold text-primary">
                {task.time}
              </span>
              {task.addedBy && (
                <span className="font-space text-[11px] text-text-muted">
                  • by {task.addedBy}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="p-1.5 text-text-muted hover:text-red-500 transition-colors rounded-lg"
                  title="Hapus Rencana"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 text-text-muted hover:text-text-main transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Plan B Notice Banner */}
          {task.isPlanBActive && (
            <div className="p-2 mb-2 rounded-xl bg-primary/10 border border-primary/30 text-xs font-space text-primary font-semibold flex items-center justify-between">
              <span>Sedang Menggunakan Plan B (Tempat Cadangan)</span>
              {onTogglePlanB && (
                <button
                  onClick={() => onTogglePlanB(task.taskId)}
                  className="underline hover:text-text-main"
                >
                  Balik ke Utama
                </button>
              )}
            </div>
          )}

          {/* Title */}
          <Drawer.Title className="font-sora font-bold text-xl text-text-main leading-tight mb-1">
            {currentTitle}
          </Drawer.Title>

          {/* Address */}
          {currentAddress && (
            <div className="flex items-start gap-1.5 text-text-muted my-1.5">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="font-inter text-xs sm:text-sm text-text-main font-medium">
                {currentAddress}
              </p>
            </div>
          )}

          {/* Plan B Alternative switch box */}
          {task.planBTitle && onTogglePlanB && !task.isPlanBActive && (
            <div className="my-2 p-2.5 rounded-xl bg-[#e8ffee]/60 border border-primary/20 flex items-center justify-between">
              <div>
                <span className="block font-space text-[10px] uppercase font-bold text-text-muted">
                  Ada Plan B Cadangan:
                </span>
                <span className="font-sora text-xs font-semibold text-text-main">
                  {task.planBTitle}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onTogglePlanB(task.taskId)}
                className="px-2.5 py-1 rounded-lg bg-primary text-white font-space text-[11px] font-semibold flex items-center gap-1"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>Ganti ke Plan B</span>
              </button>
            </div>
          )}

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto space-y-3 my-2 no-scrollbar">
            <p className="font-inter text-sm sm:text-base text-text-main leading-relaxed">
              {task.description}
            </p>

            {task.tips && (
              <p className="font-inter text-xs sm:text-sm text-text-muted bg-[#e8ffee]/70 p-3 rounded-xl border border-primary/20">
                <span className="font-semibold text-text-main font-space">Tips: </span>
                {task.tips}
              </p>
            )}

            {/* If completed, show rating & memory note */}
            {isCompleted && task.rating && (
              <div className="p-3 rounded-xl bg-white border border-primary/25 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-space text-xs font-semibold text-text-muted uppercase">
                    Rating Tempat
                  </span>
                  <div className="flex items-center gap-1 text-primary">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="font-space text-sm font-bold">
                      {task.rating}/5
                    </span>
                  </div>
                </div>
                {task.memoryNote && (
                  <p className="font-inter text-xs text-text-main italic pt-1">
                    &ldquo;{task.memoryNote}&rdquo;
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 mt-2 border-t border-primary/15 flex flex-col gap-2">
            {/* Primary Button: Open in Maps */}
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button
                variant="default"
                className="w-full font-sora font-semibold text-sm"
              >
                Buka di Google Maps
              </Button>
            </a>

            {/* Secondary Button: Mark as Done */}
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onToggleComplete(task.taskId);
                onClose();
              }}
              className="w-full font-sora font-semibold text-sm flex items-center justify-center gap-2"
            >
              {isCompleted ? (
                <span>Sudah Selesai (Batal)</span>
              ) : (
                <>
                  <Check className="w-4 h-4 text-[#00e676]" />
                  <span>Tandai Selesai</span>
                </>
              )}
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
