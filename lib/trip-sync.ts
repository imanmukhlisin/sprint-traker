import { cleanSnapshot, isSnapshot, type ItinerarySnapshot, type TripAccess } from "@/lib/shared-itinerary";
import { SyncError, type TripApi } from "@/lib/trip-api";

export interface SyncState {
  snapshot: ItinerarySnapshot;
  access: TripAccess | null;
  revision: number | null;
  dirty: boolean;
  phase: "local" | "loading" | "synced" | "pending" | "conflict" | "error";
  error: string | null;
}

// One request at a time; edits made during an upload stay pending for the next one.
export class TripSync {
  state: SyncState;
  private busy = false;
  private generation = 0;

  constructor(initial: SyncState, private api: TripApi, private notify: (state: SyncState) => void) {
    this.state = initial;
  }

  private publish(updates: Partial<SyncState>) {
    this.state = { ...this.state, ...updates };
    this.notify(this.state);
  }

  edit(snapshot: ItinerarySnapshot) {
    if (this.state.access && this.state.revision === null) return;
    this.generation++;
    this.publish({
      snapshot: cleanSnapshot(snapshot), dirty: Boolean(this.state.access),
      phase: this.state.phase === "conflict" ? "conflict" : this.state.access ? "pending" : "local",
      error: this.state.phase === "conflict" ? this.state.error : null,
    });
  }

  private report(error: unknown) {
    this.publish({
      phase: error instanceof SyncError && error.status === 409 ? "conflict" : "error",
      error: error instanceof SyncError ? error.message : "Koneksi terputus. Perubahan tetap disimpan di perangkat ini.",
    });
  }

  async share() {
    if (this.state.access || this.busy) return;
    this.busy = true;
    const generation = this.generation;
    const snapshot = this.state.snapshot;
    this.publish({ phase: "loading", error: null });
    try {
      const trip = await this.api.create(snapshot);
      const dirty = generation !== this.generation;
      this.publish({ access: { id: trip.id, token: trip.token }, revision: trip.revision,
        dirty, phase: dirty ? "pending" : "synced", error: null });
    } catch (error) { this.report(error); }
    finally { this.busy = false; }
  }

  async sync() {
    if (!this.state.access || this.busy || this.state.phase === "conflict") return;
    this.busy = true;
    const generation = this.generation;
    const { access, snapshot, dirty, revision } = this.state;
    try {
      const trip = dirty && revision !== null
        ? await this.api.write(access, snapshot, revision)
        : await this.api.read(access);
      if (!isSnapshot(trip.snapshot)) throw new Error("Invalid remote snapshot");
      if (generation !== this.generation) {
        // A read racing a local edit must not silently rebase the draft.
        this.publish({ revision: dirty ? trip.revision : revision, phase: "pending" });
      } else {
        this.publish({ snapshot: trip.snapshot, revision: trip.revision, dirty: false, phase: "synced", error: null });
      }
    } catch (error) { this.report(error); }
    finally { this.busy = false; }
  }

  async useRemote() {
    if (!this.state.access || this.busy) return;
    this.busy = true;
    const generation = this.generation;
    try {
      const trip = await this.api.read(this.state.access);
      if (!isSnapshot(trip.snapshot)) throw new Error("Invalid remote snapshot");
      if (generation !== this.generation) return;
      this.publish({ snapshot: trip.snapshot, revision: trip.revision, dirty: false, phase: "synced", error: null });
    } catch (error) { this.report(error); }
    finally { this.busy = false; }
  }
}
