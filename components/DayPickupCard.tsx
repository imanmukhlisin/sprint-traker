"use client";

import React, { useState } from "react";
import { DayColumn, PickupStatus } from "@/types/itinerary";
import confetti from "canvas-confetti";

interface DayPickupCardProps {
  day: DayColumn;
  onUpdatePickup: (
    dayId: string,
    updates: {
      pickupTime?: string;
      pickupLocation?: string;
      pickupStatus?: PickupStatus;
    }
  ) => void;
}

export function DayPickupCard({ day, onUpdatePickup }: DayPickupCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTime, setTempTime] = useState(day.pickupTime || "09:30");
  const [tempLocation, setTempLocation] = useState(day.pickupLocation || "Kosan");

  const currentStatus = day.pickupStatus || "preparing";

  const handleStatusChange = (status: PickupStatus) => {
    onUpdatePickup(day.dayId, { pickupStatus: status });

    if (status === "arrived") {
      try {
        confetti({
          particleCount: 35,
          spread: 45,
          origin: { y: 0.7 },
          colors: ["#ff2d78", "#ffffff", "#00e676"],
        });
      } catch {
        // Ignore
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePickup(day.dayId, {
      pickupTime: tempTime.trim() || undefined,
      pickupLocation: tempLocation.trim() || undefined,
    });
    setIsEditing(false);
  };

  return (
    <div className="mb-3 rounded-2xl bg-white/85 border border-primary/25 p-3 shadow-xs select-none">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-sora font-bold text-xs text-text-main">
              Jadwal Jemput
            </span>
            {day.pickupTime ? (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-space text-[11px] font-black">
                {day.pickupTime}
              </span>
            ) : (
              <span className="text-[10px] font-space text-text-muted">
                (Belum di-set)
              </span>
            )}
          </div>
          <p className="text-[10px] font-space text-text-muted truncate mt-0.5">
            {day.pickupLocation ? `Titik: ${day.pickupLocation}` : "Mau jemput jam berapa hari ini?"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setTempTime(day.pickupTime || "09:30");
            setTempLocation(day.pickupLocation || "Kosan");
            setIsEditing(!isEditing);
          }}
          className="px-2.5 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-primary border border-primary/20 font-space text-[10px] font-bold shrink-0 transition-all active:scale-95"
        >
          {isEditing ? "Tutup" : day.pickupTime ? "Ubah" : "+ Set Jam"}
        </button>
      </div>

      {/* Editing Form */}
      {isEditing && (
        <form onSubmit={handleSave} className="mt-2.5 pt-2.5 border-t border-primary/15 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-space font-medium text-text-muted mb-1">
                Jam Jemput
              </label>
              <input
                type="text"
                value={tempTime}
                onChange={(e) => setTempTime(e.target.value)}
                placeholder="09:30"
                className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-space text-text-main focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-space font-medium text-text-muted mb-1">
                Lokasi Jemput
              </label>
              <input
                type="text"
                value={tempLocation}
                onChange={(e) => setTempLocation(e.target.value)}
                placeholder="Kosan / Hotel"
                className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-space text-text-main focus:bg-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Quick hour options */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {["08:30", "09:00", "09:30", "10:00", "13:30", "16:00"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTempTime(t)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-space font-semibold shrink-0 transition-all ${
                  tempTime === t
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-text-muted hover:text-text-main"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1 rounded-lg text-xs font-space text-text-muted hover:text-text-main"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white font-space text-xs font-bold shadow-2xs"
            >
              Simpan Jadwal
            </button>
          </div>
        </form>
      )}

      {/* Live Couple Status Bar */}
      {day.pickupTime && !isEditing && (
        <div className="mt-2 pt-2 border-t border-primary/10">
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => handleStatusChange("preparing")}
              className={`py-1 px-1 rounded-lg font-space text-[10px] font-bold text-center transition-all ${
                currentStatus === "preparing"
                  ? "bg-pink-100/90 text-primary border border-primary/30 shadow-2xs scale-101"
                  : "bg-gray-100/70 text-text-muted hover:bg-gray-100"
              }`}
            >
              Siap-siap
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("otw")}
              className={`py-1 px-1 rounded-lg font-space text-[10px] font-bold text-center transition-all ${
                currentStatus === "otw"
                  ? "bg-emerald-500 text-white shadow-2xs scale-101"
                  : "bg-gray-100/70 text-text-muted hover:bg-gray-100"
              }`}
            >
              OTW Jalan
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("arrived")}
              className={`py-1 px-1 rounded-lg font-space text-[10px] font-bold text-center transition-all ${
                currentStatus === "arrived"
                  ? "bg-primary text-white shadow-2xs scale-101"
                  : "bg-gray-100/70 text-text-muted hover:bg-gray-100"
              }`}
            >
              Sudah Sampai
            </button>
          </div>

          <p className="text-[9.5px] font-inter text-text-muted text-center mt-1.5">
            {currentStatus === "preparing" && "Princess sedang siap-siap untuk berangkat."}
            {currentStatus === "otw" && "Copilot sedang dalam perjalanan. Hati-hati yaa."}
            {currentStatus === "arrived" && "Copilot sudah sampai di titik jemput."}
          </p>
        </div>
      )}
    </div>
  );
}
