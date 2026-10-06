import { createTrip } from "@/lib/server/trip-store";
import { checkOrigin, failure, json, readPayload } from "@/lib/server/trip-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { snapshot } = await readPayload(request);
    return json(await createTrip(snapshot), 201);
  } catch (error) { return failure(error); }
}
