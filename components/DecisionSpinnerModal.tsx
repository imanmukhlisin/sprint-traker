"use client";

import React, { useState, useEffect } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { TaskItem } from "@/types/itinerary";
import { X, Shuffle } from "lucide-react";
import confetti from "canvas-confetti";
import { playSpinnerTickSound, playSpinnerWinnerSound } from "@/lib/sound-effects";

interface DecisionSpinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  onSelectWinner: (task: TaskItem) => void;
}

export function DecisionSpinnerModal({
  isOpen,
  onClose,
  tasks,
  onSelectWinner,
}: DecisionSpinnerModalProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<TaskItem | null>(null);
  const [displayTitle, setDisplayTitle] = useState("");

  const uncompletedTasks = tasks.filter((t) => Boolean(t.title));

  useEffect(() => {
    if (isOpen) {
      setWinner(null);
      setDisplayTitle(uncompletedTasks[0]?.title || "Belum ada rencana");
    }
  }, [isOpen, tasks]);

  const handleSpin = () => {
    if (uncompletedTasks.length <= 1) {
      setWinner(uncompletedTasks[0] || null);
      playSpinnerWinnerSound();
      return;
    }

    setIsSpinning(true);
    setWinner(null);

    let counter = 0;
    const totalSpins = 25;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * uncompletedTasks.length);
      setDisplayTitle(uncompletedTasks[randomIndex].title);
      playSpinnerTickSound();
      counter++;

      if (counter >= totalSpins) {
        clearInterval(interval);
        const finalWinner =
          uncompletedTasks[Math.floor(Math.random() * uncompletedTasks.length)];
        setDisplayTitle(finalWinner.title);
        setWinner(finalWinner);
        setIsSpinning(false);
        playSpinnerWinnerSound();

        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.8 },
            colors: ["#ff2d78", "#002112", "#00e676", "#ffffff"],
          });
        } catch (err) {
          console.error(err);
        }
      }
    }, 70);
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
          <div className="flex items-center justify-between mb-3">
            <div>
              <Drawer.Title className="font-sora font-bold text-lg text-text-main">
                Acak Pilihan Tempat
              </Drawer.Title>
              <p className="font-space text-xs text-text-muted">
                Penyelesai masalah terserah: serahkan pilihan ke sistem.
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

          {uncompletedTasks.length === 0 ? (
            <div className="py-8 text-center text-text-muted">
              <p className="font-space text-sm">
                Belum ada rencana di hari ini untuk diacak.
              </p>
            </div>
          ) : (
            <div className="space-y-4 my-2">
              {/* Spinner Display Box */}
              <div
                className={`py-8 px-4 rounded-2xl border-2 text-center transition-all ${
                  winner
                    ? "bg-primary/10 border-primary shadow-neon-border scale-[1.02]"
                    : "bg-[#e8ffee]/50 border-primary/20"
                }`}
              >
                <span className="block font-space text-xs font-semibold text-text-muted uppercase mb-1">
                  {winner ? "Tempat Terpilih:" : "Rencana:"}
                </span>
                <h3 className="font-sora font-extrabold text-xl sm:text-2xl text-text-main tracking-tight leading-snug">
                  {displayTitle}
                </h3>
                {winner && winner.address && (
                  <p className="font-inter text-xs text-text-muted mt-1.5">
                    {winner.address}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  type="button"
                  variant="default"
                  disabled={isSpinning}
                  onClick={handleSpin}
                  className="w-full font-sora font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>{isSpinning ? "Mengacak..." : "Mulai Acak Pilihan"}</span>
                </Button>

                {winner && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onSelectWinner(winner);
                      onClose();
                    }}
                    className="w-full font-sora font-semibold text-sm"
                  >
                    Buka Detail Tempat Ini
                  </Button>
                )}
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
