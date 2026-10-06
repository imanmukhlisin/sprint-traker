import type { DayColumn } from "@/types/itinerary";

export interface ItinerarySnapshot {
  days: DayColumn[];
  completedTasks: string[];
}

export interface SharedTrip {
  id: string;
  snapshot: ItinerarySnapshot;
  revision: number;
  updatedAt: string;
}

export interface TripAccess {
  id: string;
  token: string;
}

export const MAX_SNAPSHOT_BYTES = 750_000;
export const TRIP_ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const TRIP_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown, max = 10_000): value is string =>
  typeof value === "string" && value.length <= max;

// Validation runs on imports, cached snapshots, and every API write.
export function isSnapshot(value: unknown): value is ItinerarySnapshot {
  if (!object(value) || !Array.isArray(value.days) || !Array.isArray(value.completedTasks)) return false;
  if (value.days.length < 1 || value.days.length > 100 || value.completedTasks.length > 2000) return false;
  const dayIds = new Set<string>();
  const taskIds = new Set<string>();
  for (const day of value.days) {
    if (!object(day) || !text(day.dayId, 150) || !day.dayId || dayIds.has(day.dayId) ||
        !text(day.dayTitle, 300) || !Array.isArray(day.tasks) || day.tasks.length > 500) return false;
    dayIds.add(day.dayId);
    for (const field of ["pickupTime", "pickupLocation", "pickupNotes"]) {
      if (day[field] !== undefined && !text(day[field])) return false;
    }
    if (day.pickupStatus !== undefined && !["preparing", "otw", "arrived"].includes(String(day.pickupStatus))) return false;
    for (const task of day.tasks) {
      if (!object(task) || !text(task.taskId, 150) || !task.taskId || taskIds.has(task.taskId)) return false;
      taskIds.add(task.taskId);
      if (taskIds.size > 2000) return false;
      for (const field of ["time", "title", "category", "description"]) {
        if (!text(task[field])) return false;
      }
      for (const field of ["address", "planBTitle", "planBAddress", "tips", "mapsUrl", "memoryNote"]) {
        if (task[field] !== undefined && !text(task[field])) return false;
      }
      if (task.isPlanBActive !== undefined && typeof task.isPlanBActive !== "boolean") return false;
      if (task.venueType !== undefined && !["Indoor (AC)", "Outdoor"].includes(String(task.venueType))) return false;
      if (task.addedBy !== undefined && !["Princess", "Copilot"].includes(String(task.addedBy))) return false;
      if (task.rating !== undefined && (typeof task.rating !== "number" || !Number.isInteger(task.rating) || task.rating < 1 || task.rating > 5)) return false;
      for (const field of ["lat", "lng", "distanceKm"]) {
        if (task[field] !== undefined && (typeof task[field] !== "number" || !Number.isFinite(task[field]))) return false;
      }
    }
  }
  return value.completedTasks.every((id) => text(id, 150)) &&
    new Set(value.completedTasks).size === value.completedTasks.length &&
    new TextEncoder().encode(JSON.stringify(value)).length <= MAX_SNAPSHOT_BYTES;
}

export function cleanSnapshot(snapshot: ItinerarySnapshot): ItinerarySnapshot {
  const ids = new Set(snapshot.days.flatMap((day) => day.tasks.map((task) => task.taskId)));
  return { days: snapshot.days, completedTasks: Array.from(new Set(snapshot.completedTasks)).filter((id) => ids.has(id)) };
}

export function isTripAccess(value: unknown): value is TripAccess {
  return object(value) && typeof value.id === "string" && TRIP_ID_PATTERN.test(value.id) &&
    typeof value.token === "string" && TRIP_TOKEN_PATTERN.test(value.token);
}

// Fragment credentials aren't sent in Vercel page requests or Referer headers.
export function sharedTripUrl(origin: string, access: TripAccess) {
  return `${origin}/#trip=${access.id}&key=${access.token}`;
}
