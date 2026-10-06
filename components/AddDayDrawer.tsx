"use client";

import React, { useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface AddDayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDay: (title: string) => void;
  suggestedTitle: string;
}

export function AddDayDrawer({
  isOpen,
  onClose,
  onAddDay,
  suggestedTitle,
}: AddDayDrawerProps) {
  const [title, setTitle] = useState(suggestedTitle);

  React.useEffect(() => {
    if (isOpen) {
      setTitle(suggestedTitle);
    }
  }, [isOpen, suggestedTitle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddDay(title.trim());
    setTitle("");
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

        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[60vh] rounded-t-3xl border-t border-primary/30 bg-white p-5 pb-8 shadow-xl focus:outline-none flex flex-col">
          <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-text-muted/30" />

          <div className="flex items-center justify-between mb-3">
            <div>
              <Drawer.Title className="font-sora font-bold text-lg text-text-main">
                + Tambah Hari Baru
              </Drawer.Title>
              <p className="font-space text-xs text-text-muted">
                Tentukan nama atau tanggal hari untuk kolom baru.
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-space text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
                Judul / Tanggal Hari
              </label>
              <input
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Misal: Day 1 - 26 Okt / Sabtu, 26 Okt"
                className="w-full rounded-xl border border-primary/30 bg-[#e8ffee]/30 px-3.5 py-2.5 font-inter text-sm text-text-main placeholder:text-text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <Button
              type="submit"
              variant="default"
              className="w-full font-sora font-semibold text-sm"
            >
              Tambah Kolom Hari
            </Button>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
