"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DayColumn } from "@/types/itinerary";
import { cleanSnapshot, isSnapshot, isTripAccess, sharedTripUrl, type ItinerarySnapshot, type TripAccess } from "@/lib/shared-itinerary";
import { tripApi } from "@/lib/trip-api";
import { TripSync, type SyncState } from "@/lib/trip-sync";

const SCHEDULE_KEY = "tata_jogja_schedule_v6";
const COMPLETED_KEY = "tata_jogja_completed_v6";
const ACTIVE_KEY = "tata_jogja_active_trip_v1";
const roomKey = (id: string) => `tata_jogja_shared_${id}`;
const pendingKey = (id: string) => `${roomKey(id)}_draft`;

function readJson(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}

function exportSnapshot(snapshot: ItinerarySnapshot) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "tata-jadwal-cadangan.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useSharedItinerary(initialDays: DayColumn[]) {
  const [view, setView] = useState<SyncState>({
    snapshot: { days: initialDays, completedTasks: [] }, access: null, revision: null,
    dirty: false, phase: "local", error: null,
  });
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [connectionReady, setConnectionReady] = useState<boolean | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const engine = useRef<TripSync | null>(null);
  const alive = useRef(false);
  const connectionCheck = useRef(0);

  const checkConnection = useCallback(async () => {
    const check = ++connectionCheck.current;
    setConnectionReady(null);
    setConnectionError(null);
    try {
      const response = await fetch("/api/sync/status", { cache: "no-store", signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error("Connection check failed");
      const result = await response.json();
      if (!alive.current || check !== connectionCheck.current) return;
      setConfigured(result.configured === true);
      setConnectionReady(result.ready === true);
      setConnectionError(typeof result.error === "string" ? result.error : null);
    } catch {
      if (!alive.current || check !== connectionCheck.current) return;
      setConnectionReady(false);
      setConnectionError("Koneksi belum bisa diperiksa. Coba lagi setelah jaringan tersambung.");
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    let active = true;
    function persist(state: SyncState) {
      if (!active) return;
      setView(state);
      try {
        if (state.access) {
          localStorage.setItem(ACTIVE_KEY, JSON.stringify(state.access));
          localStorage.setItem(roomKey(state.access.id), JSON.stringify({
            snapshot: state.snapshot, revision: state.revision, dirty: state.dirty,
          }));
          // Keep a recoverable copy of unsent work, including after conflict resolution.
          if (state.dirty) localStorage.setItem(pendingKey(state.access.id), JSON.stringify(state.snapshot));
        } else {
          localStorage.setItem(SCHEDULE_KEY, JSON.stringify(state.snapshot.days));
          localStorage.setItem(COMPLETED_KEY, JSON.stringify(state.snapshot.completedTasks));
        }
      } catch {
        setStorageError("Browser tidak bisa menyimpan cadangan. Unduh salinan sebelum menutup halaman.");
      }
    }

    let snapshot: ItinerarySnapshot = { days: initialDays, completedTasks: [] };
    const local = { days: readJson(SCHEDULE_KEY), completedTasks: readJson(COMPLETED_KEY) || [] };
    if (isSnapshot(local)) snapshot = cleanSnapshot(local);
    let access: TripAccess | null = null;
    let revision: number | null = null;
    let dirty = false;
    let error: string | null = null;
    const params = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const hasSharedLink = fragment.has("trip") || fragment.has("key");
    const saved = readJson(ACTIVE_KEY);

    if (hasSharedLink) {
      const candidate = { id: fragment.get("trip"), token: fragment.get("key") };
      if (isTripAccess(candidate)) access = candidate;
      else error = "Link jadwal tidak lengkap. Minta pengirim menyalin ulang linknya.";
    } else if (!params.has("plan") && isTripAccess(saved)) {
      access = saved;
    }

    if (access) {
      // A new shared link never uploads this device's unrelated local itinerary.
      snapshot = { days: initialDays, completedTasks: [] };
      const cached = readJson(roomKey(access.id)) as { snapshot?: unknown; revision?: number; dirty?: boolean } | null;
      if (cached && isSnapshot(cached.snapshot) && Number.isSafeInteger(cached.revision) && cached.revision! > 0) {
        snapshot = cached.snapshot;
        revision = cached.revision!;
        dirty = cached.dirty === true;
      }
    } else if (!hasSharedLink && params.has("plan")) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(params.get("plan")!))));
        const imported = { days: decoded, completedTasks: [] };
        if (!isSnapshot(imported)) throw new Error("Invalid import");
        // Preserve the prior local itinerary when importing a legacy share link.
        localStorage.setItem("tata_jogja_before_import_v1", JSON.stringify(snapshot));
        localStorage.removeItem(ACTIVE_KEY);
        snapshot = imported;
        params.delete("plan");
        const query = params.toString();
        window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
      } catch { error = "Link salinan jadwal tidak valid. Jadwal sebelumnya tetap tersedia."; }
    }

    const state: SyncState = { snapshot, access, revision, dirty,
      phase: error ? "error" : access ? "loading" : "local", error };
    const sync = new TripSync(state, tripApi, persist);
    engine.current = sync;
    persist(state);
    setReady(true);

    void checkConnection();

    const refresh = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void sync.sync();
    };
    const firstRefresh = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 5000);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (sync.state.dirty) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      active = false;
      alive.current = false;
      connectionCheck.current++;
      clearTimeout(firstRefresh);
      clearInterval(timer);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  // initialDays is the static seed imported from itinerary.json.
  }, [initialDays, checkConnection]);

  useEffect(() => {
    if (!view.dirty || view.phase !== "pending") return;
    const timer = setTimeout(() => { if (navigator.onLine) void engine.current?.sync(); }, 700);
    return () => clearTimeout(timer);
  }, [view]);

  const saveDays = (days: DayColumn[]) => {
    if (engine.current) engine.current.edit({ ...engine.current.state.snapshot, days });
  };
  const setCompletedTasks = (update: string[] | ((previous: string[]) => string[])) => {
    if (!engine.current) return;
    const state = engine.current.state.snapshot;
    const completedTasks = typeof update === "function" ? update(state.completedTasks) : update;
    engine.current.edit({ ...state, completedTasks });
  };

  const share = async () => {
    await engine.current?.share();
    if (!alive.current) return;
    const access = engine.current?.state.access;
    if (access) window.history.replaceState({}, "", sharedTripUrl(window.location.origin, access));
  };
  const useRemote = async () => {
    // Require a successful local backup before replacing an unsent draft.
    if (engine.current?.state.dirty) exportSnapshot(engine.current.state.snapshot);
    await engine.current?.useRemote();
  };

  return {
    ...view, days: view.snapshot.days, completedTasks: view.snapshot.completedTasks,
    ready, configured, connectionReady, connectionError, checkConnection, storageError, saveDays, setCompletedTasks, share, useRemote,
    readOnly: !ready || Boolean(view.access && view.revision === null),
    retry: () => engine.current?.sync(),
    download: () => exportSnapshot(engine.current?.state.snapshot || view.snapshot),
    disconnect: () => {
      if (engine.current?.state.dirty) exportSnapshot(engine.current.state.snapshot);
      try { localStorage.removeItem(ACTIVE_KEY); } catch { /* Fall back to the same browser page. */ }
      window.location.assign(window.location.pathname);
    },
    shareUrl: () => view.access ? sharedTripUrl(window.location.origin, view.access) : null,
  };
}
