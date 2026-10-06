import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { isSnapshot, type ItinerarySnapshot, type SharedTrip, type TripAccess } from "@/lib/shared-itinerary";

export class TripStoreError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function configuration() {
  return {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim().replace(/\/$/, ""),
    key: (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
  };
}

export function isStoreConfigured() {
  const { url, key } = configuration();
  return Boolean(url && key);
}

function toTrip(value: unknown, id: string): SharedTrip {
  const row = value as Record<string, unknown> | null;
  if (!row || row.id !== id || !isSnapshot(row.snapshot) || !Number.isSafeInteger(row.revision) ||
      (row.revision as number) < 1 || typeof row.updated_at !== "string") {
    throw new TripStoreError(503, "Format jadwal dari database tidak valid. Cadangan lokal tetap disimpan.");
  }
  return { id, snapshot: row.snapshot, revision: row.revision as number, updatedAt: row.updated_at };
}

async function rpc(name: string, body: Record<string, unknown> = {}): Promise<unknown> {
  if (!isStoreConfigured()) throw new TripStoreError(503, "Penyimpanan bersama belum dikonfigurasi.");
  const { url, key } = configuration();
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  // Publishable keys are not JWTs. Only legacy JWT keys also use Bearer.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  let response: Response;
  try {
    response = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST", body: JSON.stringify(body), headers, cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new TripStoreError(503, "Penyimpanan bersama sedang tidak terhubung. Coba lagi.");
  }
  const result = await response.json().catch(() => null);
  // Only map known error codes; never expose upstream diagnostics or keys.
  if (!response.ok) {
    if (result?.code === "PT404") throw new TripStoreError(404, "Link jadwal tidak valid atau sudah tidak tersedia.");
    if (result?.code === "PT409") throw new TripStoreError(409, "Ada perubahan dari perangkat lain. Muat versi terbaru sebelum menyimpan.");
    if (result?.code === "PT400" || result?.code === "23514") throw new TripStoreError(400, "Format jadwal tidak valid.");
    if (["PGRST202", "PGRST205", "42P01", "42883"].includes(result?.code)) {
      throw new TripStoreError(503, "Supabase terhubung, tetapi tabel/fungsi jadwal belum terpasang. Jalankan SQL setup di Supabase SQL Editor.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new TripStoreError(503, "Akses Supabase ditolak. Periksa API key dan izin fungsi database.");
    }
    throw new TripStoreError(503, "Penyimpanan bersama belum siap. Periksa konfigurasi dan migrasi database.");
  }
  return result;
}

export async function checkStoreConnection() {
  const configured = isStoreConfigured();
  if (!configured) return { configured, ready: false, error: "URL dan publishable key Supabase belum diisi." };
  try {
    const result = await rpc("tata_sync_status") as { schemaVersion?: number } | null;
    if (result?.schemaVersion !== 1) throw new TripStoreError(503, "Versi database belum sesuai. Jalankan SQL setup terbaru.");
    return { configured, ready: true, error: null };
  } catch (error) {
    return { configured, ready: false, error: error instanceof TripStoreError ? error.message : "Koneksi Supabase belum berhasil." };
  }
}

export async function createTrip(snapshot: ItinerarySnapshot): Promise<SharedTrip & TripAccess> {
  const id = randomUUID();
  const token = randomBytes(32).toString("hex");
  const row = await rpc("tata_create_trip", { p_id: id, p_token: token, p_snapshot: snapshot });
  return { ...toTrip(row, id), token };
}

export async function readTrip(access: TripAccess): Promise<SharedTrip> {
  const row = await rpc("tata_read_trip", { p_id: access.id, p_token: access.token });
  return toTrip(row, access.id);
}

export async function updateTrip(access: TripAccess, snapshot: ItinerarySnapshot, revision: number): Promise<SharedTrip> {
  const row = await rpc("tata_update_trip", {
    p_id: access.id, p_token: access.token, p_snapshot: snapshot, p_revision: revision,
  });
  return toTrip(row, access.id);
}
