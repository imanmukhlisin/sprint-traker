"use client";

import React, { useState, useEffect, useRef } from "react";
import initialData from "@/data/itinerary.json";
import { DayColumn, TaskItem } from "@/types/itinerary";
import { TaskCard } from "@/components/TaskCard";
import { TaskDrawer } from "@/components/TaskDrawer";
import { AddTaskDrawer } from "@/components/AddTaskDrawer";
import { AddDayDrawer } from "@/components/AddDayDrawer";
import { DecisionSpinnerModal } from "@/components/DecisionSpinnerModal";
import { RatingModal } from "@/components/RatingModal";
import { TripRecapDrawer } from "@/components/TripRecapDrawer";
import { CuteCompanion } from "@/components/CuteCompanion";
import { TapDuelModal } from "@/components/TapDuelModal";
import { DayPickupCard } from "@/components/DayPickupCard";
import { SplashScreen } from "@/components/SplashScreen";
import { SharedScheduleBar } from "@/components/SharedScheduleBar";
import { useSharedItinerary } from "@/lib/use-shared-itinerary";
import {
  Plus,
  Check,
  Trash2,
  CalendarPlus,
  Shuffle,
  BookOpen,
  Map,
  Navigation,
  Gamepad2,
} from "lucide-react";
import { getDistanceKm, estimateCoordinates } from "@/lib/geo";
import { getJogjaHeatAdvisory } from "@/lib/weather";

