"use client";

import React, { useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { TaskItem, DayColumn } from "@/types/itinerary";
import { X } from "lucide-react";
import confetti from "canvas-confetti";

interface AddTaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (dayId: string, task: TaskItem) => void;
  defaultDayId: string;
  days: DayColumn[];
}

const CATEGORIES = ["Jemput", "Kuliner", "Wisata", "Nongkrong", "Belanja", "Logistik", "Bebas"];

export function AddTaskDrawer({
  isOpen,
  onClose,
  onAddTask,
  defaultDayId,
  days,
}: AddTaskDrawerProps) {
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [dayId, setDayId] = useState(defaultDayId || days[0]?.dayId || "day-1");
  const [time, setTime] = useState("");
  const [category, setCategory] = useState("Kuliner");
  const [venueType, setVenueType] = useState<"Indoor (AC)" | "Outdoor">("Indoor (AC)");
  const [showPlanB, setShowPlanB] = useState(false);
  const [planBTitle, setPlanBTitle] = useState("");
  const [planBAddress, setPlanBAddress] = useState("");
  const [description, setDescription] = useState("");
  const [addedBy, setAddedBy] = useState<"Princess" | "Copilot">("Princess");

  React.useEffect(() => {
    if (isOpen) {
      setDayId(defaultDayId || days[0]?.dayId || "day-1");
    }
  }, [isOpen, defaultDayId, days]);

  const applyPickupTemplate = () => {
    setTitle("Jemput Princess");
    setCategory("Jemput");
    setVenueType("Outdoor");
    setAddedBy("Copilot");
    if (!time) setTime("09:30");
    if (!address) setAddress("Kosan");
    setDescription("Siap-siap 15 menit sebelumnya yaa sayang, nanti aku kabarin kalau udah mau sampai!");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const targetDayId = dayId || days[0]?.dayId;
    if (!targetDayId) return;

    const searchQuery = [title.trim(), address.trim(), "Yogyakarta"]
      .filter(Boolean)
      .join(" ");

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      searchQuery
    )}`;

    const newTask: TaskItem = {
      taskId: `task-${Date.now()}`,
      title: title.trim(),
      address: address.trim() || undefined,
      time: time.trim() || "Fleksibel",
      category,
      venueType,
      planBTitle: planBTitle.trim() || undefined,
      planBAddress: planBAddress.trim() || undefined,
      isPlanBActive: false,
      description: description.trim() || (category === "Jemput" ? "Jemputan kencan Jogja" : "Rencana agenda di Jogja."),
      mapsUrl,
      addedBy,
    };

    onAddTask(targetDayId, newTask);

    try {
      confetti({
        particleCount: 40,
        spread: 45,
        origin: { y: 0.8 },
        colors: ["#ff2d78", "#002112", "#00e676", "#ffffff"],
      });
    } catch (err) {
      console.error(err);
    }

    // Reset
    setTitle("");
    setAddress("");
    setTime("");
    setPlanBTitle("");
    setPlanBAddress("");
    setShowPlanB(false);
    setDescription("");
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

        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] rounded-t-3xl border-t border-primary/20 bg-white p-5 pb-7 shadow-xl focus:outline-none flex flex-col">
          <div className="mx-auto mb-3 h-1 w-9 shrink-0 rounded-full bg-black/15" />

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <Drawer.Title className="font-sora font-bold text-base text-text-main">
              Tambah Rencana
            </Drawer.Title>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-text-muted hover:text-text-main transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets / Template Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-3 py-0.5">
            <button
              type="button"
              onClick={applyPickupTemplate}
              className={`py-1 px-3 rounded-full font-space text-xs font-bold border transition-all shrink-0 ${
                category === "Jemput"
                  ? "bg-primary text-white border-primary shadow-xs"
                  : "bg-pink-50 hover:bg-pink-100/80 text-primary border-primary/25"
              }`}
            >
              Jemput Princess
            </button>

            <button
              type="button"
              onClick={() => {
                setTitle("Ngopi Santai & Ngobrol");
                setCategory("Nongkrong");
                setVenueType("Indoor (AC)");
              }}
              className="py-1 px-2.5 rounded-full font-space text-xs font-semibold bg-gray-100 hover:bg-gray-200/80 text-text-muted border border-gray-200 transition-all shrink-0"
            >
              Ngopi
            </button>

            <button
              type="button"
              onClick={() => {
                setTitle("Hunting Foto");
                setCategory("Wisata");
                setVenueType("Outdoor");
              }}
              className="py-1 px-2.5 rounded-full font-space text-xs font-semibold bg-gray-100 hover:bg-gray-200/80 text-text-muted border border-gray-200 transition-all shrink-0"
            >
              Foto
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 no-scrollbar"
          >
            {/* Segmented Pill: Princess / Copilot */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-gray-100/80 border border-gray-200/60">
              <button
                type="button"
                onClick={() => setAddedBy("Princess")}
                className={`py-1.5 rounded-lg font-space text-xs font-semibold transition-all ${
                  addedBy === "Princess"
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                Princess
              </button>
              <button
                type="button"
                onClick={() => setAddedBy("Copilot")}
                className={`py-1.5 rounded-lg font-space text-xs font-semibold transition-all ${
                  addedBy === "Copilot"
                    ? "bg-[#002112] text-white shadow-xs"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                Copilot
              </button>
            </div>

            {/* Nama Tempat */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                {category === "Jemput" ? "Agenda Jemput *" : "Nama Tempat *"}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={category === "Jemput" ? "Contoh: Jemput Princess di Kosan" : "Nama destinasi atau tempat"}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 font-inter text-sm text-text-main placeholder:text-text-muted/40 focus:border-primary focus:bg-white focus:outline-none transition-all"
              />
            </div>

            {/* Alamat / Titik Jemput */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                {category === "Jemput" ? "Lokasi Jemput" : "Alamat / Patokan"}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={category === "Jemput" ? "Contoh: Kosan Princess / Hotel" : "Alamat atau lokasi (opsional)"}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 font-inter text-sm text-text-main placeholder:text-text-muted/40 focus:border-primary focus:bg-white focus:outline-none transition-all"
              />
              {category === "Jemput" && (
                <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto no-scrollbar">
                  {["Kosan Princess", "Lobby Hotel", "Stasiun Tugu", "Stasiun Lempuyangan", "Rumah"].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setAddress(loc)}
                      className="px-2 py-0.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-primary border border-primary/20 text-[10px] font-space font-medium shrink-0"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Hari & Jam */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Hari
                </label>
                <select
                  value={dayId}
                  onChange={(e) => setDayId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 font-space text-xs text-text-main focus:border-primary focus:bg-white focus:outline-none transition-all"
                >
                  {days.map((d) => (
                    <option key={d.dayId} value={d.dayId}>
                      {d.dayTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  {category === "Jemput" ? "Jam Jemput" : "Jam"}
                </label>
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder={category === "Jemput" ? "09:30 WIB" : "19:00 / Fleksibel"}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 font-space text-xs text-text-main placeholder:text-text-muted/40 focus:border-primary focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Quick Jam Chips for Jemput */}
            {category === "Jemput" && (
              <div className="p-2.5 rounded-2xl bg-pink-50/60 border border-primary/20 -mt-1 space-y-2">
                <span className="text-[11px] font-space font-bold text-primary block">
                  Mau jemput jam berapa?
                </span>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {["08:30", "09:00", "09:30", "10:00", "13:30", "16:00"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTime(t)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-space font-semibold transition-all ${
                        time === t
                          ? "bg-primary text-white shadow-2xs"
                          : "bg-white text-text-main border border-primary/20 hover:border-primary"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suasana (AC / Outdoor) */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Suasana
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVenueType("Indoor (AC)")}
                  className={`py-1.5 rounded-xl font-space text-xs font-medium transition-all border ${
                    venueType === "Indoor (AC)"
                      ? "bg-[#002112] text-white border-[#002112]"
                      : "bg-white text-text-main border-gray-200 hover:border-gray-300"
                  }`}
                >
                  Indoor (AC)
                </button>
                <button
                  type="button"
                  onClick={() => setVenueType("Outdoor")}
                  className={`py-1.5 rounded-xl font-space text-xs font-medium transition-all border ${
                    venueType === "Outdoor"
                      ? "bg-[#002112] text-white border-[#002112]"
                      : "bg-white text-text-main border-gray-200 hover:border-gray-300"
                  }`}
                >
                  Outdoor
                </button>
              </div>
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Kategori
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      if (cat === "Jemput" && !title) {
                        setTitle("Jemput Princess");
                        setAddedBy("Copilot");
                        setVenueType("Outdoor");
                        if (!time) setTime("09:30");
                      }
                    }}
                    className={`px-3 py-1 rounded-full font-space text-xs transition-all ${
                      category === cat
                        ? "bg-primary text-white font-medium shadow-xs"
                        : "bg-gray-100 text-text-main hover:bg-gray-200/80"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>


            {/* Plan B Collapsible */}
            <div className="pt-0.5">
              {!showPlanB ? (
                <button
                  type="button"
                  onClick={() => setShowPlanB(true)}
                  className="text-xs font-space font-medium text-primary hover:text-primary-hover transition-colors"
                >
                  + Tambah Plan B
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-space text-xs font-semibold text-text-main">
                      Plan B Cadangan
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlanB(false);
                        setPlanBTitle("");
                        setPlanBAddress("");
                      }}
                      className="text-[11px] font-space text-text-muted hover:text-red-500 transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                  <input
                    type="text"
                    value={planBTitle}
                    onChange={(e) => setPlanBTitle(e.target.value)}
                    placeholder="Nama tempat cadangan"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-inter text-xs text-text-main placeholder:text-text-muted/40 focus:outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    value={planBAddress}
                    onChange={(e) => setPlanBAddress(e.target.value)}
                    placeholder="Alamat cadangan (opsional)"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-inter text-xs text-text-main placeholder:text-text-muted/40 focus:outline-none focus:border-primary"
                  />
                </div>
              )}
            </div>

            {/* Catatan Tambahan */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Catatan
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Catatan menu / tips (opsional)"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 font-inter text-xs text-text-main placeholder:text-text-muted/40 focus:border-primary focus:bg-white focus:outline-none transition-all"
              />
            </div>

            {/* Submit */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="default"
                className="w-full font-sora font-semibold text-sm py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white shadow-xs"
              >
                Simpan
              </Button>
            </div>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
