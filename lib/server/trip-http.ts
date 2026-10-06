import "server-only";
import { isSnapshot, cleanSnapshot, MAX_SNAPSHOT_BYTES, TRIP_ID_PATTERN, TRIP_TOKEN_PATTERN } from "@/lib/shared-itinerary";
import { TripStoreError } from "@/lib/server/trip-store";

const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
export function json(value: unknown, status = 200) { return Response.json(value, { status, headers }); }
export function failure(error: unknown) {
  if (error instanceof TripStoreError) return json({ error: error.message }, error.status);
  return json({ error: "Permintaan belum berhasil. Coba lagi." }, 500);
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new TripStoreError(403, "Asal permintaan tidak diizinkan.");
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new TripStoreError(403, "Asal permintaan tidak diizinkan.");
}

export function accessFrom(request: Request, id: string) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!TRIP_ID_PATTERN.test(id) || !TRIP_TOKEN_PATTERN.test(token)) throw new TripStoreError(401, "Link akses jadwal diperlukan.");
  return { id, token };
}

export async function readPayload(request: Request, requireRevision = false) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new TripStoreError(415, "Gunakan format JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new TripStoreError(400, "Data jadwal diperlukan.");
  let size = 0;
  let raw = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SNAPSHOT_BYTES + 1024) {
        await reader.cancel();
        throw new TripStoreError(413, "Jadwal terlalu besar untuk dibagikan.");
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } finally { reader.releaseLock(); }
  let body;
  try { body = JSON.parse(raw); } catch { throw new TripStoreError(400, "Data JSON tidak valid."); }
  if (!body || !isSnapshot(body.snapshot)) throw new TripStoreError(400, "Format jadwal tidak valid.");
  if (requireRevision && (!Number.isSafeInteger(body.revision) || body.revision < 1 || body.revision >= 2147483647)) {
    throw new TripStoreError(400, "Versi jadwal tidak valid.");
  }
  return { snapshot: cleanSnapshot(body.snapshot), revision: body.revision as number };
}
