const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { createHash } = require("node:crypto");

// Transpile the actual TypeScript modules in memory, without a testing dependency.
const root = path.resolve(__dirname, "..");
const modules = new Map();
function load(relative) {
  const file = path.join(root, relative);
  if (modules.has(file)) return modules.get(file).exports;
  const mod = new Module(file, module);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  modules.set(file, mod);
  const originalRequire = mod.require.bind(mod);
  mod.require = (id) => id === "server-only" ? {} : id.startsWith("@/") ? load(`${id.slice(2)}.ts`) : originalRequire(id);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  mod._compile(outputText, file);
  return mod.exports;
}

const statusRoute = load("app/api/sync/status/route.ts");
const createRoute = load("app/api/trips/route.ts");
const tripRoute = load("app/api/trips/[id]/route.ts");
const { isSnapshot, sharedTripUrl } = load("lib/shared-itinerary.ts");
const { TripSync } = load("lib/trip-sync.ts");
const { SyncError } = load("lib/trip-api.ts");
const originalFetch = global.fetch;
const originalEnv = { ...process.env };
let rows;
let requests;
const envKeys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

const snapshot = () => ({ days: [{ dayId: "day-1", dayTitle: "Day 1", pickupTime: "09:30", pickupStatus: "otw", tasks: [{
  taskId: "task-1", title: "Kopi", time: "10:00", category: "Kuliner", description: "Istirahat",
  planBTitle: "Cafe", isPlanBActive: true, rating: 4, memoryNote: "Nyaman",
}] }], completedTasks: ["task-1"] });

beforeEach(() => {
  rows = new Map();
  requests = [];
  for (const key of envKeys) delete process.env[key];
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_only";
  global.fetch = async (url, options) => {
    assert.equal(options.headers.apikey, "sb_publishable_test_only");
    assert.equal(options.headers.Authorization, undefined, "New API keys must not be sent as JWTs");
    assert.equal(options.method, "POST");
    const endpoint = new URL(url).pathname.split("/").pop();
    const body = JSON.parse(options.body);
    requests.push({ endpoint, body, options });
    if (endpoint === "tata_sync_status") return Response.json({ schemaVersion: 1 });
    const hash = createHash("sha256").update(body.p_token).digest("hex");
    if (endpoint === "tata_create_trip") {
      const row = { id: body.p_id, snapshot: body.p_snapshot, access_token_hash: hash, revision: 1, updated_at: new Date().toISOString() };
      rows.set(row.id, row);
      return Response.json(row);
    }
    const row = rows.get(body.p_id);
    if (!row || hash !== row.access_token_hash) return Response.json({ code: "PT404" }, { status: 404 });
    if (endpoint === "tata_update_trip") {
      if (body.p_revision !== row.revision) return Response.json({ code: "PT409" }, { status: 409 });
      Object.assign(row, { snapshot: body.p_snapshot, revision: row.revision + 1 });
    }
    return Response.json(row);
  };
});
after(() => {
  global.fetch = originalFetch;
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key];
  }
});

