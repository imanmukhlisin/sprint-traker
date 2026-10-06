import { readTrip, updateTrip } from "@/lib/server/trip-store";
import { accessFrom, checkOrigin, failure, json, readPayload } from "@/lib/server/trip-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: { id: string } };

export async function GET(request: Request, { params }: Context) {
  try { return json(await readTrip(accessFrom(request, params.id))); }
  catch (error) { return failure(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    checkOrigin(request);
    const access = accessFrom(request, params.id);
    const { snapshot, revision } = await readPayload(request, true);
    return json(await updateTrip(access, snapshot, revision));
  } catch (error) { return failure(error); }
}
