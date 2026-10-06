import { checkStoreConnection } from "@/lib/server/trip-store";
import { json } from "@/lib/server/trip-http";

export const dynamic = "force-dynamic";
export async function GET() { return json(await checkStoreConnection()); }