function req(method, body, token, origin = "https://app.test") {
  return new Request("https://app.test/api/trips", {
    method, headers: { "Content-Type": "application/json", Origin: origin,
      ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function create() {
  const response = await createRoute.POST(req("POST", { snapshot: snapshot() }));
  assert.equal(response.status, 201);
  return response.json();
}

test("without credentials, local mode remains available and create returns 503", async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const status = await (await statusRoute.GET()).json();
  assert.equal(status.configured, false);
  assert.equal(status.ready, false);
  const response = await createRoute.POST(req("POST", { snapshot: snapshot() }));
  assert.equal(response.status, 503);
  assert.equal(requests.length, 0);
});

test("publishable configuration is ready only after a successful database RPC probe", async () => {
  const response = await statusRoute.GET();
  assert.deepEqual(await response.json(), { configured: true, ready: true, error: null });
  assert.equal(requests[0].endpoint, "tata_sync_status");
  assert.equal(rows.size, 0, "Health checks must not create any data");
});

test("missing SQL setup is distinguished from configured credentials", async () => {
  global.fetch = async () => Response.json({ code: "PGRST202", message: "internal detail" }, { status: 404 });
  const status = await (await statusRoute.GET()).json();
  assert.equal(status.configured, true);
  assert.equal(status.ready, false);
  assert.match(status.error, /SQL setup/);
  assert.doesNotMatch(status.error, /internal detail/);
});

test("rejected keys, offline responses, and invalid schema do not report ready", async () => {
  for (const response of [Response.json({}, { status: 401 }), Response.json({ schemaVersion: 999 })]) {
    global.fetch = async () => response;
    assert.equal((await (await statusRoute.GET()).json()).ready, false);
  }
  global.fetch = async () => { throw new TypeError("fetch failed"); };
  assert.equal((await (await statusRoute.GET()).json()).ready, false);
});

test("legacy anon JWT configuration also uses the required Bearer header", async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJ.test.jwt";
  global.fetch = async (url, options) => {
    assert.equal(options.headers.apikey, "eyJ.test.jwt");
    assert.equal(options.headers.Authorization, "Bearer eyJ.test.jwt");
    return Response.json({ schemaVersion: 1 });
  };
  assert.equal((await (await statusRoute.GET()).json()).ready, true);
});

test("malformed upstream snapshots cannot replace a valid local itinerary", async () => {
  global.fetch = async () => Response.json({ id: "wrong-trip", snapshot: null });
  assert.equal((await createRoute.POST(req("POST", { snapshot: snapshot() }))).status, 503);
});

test("create, read, and update round-trip all itinerary fields; only a token hash is stored", async () => {
  const trip = await create();
  assert.match(trip.token, /^[a-f0-9]{64}$/);
  assert.equal(rows.get(trip.id).access_token_hash, createHash("sha256").update(trip.token).digest("hex"));
  assert.equal(trip.access_token_hash, undefined);
  const context = { params: { id: trip.id } };
  const read = await tripRoute.GET(req("GET", undefined, trip.token), context);
  assert.equal(read.headers.get("Cache-Control"), "no-store");
  assert.deepEqual((await read.json()).snapshot, snapshot());
  const updated = snapshot();
  updated.days[0].pickupStatus = "arrived";
  const response = await tripRoute.PATCH(req("PATCH", { snapshot: updated, revision: 1 }, trip.token), context);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.revision, 2);
  assert.deepEqual(body.snapshot, updated);
});

test("missing/wrong tokens cannot read or update a trip", async () => {
  const trip = await create();
  const context = { params: { id: trip.id } };
  assert.equal((await tripRoute.GET(req("GET"), context)).status, 401);
  assert.equal((await tripRoute.GET(req("GET", undefined, "a".repeat(64)), context)).status, 404);
  assert.equal((await tripRoute.PATCH(req("PATCH", { snapshot: snapshot(), revision: 1 }, "a".repeat(64)), context)).status, 404);
  assert.equal(rows.get(trip.id).revision, 1);
});

test("concurrent writes to the same revision produce one success and one conflict", async () => {
  const trip = await create();
  const context = { params: { id: trip.id } };
  const [first, second] = await Promise.all([
    tripRoute.PATCH(req("PATCH", { snapshot: snapshot(), revision: 1 }, trip.token), context),
    tripRoute.PATCH(req("PATCH", { snapshot: snapshot(), revision: 1 }, trip.token), context),
  ]);
  assert.deepEqual([first.status, second.status].sort(), [200, 409]);
  assert.equal(rows.get(trip.id).revision, 2);
});

test("bad payloads, cross-origin writes, and oversize bodies are rejected before database access", async () => {
  assert.equal((await createRoute.POST(req("POST", { snapshot: snapshot() }, undefined, "https://other.test"))).status, 403);
  assert.equal((await createRoute.POST(req("POST", { snapshot: { days: [], completedTasks: [] } }))).status, 400);
  const duplicate = snapshot();
  duplicate.days[0].tasks.push({ ...duplicate.days[0].tasks[0] });
  assert.equal((await createRoute.POST(req("POST", { snapshot: duplicate }))).status, 400);
  assert.equal((await createRoute.POST(req("POST", { junk: "x".repeat(752000) }))).status, 413);
  assert.equal(requests.length, 0);
});

test("upstream errors don't expose diagnostics or service credentials", async () => {
  global.fetch = async () => Response.json({ message: "internal secret diagnostic" }, { status: 500 });
  const response = await createRoute.POST(req("POST", { snapshot: snapshot() }));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /internal secret|sb_secret/);
});

