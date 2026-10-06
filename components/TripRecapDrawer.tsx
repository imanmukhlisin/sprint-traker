"use client";

import React, { useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { DayColumn } from "@/types/itinerary";
import { X, Star, Check, Copy } from "lucide-react";

interface TripRecapDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  days: DayColumn[];
  completedTaskIds: string[];
}

export function TripRecapDrawer({
  isOpen,
  onClose,
  days,
  completedTaskIds,
}: TripRecapDrawerProps) {
  const [copied, setCopied] = useState(false);

  // Extract all completed tasks
  const completedTasks = days.flatMap((d) =>
    d.tasks
      .filter((t) => completedTaskIds.includes(t.taskId))
      .map((t) => ({ ...t, dayTitle: d.dayTitle }))
  );

  const ratedTasks = completedTasks.filter((t) => t.rating);
  const avgRating =
    ratedTasks.length > 0
      ? (
          ratedTasks.reduce((acc, t) => acc + (t.rating || 0), 0) /
          ratedTasks.length
        ).toFixed(1)
      : null;

  const handleCopySummary = () => {
    let summary = `✨ REKAP PERJALANAN JOGJA TRIP ✨\n\n`;
    summary += `Total Tempat Dikunjungi: ${completedTasks.length} tempat\n`;
    if (avgRating) summary += `Rating Rata-rata: ${avgRating}/5.0\n`;
    summary += `\n`;

    days.forEach((day) => {
      const dayCompleted = day.tasks.filter((t) =>
        completedTaskIds.includes(t.taskId)
      );
      if (dayCompleted.length > 0) {
        summary += `📅 ${day.dayTitle}:\n`;
        dayCompleted.forEach((t) => {
          const stars = t.rating ? ` (${t.rating}★)` : "";
          const note = t.memoryNote ? ` - "${t.memoryNote}"` : "";
          summary += `  ✓ ${t.title}${stars}${note}\n`;
        });
        summary += `\n`;
      }
    });

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
          <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-text-muted/30" />

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <Drawer.Title className="font-sora font-bold text-lg text-text-main">
                Rekap Memori Perjalanan
              </Drawer.Title>
              <p className="font-space text-xs text-text-muted">
                Ringkasan seluruh tempat yang sudah berhasil dikunjungi.
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

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="rounded-xl bg-[#e8ffee]/60 p-3 border border-primary/20 text-center">
              <span className="block font-space text-[10px] uppercase tracking-wider text-text-muted">
                Tempat Dikunjungi
              </span>
              <span className="font-sora font-extrabold text-xl text-primary">
                {completedTasks.length}
              </span>
            </div>

            <div className="rounded-xl bg-[#e8ffee]/60 p-3 border border-primary/20 text-center">
              <span className="block font-space text-[10px] uppercase tracking-wider text-text-muted">
                Rating Rata-rata
              </span>
              <span className="font-sora font-extrabold text-xl text-text-main">
                {avgRating ? `${avgRating} ★` : "-"}
              </span>
            </div>
          </div>

          {/* List of completed spots */}
          <div className="flex-1 overflow-y-auto space-y-2.5 my-2 pr-0.5 no-scrollbar">
            {completedTasks.length === 0 ? (
              <div className="py-10 text-center text-text-muted">
                <p className="font-space text-xs">
                  Belum ada tempat yang ditandai selesai. Centang to-do list untuk mengisi rekap ini.
                </p>
              </div>
            ) : (
              completedTasks.map((t) => (
                <div
                  key={t.taskId}
                  className="rounded-xl border border-primary/15 bg-white p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-space text-[11px] font-semibold text-text-muted">
                      {t.dayTitle} • {t.time}
                    </span>
                    {t.rating && (
                      <div className="flex items-center gap-0.5 text-primary">
                        <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                        <span className="font-space text-xs font-bold">
                          {t.rating}/5
                        </span>
                      </div>
                    )}
                  </div>

                  <h4 className="font-sora font-bold text-sm text-text-main">
                    {t.isPlanBActive && t.planBTitle ? t.planBTitle : t.title}
                  </h4>

                  {t.address && (
                    <p className="font-inter text-xs text-text-muted">
                      {t.address}
                    </p>
                  )}

                  {t.memoryNote && (
                    <p className="font-inter text-xs text-text-main bg-[#e8ffee]/40 p-2 rounded-lg border border-primary/10 mt-1 italic">
                      &ldquo;{t.memoryNote}&rdquo;
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Action */}
          {completedTasks.length > 0 && (
            <div className="pt-2">
              <Button
                type="button"
                variant="default"
                onClick={handleCopySummary}
                className="w-full font-sora font-semibold text-sm flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Teks Rekap Berhasil Disalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Rekap untuk WA / Catatan</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
