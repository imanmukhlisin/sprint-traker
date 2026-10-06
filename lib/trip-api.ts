import type { ItinerarySnapshot, SharedTrip, TripAccess } from "@/lib/shared-itinerary";

export class SyncError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const body = await response.json();
  if (!response.ok) throw new SyncError(response.status, body.error || "Gagal menghubungkan jadwal.");
  return body;
}

export interface TripApi {
  create(snapshot: ItinerarySnapshot): Promise<SharedTrip & TripAccess>;
  read(access: TripAccess): Promise<SharedTrip>;
  write(access: TripAccess, snapshot: ItinerarySnapshot, revision: number): Promise<SharedTrip>;
}

export const tripApi: TripApi = {
  create: (snapshot) => call("/api/trips", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshot }),
  }),
  read: (access) => call(`/api/trips/${access.id}`, { headers: { Authorization: `Bearer ${access.token}` } }),
  write: (access, snapshot, revision) => call(`/api/trips/${access.id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${access.token}` },
    body: JSON.stringify({ snapshot, revision }),
  }),
};