test("validator covers malformed optional fields and links keep access in the fragment", () => {
  const invalid = snapshot();
  invalid.days[0].tasks[0].rating = "5";
  assert.equal(isSnapshot(invalid), false);
  const url = new URL(sharedTripUrl("https://app.test", { id: "test-id", token: "test-token" }));
  assert.equal(url.search, "");
  assert.equal(url.hash, "#trip=test-id&key=test-token");
});

const access = { id: "room", token: "token" };
const state = (dirty = false) => ({ snapshot: snapshot(), access, revision: 1, dirty, phase: dirty ? "pending" : "synced", error: null });
const remote = (data, revision = 2) => ({ id: "room", snapshot: data, revision, updatedAt: "2026-10-06T00:00:00Z" });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };

test("edits made during an upload stay pending and use the acknowledged next revision", async () => {
  const pending = deferred();
  const api = { write: () => pending.promise };
  const sync = new TripSync(state(true), api, () => {});
  const saving = sync.sync();
  const newer = snapshot();
  newer.days[0].dayTitle = "New local edit";
  sync.edit(newer);
  pending.resolve(remote(snapshot()));
  await saving;
  assert.equal(sync.state.revision, 2);
  assert.equal(sync.state.dirty, true);
  assert.deepEqual(sync.state.snapshot, newer);
});

test("a polling response racing a local edit does not overwrite or silently rebase it", async () => {
  const pending = deferred();
  const sync = new TripSync(state(), { read: () => pending.promise }, () => {});
  const reading = sync.sync();
  const newer = snapshot();
  newer.days[0].dayTitle = "Local edit";
  sync.edit(newer);
  pending.resolve(remote(snapshot(), 4));
  await reading;
  assert.equal(sync.state.revision, 1);
  assert.equal(sync.state.dirty, true);
  assert.deepEqual(sync.state.snapshot, newer);
});

test("offline writes retain the draft; retry succeeds; conflicts retain the draft without more writes", async () => {
  let writes = 0;
  const api = { write: async () => { writes++; throw new Error("offline"); } };
  const sync = new TripSync(state(true), api, () => {});
  await sync.sync();
  assert.equal(sync.state.phase, "error");
  assert.equal(sync.state.dirty, true);
  api.write = async () => remote(snapshot());
  await sync.sync();
  assert.equal(sync.state.phase, "synced");
  assert.equal(sync.state.dirty, false);
  api.write = async () => { writes++; throw new SyncError(409, "conflict"); };
  sync.edit(snapshot());
  await sync.sync();
  assert.equal(sync.state.phase, "conflict");
  await sync.sync();
  assert.equal(writes, 2);
  assert.equal(sync.state.dirty, true);
});

test("a newly opened shared link only reads and cannot upload a blank seed", async () => {
  let writes = 0;
  const initial = { ...state(), snapshot: { days: [{ dayId: "day-1", dayTitle: "Day 1", tasks: [] }], completedTasks: [] }, revision: null };
  const sync = new TripSync(initial, {
    read: async () => remote(snapshot()), write: async () => { writes++; return remote(snapshot()); },
  }, () => {});
  sync.edit(initial.snapshot);
  await sync.sync();
  assert.equal(writes, 0);
  assert.deepEqual(sync.state.snapshot, snapshot());
});
