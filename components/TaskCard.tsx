"use client";

import React from "react";
import { TaskItem } from "@/types/itinerary";
import { Badge } from "@/components/ui/badge";
import { Check, Trash2, Star, ArrowLeftRight } from "lucide-react";

interface TaskCardProps {
  task: TaskItem;
  isCompleted: boolean;
  onSelect: (task: TaskItem) => void;
  onToggleComplete: (taskId: string, e: React.MouseEvent) => void;
  onDelete: (taskId: string, e: React.MouseEvent) => void;
  onTogglePlanB?: (taskId: string, e: React.MouseEvent) => void;
}

export function TaskCard({
  task,
  isCompleted,
  onSelect,
  onToggleComplete,
  onDelete,
  onTogglePlanB,
}: TaskCardProps) {
  const currentTitle =
    task.isPlanBActive && task.planBTitle ? task.planBTitle : task.title;
  const currentAddress =
    task.isPlanBActive && task.planBAddress ? task.planBAddress : task.address;

  return (
    <div
      onClick={() => onSelect(task)}
      className={`group relative w-full rounded-2xl bg-white p-3.5 sm:p-4 transition-all duration-200 cursor-pointer select-none border border-primary/30
        hover:border-primary hover:shadow-neon-hover active:shadow-neon-border
        ${isCompleted ? "opacity-55 bg-white/70" : "opacity-100"}
      `}
    >
      {/* Top: Checklist, Time, Rating & Delete */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={(e) => onToggleComplete(task.taskId, e)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-space text-xs font-semibold transition-all ${
            isCompleted
              ? "bg-[#00e676]/20 text-[#008a3f] border border-[#00e676]/40"
              : "bg-[#002112]/5 text-text-muted border border-text-muted/20 hover:border-primary"
          }`}
        >
          <div
            className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
              isCompleted
                ? "bg-[#00a854] border-[#00a854] text-white"
                : "border-text-muted/40 bg-white"
            }`}
          >
            {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          </div>
          <span>{isCompleted ? "Done" : "To-Do"}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Show rating if completed */}
          {isCompleted && task.rating && (
            <div className="flex items-center gap-0.5 text-primary font-space text-xs font-bold">
              <Star className="w-3 h-3 fill-primary text-primary" />
              <span>{task.rating}</span>
            </div>
          )}

          <span className="font-space text-xs font-semibold text-primary">
            {task.time}
          </span>

          <button
            type="button"
            onClick={(e) => onDelete(task.taskId, e)}
            className="p-1 text-text-muted/50 hover:text-red-500 transition-colors rounded-md"
            title="Hapus rencana"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Plan B Alert Badge if active */}
      {task.isPlanBActive && (
        <span className="inline-block font-space text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">
          Plan B Aktif (Cadangan)
        </span>
      )}

      {/* Title */}
      <h3
        className={`font-sora font-bold text-sm sm:text-base text-text-main leading-snug my-1 ${
          isCompleted ? "line-through text-text-muted" : ""
        }`}
      >
        {currentTitle}
      </h3>

      {/* Address */}
      {currentAddress && (
        <p className="font-inter text-xs text-text-muted line-clamp-1 mb-2">
          {currentAddress}
        </p>
      )}

      {/* Dedicated Plan B Toggle Button if exists */}
      {task.planBTitle && onTogglePlanB && !isCompleted && (
        <div className="my-2">
          <button
            type="button"
            onClick={(e) => onTogglePlanB(task.taskId, e)}
            className="w-full py-1 px-2.5 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/25 text-primary font-space text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeftRight className="w-3 h-3" />
            <span>
              {task.isPlanBActive
                ? "Balik ke Tempat Utama"
                : `Ganti Plan B (${task.planBTitle})`}
            </span>
          </button>
        </div>
      )}

      {/* Bottom Bar: Category & Added By */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-primary/10">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="neon"
            className="font-space font-medium text-[10px] uppercase tracking-wider py-0.5 px-2 rounded-full"
          >
            {task.category}
          </Badge>

          {task.venueType && (
            <span className="font-space text-[10px] text-text-muted border border-text-muted/20 px-1.5 py-0.5 rounded-md">
              {task.venueType.includes("AC") ? "AC" : "Outdoor"}
            </span>
          )}

          {typeof task.distanceKm === "number" && (
            <span className="font-space text-[10px] font-semibold text-primary bg-primary/10 border border-primary/25 px-1.5 py-0.5 rounded-md">
              {task.distanceKm} km
            </span>
          )}
        </div>

        {task.addedBy && (
          <span className="font-space text-[11px] text-text-muted shrink-0 ml-1">
            by {task.addedBy}
          </span>
        )}
      </div>
    </div>
  );
}