export default function HomePage() {
  const sync = useSharedItinerary(initialData as DayColumn[]);
  const { days, completedTasks, saveDays, setCompletedTasks } = sync;
  const [activeTab, setActiveTab] = useState<string>("day-1");
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Modals & Drawers
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddDayOpen, setIsAddDayOpen] = useState(false);
  const [isSpinnerOpen, setIsSpinnerOpen] = useState(false);
  const [isRecapOpen, setIsRecapOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [ratingTargetTask, setRatingTargetTask] = useState<TaskItem | null>(null);

  const [addDefaultDayId, setAddDefaultDayId] = useState("day-1");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Keep selection valid when another device changes the shared itinerary.
  useEffect(() => {
    if (!days.some((day) => day.dayId === activeTab)) setActiveTab(days[0].dayId);
    setSelectedTask((task) => task ? days.flatMap((day) => day.tasks).find((item) => item.taskId === task.taskId) || null : null);
  }, [days, activeTab]);

  // Add Day
  const handleAddDay = (dayTitle: string) => {
    const newDayId = `day-${Date.now()}`;
    const newDay: DayColumn = {
      dayId: newDayId,
      dayTitle,
      tasks: [],
    };
    const updated = [...days, newDay];
    saveDays(updated);
    setActiveTab(newDayId);
    setTimeout(() => scrollToDay(newDayId), 100);
  };

  // Delete Day
  const handleDeleteDay = (dayId: string, dayTitle: string) => {
    if (days.length <= 1) {
      alert("Minimal harus ada 1 hari di jadwal!");
      return;
    }
    const confirmed = confirm(`Hapus kolom "${dayTitle}" beserta seluruh rencananya?`);
    if (!confirmed) return;

    const updated = days.filter((d) => d.dayId !== dayId);
    saveDays(updated);
    if (activeTab === dayId) {
      setActiveTab(updated[0]?.dayId || "");
    }
  };

  // Add Task
  const handleAddTask = (dayId: string, newTask: TaskItem) => {
    const updated = days.map((day) => {
      if (day.dayId === dayId) {
        return {
          ...day,
          tasks: [...day.tasks, newTask],
        };
      }
      return day;
    });
    saveDays(updated);
  };

  // Delete Task
  const handleDeleteTask = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = days.map((day) => ({
      ...day,
      tasks: day.tasks.filter((t) => t.taskId !== taskId),
    }));
    saveDays(updated);

    setCompletedTasks((prev) => {
      const next = prev.filter((id) => id !== taskId);
      return next;
    });
  };

  // Toggle Plan B (Ganti ke tempat cadangan)
  const handleTogglePlanB = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = days.map((day) => ({
      ...day,
      tasks: day.tasks.map((t) => {
        if (t.taskId === taskId) {
          const nextActive = !t.isPlanBActive;
          return {
            ...t,
            isPlanBActive: nextActive,
          };
        }
        return t;
      }),
    }));
    saveDays(updated);

    // Update selectedTask if currently opened
    if (selectedTask && selectedTask.taskId === taskId) {
      setSelectedTask((prev) =>
        prev ? { ...prev, isPlanBActive: !prev.isPlanBActive } : null
      );
    }
  };

  // Toggle To-Do: If marking complete -> open RatingModal! If unmarking -> toggle immediately
  const handleToggleComplete = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const isCurrentlyDone = completedTasks.includes(taskId);

    if (isCurrentlyDone) {
      // Unmark
      setCompletedTasks((prev) => {
        const next = prev.filter((id) => id !== taskId);
        return next;
      });
    } else {
      // Find task and prompt rating & memory note
      let found: TaskItem | null = null;
      for (const d of days) {
        const match = d.tasks.find((t) => t.taskId === taskId);
        if (match) {
          found = match;
          break;
        }
      }
      if (found) {
        setRatingTargetTask(found);
      }
    }
  };

  // Save Rating & Complete Task
  const handleSaveRating = (
    taskId: string,
    rating: number,
    memoryNote: string
  ) => {
    // 1. Update task with rating & memoryNote
    const updated = days.map((day) => ({
      ...day,
      tasks: day.tasks.map((t) => {
        if (t.taskId === taskId) {
          return { ...t, rating, memoryNote };
        }
        return t;
      }),
    }));
    saveDays(updated);

    // 2. Add to completed
    setCompletedTasks((prev) => {
      const next = prev.includes(taskId) ? prev : [...prev, taskId];
      return next;
    });

    setRatingTargetTask(null);
  };

  // Update Day Pickup Details & Status
  const handleUpdatePickup = (
    dayId: string,
    updates: {
      pickupTime?: string;
      pickupLocation?: string;
      pickupStatus?: "preparing" | "otw" | "arrived";
    }
  ) => {
    const updated = days.map((day) => {
      if (day.dayId === dayId) {
        return {
          ...day,
          ...updates,
        };
      }
      return day;
    });
    saveDays(updated);
  };

  // Multi-Stop Route Generator for a Day
  const handleOpenMultiStopRoute = (tasks: TaskItem[]) => {
    const stops = tasks
      .map((t) => {
        const title = t.isPlanBActive && t.planBTitle ? t.planBTitle : t.title;
        const addr =
          t.isPlanBActive && t.planBAddress ? t.planBAddress : t.address;
        return [title, addr, "Yogyakarta"].filter(Boolean).join(" ");
      })
      .filter(Boolean);

    if (stops.length === 0) return;

    let routeUrl = "";
    if (stops.length === 1) {
      routeUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        stops[0]
      )}`;
    } else {
      const encodedStops = stops.map(encodeURIComponent).join("/");
      routeUrl = `https://www.google.com/maps/dir/${encodedStops}`;
    }

    window.open(routeUrl, "_blank");
  };

  // GPS Sort by nearest to user location
  const handleSortByDistance = (dayId: string) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Fitur GPS tidak didukung di browser ini.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        const updated = days.map((day) => {
          if (day.dayId === dayId) {
            const tasksWithDist = day.tasks.map((task) => {
              const activeTitle =
                task.isPlanBActive && task.planBTitle ? task.planBTitle : task.title;
              const activeAddr =
                task.isPlanBActive && task.planBAddress
                  ? task.planBAddress
                  : task.address;
              const coords = estimateCoordinates(
                `${activeTitle} ${activeAddr || ""}`
              );
              const dist = getDistanceKm(userLat, userLng, coords.lat, coords.lng);
              return {
                ...task,
                distanceKm: dist,
                lat: coords.lat,
                lng: coords.lng,
              };
            });

            tasksWithDist.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

            return {
              ...day,
              tasks: tasksWithDist,
            };
          }
          return day;
        });

        saveDays(updated);
      },
      (err) => {
        console.error(err);
        alert("Gagal membaca GPS. Pastikan izin lokasi aktif di HP.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleOpenTask = (task: TaskItem) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const openAddForDay = (dayId: string) => {
    setAddDefaultDayId(dayId);
    setIsAddTaskOpen(true);
  };

  const scrollToDay = (dayId: string) => {
    setActiveTab(dayId);
    const target = document.getElementById(`col-${dayId}`);
    if (target && scrollContainerRef.current) {
      target.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    let message = `📋 *JOGJA TRIP ITINERARY*\n\n`;

    days.forEach((day) => {
      message += `📅 *${day.dayTitle}*\n`;
      if (day.tasks.length === 0) {
        message += `  _(Belum ada rencana)_\n`;
      } else {
        day.tasks.forEach((t) => {
          const isDone = completedTasks.includes(t.taskId);
          const status = isDone ? "[Selesai]" : "[Pending]";
          const by = t.addedBy ? ` (by ${t.addedBy})` : "";
          const activeTitle =
            t.isPlanBActive && t.planBTitle ? `${t.planBTitle} (Plan B)` : t.title;
          const activeAddr =
            t.isPlanBActive && t.planBAddress ? ` - ${t.planBAddress}` : t.address ? ` - ${t.address}` : "";
          message += `  ${status} ${t.time} - *${activeTitle}*${activeAddr}${by}\n`;
        });
      }
      message += `\n`;
    });

    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(days))));
      const shareUrl = sync.shareUrl() || `${window.location.origin}${window.location.pathname}?plan=${encoded}`;
      message += `🔗 *Link Update Bersama:*\n${shareUrl}`;
    } catch {
      // fallback
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  const handleCopySyncLink = () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(days))));
      const shareUrl = sync.shareUrl() || `${window.location.origin}${window.location.pathname}?plan=${encoded}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // Get current day's uncompleted tasks for spinner
  const currentDay = days.find((d) => d.dayId === activeTab) || days[0];
  const pendingTasksForSpinner = currentDay
    ? currentDay.tasks.filter((t) => !completedTasks.includes(t.taskId))
    : [];

  const weather = getJogjaHeatAdvisory();
  if (isSplashVisible) {
    return <SplashScreen onComplete={() => setIsSplashVisible(false)} />;
  }

  return (
    <main className="min-h-screen flex flex-col bg-background pb-12">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 border-b border-primary/15 bg-background/95 px-3 py-3 shadow-[0_4px_16px_rgba(0,33,18,0.04)] backdrop-blur-md">
        <div className="mx-auto max-w-md">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary via-[#ff4785] to-[#ff7eb3] font-sora text-xs font-black text-white shadow-[0_3px_10px_rgba(255,45,120,0.25)] select-none">
                T
              </div>
              <div className="min-w-0 leading-tight">
                <div className="flex min-w-0 items-center gap-1.5">
                  <h1 className="truncate whitespace-nowrap font-sora text-[13.5px] font-black leading-none tracking-tight text-text-main">
                    Tata Sprint
                  </h1>
                  <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 font-space text-[8px] font-black uppercase tracking-wider text-white shadow-2xs">
                    Treker
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 whitespace-nowrap font-space text-[10px] text-text-muted">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00e676]" />
                  <span className="truncate font-medium">Jogja · {weather.temp}°C</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5" aria-label="Aksi cepat">
              <button
                type="button"
                onClick={() => setIsGameOpen(true)}
                className="inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-xl bg-emerald-500 px-2 text-[10px] font-bold text-white shadow-[0_2px_7px_rgba(16,185,129,0.22)] transition-all hover:bg-emerald-600 active:scale-95 font-space"
                title="Adu Jari Refleks Princess vs Copilot"
                aria-label="Buka Duel"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="max-[390px]:hidden">Duel</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSpinnerOpen(true)}
                className="inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-xl bg-primary px-2 text-[10px] font-bold text-white shadow-[0_2px_7px_rgba(255,45,120,0.22)] transition-all hover:bg-primary-hover active:scale-95 font-space"
                title="Acak Pilihan Tempat"
                aria-label="Acak pilihan"
              >
                <Shuffle className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="max-[390px]:hidden">Acak</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRecapOpen(true)}
                className="inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-xl border border-primary/15 bg-white px-2 text-[10px] font-bold text-text-main shadow-2xs transition-all hover:bg-pink-50 active:scale-95 font-space"
                title="Lihat Rekap Memori Trip"
                aria-label="Lihat rekap perjalanan"
              >
                <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="max-[390px]:hidden">Rekap</span>
              </button>
            </div>
          </div>

          {/* Copy link notice */}
          {copiedLink && (
            <div className="mt-2 py-1 px-3 rounded-full bg-[#00e676]/20 border border-[#00e676]/40 text-[#008a3f] font-space text-xs flex items-center gap-1.5 shadow-2xs">
              <Check className="w-3.5 h-3.5" />
              <span>Link sinkronisasi disalin!</span>
            </div>
          )}

          <nav aria-label="Navigasi hari" className="mt-3 flex items-center gap-1.5 overflow-x-auto border-t border-primary/10 pt-2 no-scrollbar">
            {days.map((day, idx) => {
              const isActive = activeTab === day.dayId;
              const completedCount = day.tasks.filter((t) =>
                completedTasks.includes(t.taskId)
              ).length;

              return (
                <button
                  key={day.dayId}
                  onClick={() => scrollToDay(day.dayId)}
                  className={`flex h-8 shrink-0 select-none items-center gap-1.5 rounded-full px-3 font-space text-xs transition-all active:scale-95 whitespace-nowrap ${
                    isActive
                      ? "bg-text-main text-white font-extrabold shadow-xs"
                      : "bg-white/90 text-text-muted hover:text-text-main font-semibold border border-black/5 hover:bg-white shadow-2xs"
                  }`}
                >
                  <span>{day.dayTitle || `Day ${idx + 1}`}</span>
                  {day.tasks.length > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? "bg-primary text-white"
                          : "bg-black/5 text-text-muted"
                      }`}
                    >
                      {completedCount}/{day.tasks.length}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setIsAddDayOpen(true)}
              disabled={sync.readOnly}
              className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-dashed border-primary/40 bg-primary/5 px-3 font-space text-xs font-bold text-primary transition-all hover:bg-primary/15 active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Hari</span>
            </button>
          </nav>
        </div>
      </header>

      <SharedScheduleBar sync={sync} />

      {/* Board Area */}
      <fieldset disabled={sync.readOnly} className="m-0 min-w-0 border-0 p-0">
      <section
        ref={scrollContainerRef}
        aria-label="Sprint Board"
        className="flex-1 w-full overflow-x-auto snap-x snap-mandatory scroll-smooth px-[7.5vw] py-5 flex gap-4 no-scrollbar items-start"
      >
        {days.map((day) => (
          <div
            key={day.dayId}
            id={`col-${day.dayId}`}
            className="w-[85vw] max-w-[380px] shrink-0 snap-center rounded-2xl bg-white/40 border border-primary/20 p-4 flex flex-col"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-primary/15">
              <h2 className="font-sora font-bold text-base text-text-main">
                {day.dayTitle}
              </h2>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAddForDay(day.dayId)}
                  className="font-space text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Rencana</span>
                </button>

                {days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteDay(day.dayId, day.dayTitle)}
                    className="p-1 text-text-muted/40 hover:text-red-500 transition-colors rounded"
                    title="Hapus Kolom Hari Ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Dedicated Pickup Card for the Day */}
            <DayPickupCard day={day} onUpdatePickup={handleUpdatePickup} />

            {/* Dedicated Action Toolbar for Column (Sort Terdekat & Rute Maps) */}
            {day.tasks.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => handleSortByDistance(day.dayId)}
                  className="py-1.5 px-2 rounded-xl bg-white/90 border border-primary/20 text-text-main hover:text-primary font-space text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  title="Urutkan dari jarak terdekat dari posisi kamu"
                >
                  <Navigation className="w-3 h-3 text-primary" />
                  <span>Sort Terdekat</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenMultiStopRoute(day.tasks)}
                  className="py-1.5 px-2 rounded-xl bg-white/90 border border-primary/20 text-text-main hover:text-primary font-space text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  title="Buka seluruh rute hari ini sekaligus di Google Maps"
                >
                  <Map className="w-3 h-3 text-primary" />
                  <span>Rute Maps</span>
                </button>
              </div>
            )}

            {/* Task Cards in this Day */}
            <div className="flex flex-col gap-2.5">
              {day.tasks.map((task) => (
                <TaskCard
                  key={task.taskId}
                  task={task}
                  isCompleted={completedTasks.includes(task.taskId)}
                  onSelect={handleOpenTask}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDeleteTask}
                  onTogglePlanB={handleTogglePlanB}
                />
              ))}

              <button
                type="button"
                onClick={() => openAddForDay(day.dayId)}
                className="w-full py-3 rounded-xl border border-dashed border-primary/40 bg-white/30 text-primary font-space text-xs font-semibold hover:bg-white/60 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 mt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Rencana ke {day.dayTitle}</span>
              </button>
            </div>
          </div>
        ))}

        {/* Big Add Day Column at the end */}
        <div className="w-[85vw] max-w-[280px] shrink-0 snap-center rounded-2xl border-2 border-dashed border-primary/30 p-5 flex flex-col items-center justify-center text-center bg-white/20 min-h-[200px]">
          <CalendarPlus className="w-7 h-7 text-primary mb-2 opacity-70" />
          <h3 className="font-sora font-bold text-sm text-text-main mb-1">
            Tambah Hari Baru?
          </h3>
          <p className="font-space text-xs text-text-muted mb-3">
            Bikin kolom hari berikutnya sesuka kamu.
          </p>
          <button
            type="button"
            onClick={() => setIsAddDayOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-primary text-white font-space text-xs font-semibold hover:bg-primary-hover active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Hari</span>
          </button>
        </div>
      </section>
      </fieldset>



      {/* 1. Detail Drawer */}
      <TaskDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        isCompleted={
          selectedTask ? completedTasks.includes(selectedTask.taskId) : false
        }
        onClose={() => setIsDrawerOpen(false)}
        onToggleComplete={handleToggleComplete}
        onDelete={handleDeleteTask}
        onTogglePlanB={handleTogglePlanB}
      />

      {/* 2. Add Plan Drawer */}
      <AddTaskDrawer
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onAddTask={handleAddTask}
        defaultDayId={addDefaultDayId}
        days={days}
      />

      {/* 3. Add Day Drawer */}
      <AddDayDrawer
        isOpen={isAddDayOpen}
        onClose={() => setIsAddDayOpen(false)}
        onAddDay={handleAddDay}
        suggestedTitle={`Day ${days.length + 1}`}
      />

      {/* 4. Anti-Terserah Decision Spinner Modal */}
      <DecisionSpinnerModal
        isOpen={isSpinnerOpen}
        onClose={() => setIsSpinnerOpen(false)}
        tasks={
          pendingTasksForSpinner.length > 0
            ? pendingTasksForSpinner
            : days.flatMap((d) => d.tasks)
        }
        onSelectWinner={handleOpenTask}
      />

      {/* 5. Rating & Memory Prompt Modal */}
      <RatingModal
        task={ratingTargetTask}
        isOpen={Boolean(ratingTargetTask)}
        onClose={() => setRatingTargetTask(null)}
        onSaveRating={handleSaveRating}
      />

      {/* 6. Trip Scrapbook & Recap Drawer */}
      <TripRecapDrawer
        isOpen={isRecapOpen}
        onClose={() => setIsRecapOpen(false)}
        days={days}
        completedTaskIds={completedTasks}
      />

      {/* 7. Interactive Cute Mascot Companion */}
      <CuteCompanion
        weatherTemp={weather.temp}
        completedCount={
          currentDay
            ? currentDay.tasks.filter((t) => completedTasks.includes(t.taskId)).length
            : 0
        }
        totalCount={currentDay ? currentDay.tasks.length : 0}
        onOpenSpinner={() => setIsSpinnerOpen(true)}
        onOpenGame={() => setIsGameOpen(true)}
        paused={isGameOpen}
      />

      {/* 8. Tap Duel 2-Player Mini Game Modal */}
      <TapDuelModal
        isOpen={isGameOpen}
        onClose={() => setIsGameOpen(false)}
      />
    </main>
  );
}
