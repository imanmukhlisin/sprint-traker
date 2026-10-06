"use client";

import React, { useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { TaskItem } from "@/types/itinerary";
import { Star, X } from "lucide-react";
import confetti from "canvas-confetti";

interface RatingModalProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveRating: (taskId: string, rating: number, memoryNote: string) => void;
}

export function RatingModal({
  task,
  isOpen,
  onClose,
  onSaveRating,
}: RatingModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [memoryNote, setMemoryNote] = useState("");

  React.useEffect(() => {
    if (task && isOpen) {
      setRating(task.rating || 5);
      setMemoryNote(task.memoryNote || "");
    }
  }, [task, isOpen]);

  if (!task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRating(task.taskId, rating, memoryNote.trim());

    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#ff2d78", "#002112", "#00e676", "#ffffff"],
      });
    } catch (err) {
      console.error(err);
    }

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

        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] rounded-t-3xl border-t border-primary/30 bg-white p-5 pb-8 shadow-xl focus:outline-none flex flex-col">
          <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-text-muted/30" />

          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <Drawer.Title className="font-sora font-bold text-lg text-text-main">
                Selesai! Kasih Rating Tempat Ini
              </Drawer.Title>
              <p className="font-space text-xs text-text-muted">
                {task.title}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-text-muted hover:text-text-main"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 my-2">
            {/* 5 Stars Rating Picker */}
            <div className="flex flex-col items-center justify-center py-2 bg-[#e8ffee]/40 rounded-2xl border border-primary/15">
              <span className="font-space text-xs font-semibold text-text-muted uppercase mb-2">
                Rating Kepuasan
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= rating
                          ? "fill-primary text-primary stroke-primary"
                          : "text-text-muted/30 stroke-text-muted/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="font-space text-xs font-bold text-primary mt-1.5">
                {rating === 5 && "Puas Banget (5/5)"}
                {rating === 4 && "Bagus (4/5)"}
                {rating === 3 && "Cukup Oke (3/5)"}
                {rating === 2 && "Kurang Pas (2/5)"}
                {rating === 1 && "Zonk (1/5)"}
              </span>
            </div>

            {/* Catatan Kesan / Memory Note */}
            <div>
              <label className="block font-space text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
                Catatan Kesan Singkat (Opsional)
              </label>
              <input
                type="text"
                value={memoryNote}
                onChange={(e) => setMemoryNote(e.target.value)}
                placeholder="Misal: Gelatonya enak tapi antre / Spot fotonya keren!"
                className="w-full rounded-xl border border-primary/30 bg-[#e8ffee]/30 px-3.5 py-2.5 font-inter text-sm text-text-main placeholder:text-text-muted/50 focus:border-primary focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              variant="default"
              className="w-full font-sora font-semibold text-sm"
            >
              Simpan Kesan & Selesai
            </Button>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
