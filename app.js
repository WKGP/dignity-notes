// Dignity Notes app. Loaded by index.html; kept out of the page so the content policy can refuse any
// script injected into the page.
// Never run inside someone else's page (framing could trick a carer into tapping things).
if (window.top !== window.self) { document.documentElement.innerHTML = "<p style='font:16px sans-serif;padding:20px'>Open Dignity Notes at https://dignitynotes.app</p>"; throw new Error("framed"); }
"use strict";
/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const fmtTime = (ts) => new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const fmtDay = (ts) => new Date(ts).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const isToday = (ts) => sameDay(ts, Date.now());
const dayLabel = (ts) => isToday(ts) ? "Today" : sameDay(ts, Date.now() - 864e5) ? "Yesterday" : sameDay(ts, Date.now() + 864e5) ? "Tomorrow" : fmtDay(ts);
const ICON = {
  search: '<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  people: '<svg class="i" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9.5" r="2.5"/><path d="M16 14.2c3 .2 5 2.6 5 5.8"/></svg>',
  plan: '<svg class="i" viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h4"/></svg>',
  alert: '<svg class="i" viewBox="0 0 24 24"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".6" style="fill:currentColor"/></svg>',
  chev: '<svg class="i chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  mic: '<svg class="i" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  stop: '<svg class="i" viewBox="0 0 24 24" style="fill:currentColor;stroke:none"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  out: '<svg class="i" viewBox="0 0 24 24"><path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
  close: '<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2600);
}

/* ---------- store ---------- */
// Relay address, filled in after `npx wrangler deploy`. While empty, the sign-in screen asks for it.
const RELAY_URL = "https://dignity-notes-relay.workgroup-works.workers.dev";
const SESSION_KEY = "nanacare.session";
let session = null;
try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch {}
const relayBase = () => (RELAY_URL || (session && session.relayUrl) || "").replace(/\/+$/, "");
let KEY = null; // set by loadUser() once a person and client are chosen
let S;
function seed() {
  const at = (h, m, dayOffset = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime() + dayOffset * 864e5; };
  return {
    version: 3,
    client: { name: "Nana" },
    consent: null,
    carers: [
      { id: "c1", name: "Ann", shift: "Day · 04:00–16:00" },
      { id: "c2", name: "Joy", shift: "Afternoon · agency" },
      { id: "c3", name: "Grace", shift: "Night · 16:00–04:00" },
    ],
    onDuty: "c1",
    schedule: [
      { id: "s1", when: at(10, 30), label: "Church in London", detail: "Collected by family" },
      { id: "s2", when: at(12, 45), label: "Lunch out at The Duck", detail: "" },
      { id: "s3", when: at(10, 0, 1), label: "Doctor's appointment", detail: "COVID injection at Hop House" },
    ],
    notes: [{
      id: "n0", ts: at(6, 30), carerId: "c1", source: "example", audioId: null,
      transcript: "Example entry from the prototype. There is no recording for this one.",
      note: "Nana got up at approximately 6:30 am and appeared to be in a very good mood. She had a bath and her hair washed, got dressed and came downstairs for breakfast. She required assistance taking her tablets, including placing the tablets into her mouth and helping guide the glass of water to her mouth. She drank a full cup of water with CosmoCol and also had a cup of tea.",
      categories: ["Personal care", "Hair and dressing", "Meals", "Medication", "Fluids", "Mood"],
    }],
    flags: [{ id: "f0", ts: at(3, 40), kind: "follow_up", title: "Low fluid intake overnight", detail: "Nana drank about half a cup of water overnight.", status: "open", noteId: null }],
    transfers: [],
    visits: [],
    handovers: [{ id: "h0", ts: at(4, 0), fromId: "c3", toId: "c1", text: "Nana settled well overnight. She drank about half a cup of water. No changes in mood, mobility or the help she needed." }],
    messages: [{ id: "m0", ts: at(7, 15), from: "family", name: "Family", text: "Morning! Is Nana still up for church today? I'll collect her at 10:15." }],
    settings: { relayUrl: "", accessCode: "", familyAlerts: false },
  };
}
/* ---------- records store ----------
 * Each person's records for each client ("nanacare.v3.<username>.<client>") are kept in the phone's
 * database (IndexedDB). Browser storage, used before 1.2.21, holds only about 5 MB, which daily notes
 * fill in about two months. A copy is held in memory, read once when the app opens, so reading stays
 * instant; each save is written through, always the latest version, and if the phone closed the
 * database (iPhones do this in the background) it's reopened and the save tried again. Records in
 * browser storage move across the first time (merged entry by entry if both copies exist). Once they
 * have moved, browser storage is never used for them again: if the database can't be opened, the app
 * says so rather than starting an empty record. A phone that never moved them (no database at all)
 * carries on with browser storage as before.
 */
const REC_PREFIX = "nanacare.v3.", REC_MOVED = "dignitynotes.recordsInDB";
// Two copies of one record: keep every entry from both (the newer change of each), the rest from the database copy.
function mergeRecords(a, b) {
  const out = { ...a };
  for (const arr of [...Object.values(SYNC_KINDS), "pending"]) {
    const byId = new Map();
    for (const r of [...(a[arr] || []), ...(b[arr] || [])]) { if (!r || !r.id) continue; const c = byId.get(r.id); if (!c || mtOf(r) > mtOf(c)) byId.set(r.id, r); }
    if (byId.size) out[arr] = [...byId.values()];
  }
  return out;
}
const recStore = (() => {
  const mem = new Map(); let db = null, mode = "starting"; // then "db", "browser" or "failed"
  const wanted = new Map(), running = new Map(); // key -> latest JSON still to write (null = delete); key -> write in progress
  const lsKeys = () => { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(REC_PREFIX)) out.push(k); } } catch {} return out; };
  const open = () => Promise.race([
    new Promise((res, rej) => { const r = indexedDB.open("dignitynotes-records", 1); r.onupgradeneeded = () => r.result.createObjectStore("records"); r.onsuccess = () => { const d = r.result; d.onclose = () => { if (db === d) db = null; }; res(d); }; r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error("blocked")); }),
    new Promise((res, rej) => setTimeout(() => rej(new Error("timeout")), 5000)),
  ]);
  const req = async (rw, fn) => { if (!db) db = await open(); const d = db; return new Promise((res, rej) => { const t = d.transaction("records", rw); const r = fn(t.objectStore("records")); t.oncomplete = () => res(r && r.result); t.onerror = t.onabort = () => rej(t.error || new Error("Storage failed")); }); };
  let warned = 0;
  // Writes the key's latest value; a failed write reopens the database and tries the latest value again.
  const flushKey = (k) => {
    if (running.has(k)) return running.get(k);
    const p = (async () => {
      let tries = 0;
      while (wanted.has(k)) {
        const json = wanted.get(k);
        try { await req("readwrite", (st) => (json === null ? st.delete(k) : st.put(json, k))); if (wanted.get(k) === json) wanted.delete(k); tries = 0; }
        catch { db = null; if (++tries >= 3) { if (Date.now() - warned > 60000) { warned = Date.now(); toast("Couldn't save on this phone. Close the app fully, open it again, and check your last note."); } return false; } await new Promise((r) => setTimeout(r, 400 * tries)); }
      }
      return true;
    })();
    running.set(k, p);
    p.then((ok) => { running.delete(k); if (ok && wanted.has(k)) flushKey(k); }); // changed while finishing
    return p;
  };
  const ready = (async () => {
    let moved = false; try { moved = localStorage.getItem(REC_MOVED) === "1"; } catch {}
    for (let i = 0; i < (moved ? 3 : 1) && mode !== "db"; i++) {
      try { const [keys, vals] = await Promise.all([req("readonly", (st) => st.getAllKeys()), req("readonly", (st) => st.getAll())]); keys.forEach((k, j) => { try { mem.set(k, JSON.parse(vals[j])); } catch {} }); mode = "db"; }
      catch { db = null; }
    }
    if (mode !== "db") { mode = moved ? "failed" : "browser"; return; }
    // Move records from browser storage (older versions); removed there only once written here.
    for (const k of lsKeys()) {
      let v = null; try { v = JSON.parse(localStorage.getItem(k)); } catch {}
      if (v) { const merged = mem.has(k) ? mergeRecords(mem.get(k), v) : v; wanted.set(k, JSON.stringify(merged)); if (!(await flushKey(k))) continue; mem.set(k, merged); }
      try { localStorage.removeItem(k); } catch {}
    }
    try { localStorage.setItem(REC_MOVED, "1"); } catch {}
  })();
  return {
    ready,
    failed: () => mode === "failed",
    usingDB: () => mode === "db",
    get: (k) => { if (mode === "db") return mem.has(k) ? mem.get(k) : null; if (mode !== "browser") return null; try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch { return null; } },
    // True once kept in memory and queued for the database (see flush), or stored in browser storage.
    set: (k, v) => {
      if (mode === "db") { mem.set(k, v); wanted.set(k, JSON.stringify(v)); flushKey(k); return true; }
      if (mode !== "browser") return false;
      try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
    },
    del: (k) => { if (mode === "db") { mem.delete(k); wanted.set(k, null); flushKey(k); } try { localStorage.removeItem(k); } catch {} },
    keys: () => (mode === "db" ? [...mem.keys()] : mode === "browser" ? lsKeys() : []),
    // Resolves true once the key's latest version is in the database (false if it couldn't be written).
    flush: (k) => (mode !== "db" ? Promise.resolve(mode === "browser") : !wanted.has(k) && !running.has(k) ? Promise.resolve(true)
      : Promise.race([flushKey(k), new Promise((r) => setTimeout(() => r(false), 10000))])),
  };
})();
function load() { return recStore.get(KEY); }
function saveLocal() {
  if (!KEY) return false;
  if (recStore.set(KEY, S)) return true;
  toast("Couldn't save on this phone. Storage may be full."); return false;
}
// Save on this phone, then copy anything new to the cloud shortly after.
function save() { const ok = saveLocal(); if (ok) scheduleSync(); return ok; }
S = seed(); // replaced by the signed-in person's own data in loadUser()
// Each person who signs in on this phone gets their own notes, kept separately for each client.
// The client's name and agreement come from the server, so they are the same for everyone.
function loadUser() {
  const legacy = "nanacare.v3." + session.username;
  KEY = legacy + "." + session.client.id;
  S = load();
  if (!S) { // first time with this client: carry over notes from before clients existed, once
    let old = null;
    old = recStore.get(legacy);
    S = old && old.client && old.client.name === session.client.name ? old : seed();
    // A real client starts with an empty record; the example day is only for trying the app locally.
    if (S !== old && !session.local) Object.assign(S, { notes: [], flags: [], handovers: [], schedule: [], messages: [] });
    S.client = { name: session.client.name }; S.consent = session.client.consent;
    if (save() && S === old) recStore.del(legacy);
  }
  // Kept with the notes too, so the client list can be shown from this phone when offline.
  S.client = { name: session.client.name, carers: session.client.carers || [] }; S.consent = session.client.consent;
  // The person signed in on this phone is on duty whenever the app opens, so notes carry the right name.
  S.messages = S.messages || [];
  if (!S.summaries) { // first time with real family messages: pull them once, and never upload the old practice messages on this phone
    S.summaries = []; const si = syncInfo(); si.seq = 0;
    for (const m of S.messages) si.sent["message:" + m.id] = mtOf(m);
  }
  if (!S.tasks) { S.tasks = []; if (S.sync) S.sync.seq = 0; }
  if (!S.observations) { S.observations = []; if (S.sync) S.sync.seq = 0; } // observations for the reports: pull them once
  if (!S.supplies) { S.supplies = []; if (S.sync) S.sync.seq = 0; } // medicine supplies received: pull them once
  if (!S.forms) { S.forms = []; S.reviews = []; S.acks = []; if (S.sync) S.sync.seq = 0; } // forms, reviews, catch-up ticks: pull them once
  if (!S.pulledV14) { S.pulledV14 = 1; if (S.sync) S.sync.seq = 0; } // 1.3.13/14: assessments, sleep, before and after: an older app skipped them
  if (!S.visits) { S.visits = []; if (S.sync) S.sync.seq = 0; } // 1.3.24: attendance; an older app skipped visits: pull them once
  if (!S.pulledV19) { S.pulledV19 = 1; if (S.sync) S.sync.seq = 0; } // 1.3.19: cancelled appointments: an older app dropped the cancellation
  if (!S.doses) { S.doses = []; if (S.sync) S.sync.seq = 0; } // medicines chart entries: pull them once
  else { const keep = Date.now() - 70 * 864e5; S.doses = S.doses.filter((d) => d.ts > keep); } // this and last month's chart; older entries stay in the cloud // ticks for this client; an older app skipped them, so pull everything once (duplicates are ignored)
  S.onDuty = myId(); S.detached = false; // back on this client: anything kept unsent goes now
  Object.assign(syncState, { error: "", pending: 0, audioPending: 0, failed: 0, last: null, again: false });
  save();
}
const myId = () => (session && (session.meId || session.username)) || "me";
// The client's carers are real accounts, set by an administrator in Manage people (relay /clients),
// identified by private ids rather than login usernames. Demo names (S.carers) only label example entries.
function roster() {
  const list = ((session && session.client && session.client.carers) || []).map((c) => ({ id: c.id, name: c.name, shift: c.shift || "" }));
  // Someone not on the roster (e.g. an administrator visiting) is still listed, so their notes carry their own name.
  if (!list.some((c) => c.id === myId())) list.push({ id: myId(), name: (session && (session.meName || session.name || session.username)) || "Me", shift: "", notOnRoster: true });
  return list;
}
// fallback: the name stored with a record, for carers no longer on the roster (or administrators).
const carer = (id, fallback) => roster().find((c) => c.id === id) || S.carers.find((c) => c.id === id) || { id, name: fallback || "Unknown", shift: "" };
// Who records are stamped with: whoever is signed in (only the local try-out lets you pick).
const stampId = () => (session && !session.local ? myId() : S.onDuty);
const onDuty = () => carer(S.onDuty);
const openFlags = () => S.flags.filter((f) => f.status === "open");
const activeTransfer = () => S.transfers.find((t) => !t.backTs);

/* ---------- audio store (IndexedDB) ---------- */
const audioDB = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open("nanacare-audio", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("clips");
    r.onsuccess = () => { r.result.onclose = () => (dbp = null); res(r.result); }; r.onerror = () => rej(r.error);
  }));
  // iPhones can drop the storage connection while the app is in the background: start afresh next time.
  const tx = async (mode, fn) => { try { const db = await open(); return await new Promise((res, rej) => { const t = db.transaction("clips", mode); const req = fn(t.objectStore("clips")); t.oncomplete = () => res(req && req.result); t.onerror = t.onabort = () => rej(t.error || new Error("Storage failed")); }); } catch (e) { dbp = null; throw e; } };
  return {
    put: (id, blob) => Promise.race([tx("readwrite", (s) => s.put(blob, id)).catch(() => tx("readwrite", (s) => s.put(blob, id))).then(() => true, () => false), new Promise((r) => setTimeout(() => r(false), 8000))]),
    get: (id) => tx("readonly", (s) => s.get(id)).catch(() => null),
    getStrict: (id) => tx("readonly", (s) => s.get(id)), // throws if the phone's storage couldn't be read
    keys: () => tx("readonly", (s) => s.getAllKeys()).catch(() => []),
    del: (ids) => tx("readwrite", (s) => { ids.forEach((id) => s.delete(id)); }).catch(() => null),
  };
})();

/* ---------- cloud copy ----------
 * Notes, flags, handovers and outings are saved on this phone first, then copied to the cloud
 * (our relay, stored in the EU), so they're safe if this phone's data is lost, and every carer on
 * the client sees the same record. Recordings are copied too. Anything not yet copied (no signal)
 * is sent the next time the app has a connection. Example entries stay local.
 * Sync runs in the background, so it never signs anyone out or opens a screen in the middle of
 * something: if the sign-in has ended it pauses, and asks once nothing is open.
 */
const SYNC_KINDS = { note: "notes", obs: "observations", flag: "flags", handover: "handovers", transfer: "transfers", visit: "visits", event: "schedule", task: "tasks", message: "messages", summary: "summaries", dose: "doses", supply: "supplies", form: "forms", review: "reviews", ack: "acks" };
const DEMO_IDS = new Set(["n0", "f0", "h0", "s1", "s2", "s3", "m0"]);
const SYNC_RECORD_MAX = 58000, SYNC_BATCH_MAX = 400000; // the relay allows 60,000 a record, 1,000,000 a request
// When a record last changed (older records have no mt, so use their latest time).
const mtOf = (r) => r.mt || Math.max(r.ts || 0, r.approvedTs || 0, r.outTs || 0, r.backTs || 0, r.resolvedTs || 0, r.cancelledTs || 0);
// Mark a record as changed now, later than any earlier change even if phone clocks differ.
const touch = (r) => { r.mt = Math.max(Date.now(), mtOf(r) + 1); };
const syncState = { busy: false, again: false, last: null, error: "", pending: 0, audioPending: 0, failed: 0, blocked: null };
const syncInfo = () => { const si = S.sync || (S.sync = { seq: 0, sent: {}, audio: {} }); si.failed = si.failed || {}; return si; };
const cloudOn = () => !!(session && session.token && !session.local && session.role !== "family" && session.client && session.privacyAccepted === PRIVACY_VERSION && relayBase());

// Same checks as the relay (worker/src/sync.js): only known, well-formed fields are kept, because
// records from other phones are displayed here.
const SYNC_ID = /^[A-Za-z0-9_-]{1,64}$/;
const SYNC_SHAPES = {
  note: { req: ["ts", "note"], f: { ts: "num", approvedTs: "num", carerId: "id", carerName: "str:60", planSections: "cats", transcript: "str:30000", heard: "str:30000", phoneHeard: "str:30000", heardBy: "str:10", amends: "id", auto: "num", extra: "num", note: "str:20000", categories: "cats", audioId: "id", source: "str:20" } },
  flag: { req: ["ts", "kind", "title", "status"], f: { ts: "num", kind: ["incident", "follow_up"], title: "str:200", detail: "str:2000", status: ["open", "resolved"], noteId: "id", raisedBy: "id", resolvedNote: "str:1000", resolvedTs: "num", resolvedBy: "id" } },
  task: { req: ["ts", "taskId", "day", "status"], f: { ts: "num", taskId: "str:40", title: "str:120", day: "str:10", period: ["morning", "afternoon", "evening", "night", "any"], status: ["done", "not_done"], reason: "str:300", by: "id", noteId: "id" } },
  dose: { req: ["ts", "medId", "day", "slot", "code"], f: { ts: "num", medId: "id", med: "str:200", day: "str:10", slot: "str:8", code: ["T", "P", "R", "NT", "NR", "D", "C", "M", "E", "O", "V"], amount: "str:40", reason: "str:300", prnFor: "str:200", note: "str:500", corrects: "id", outcomeOf: "id", outcome: "str:200", by: "id", byName: "str:60" } },
  supply: { req: ["ts", "medId", "matches"], f: { ts: "num", medId: "id", med: "str:200", qty: "str:60", from: "str:80", matches: ["yes", "no"], mismatch: "str:300", by: "id", byName: "str:60" } },
  message: { req: ["ts", "text", "from"], f: { ts: "num", text: "str:2000", from: ["family", "carer"], name: "str:60", by: "id" } },
  summary: { req: ["ts", "text"], f: { ts: "num", day: "str:10", text: "str:4000", by: "id", byName: "str:60" } },
  handover: { req: ["ts", "text"], f: { ts: "num", fromId: "id", fromName: "str:60", toId: "id", text: "str:10000", source: "str:20" } },
  // One observation taken from a note for the specialist reports (a drink, a meal, a bowel or urinary
  // event, pain, sleep, behaviour, skin, a weight). Can be corrected later; the note itself never changes.
  obs: { req: ["ts", "noteId", "topic"], f: { ts: "num", noteId: "id", topic: ["mobility", "fluids", "food", "bowels", "urinary", "pain", "sleep", "behaviour", "skin", "weight"], words: "str:300", drink: "str:60", offeredMl: "num", drankMl: "num", portion: ["all", "most", "half", "little", "none", "unknown"], outcome: ["taken", "partly", "refused", "opened", "not_opened", "accident", "passed", "incontinent", "pad_wet", "pad_dry", "catheter", "slept", "woke", "restless", "napped", "awake_night"], bristol: "num", painScore: "num", where: "str:80", kg: "num", cm: "num", before: "str:300", after: "str:300", carerId: "id", fixedBy: "str:60", fixedAt: "num", removed: "num" } },
  // Incident reports and skin forms (each save a new version), administrators' reviews, catch-up ticks.
  form: { req: ["ts", "formId", "type", "data", "status"], f: { ts: "num", formId: "id", prevId: "id", type: ["incident", "skin", "assessment"], noteId: "id", flagId: "id", ref: "str:20", data: "str:20000", status: ["open", "follow_up", "closed"], by: "id", byName: "str:60" } },
  review: { req: ["ts", "formId", "notify"], f: { ts: "num", formId: "id", notify: ["yes", "no", "unsure"], why: "str:1000", candour: ["yes", "no", "unsure"], safeguarding: ["yes", "no", "unsure"], lessons: "str:1000", by: "id", byName: "str:60" } },
  ack: { req: ["ts", "what"], f: { ts: "num", what: ["read", "skin"], since: "num", by: "id", byName: "str:60" } },
  visit: { req: ["ts", "inTs"], f: { ts: "num", inTs: "num", outTs: "num", inAt: "num", outAt: "num", by: "id", byName: "str:60", outBy: "id", outNote: "str:300" } },
  event: { req: ["ts", "when", "label"], f: { ts: "num", when: "num", label: "str:120", detail: "str:300", by: "id", cancelledTs: "num", cancelledBy: "id", cancelReason: "str:200", remind: "str:40", remindWho: ["all", "me"], seriesId: "id", repeat: "str:60" } },
  transfer: { req: ["outTs", "withWhom"], f: { outTs: "num", withWhom: "str:100", relationship: "str:100", purpose: "str:200", carerId: "id", backTs: "num", backNote: "str:2000", backCarerId: "id" } },
};
function cleanRecord(kind, data) {
  const shape = SYNC_SHAPES[kind];
  if (!shape || !data || typeof data !== "object" || Array.isArray(data) || typeof data.id !== "string" || !SYNC_ID.test(data.id)) return null;
  const out = { id: data.id, mt: Math.floor(Number(data.mt)) };
  if (!(out.mt > 0)) return null;
  for (const [k, t] of Object.entries(shape.f)) {
    const v = data[k];
    if (v === undefined || v === null) continue;
    if (Array.isArray(t)) { if (!t.includes(v)) return null; out[k] = v; }
    else if (t === "num") { const n = Number(v); if (!Number.isFinite(n) || n < 0) return null; out[k] = n; }
    else if (t === "id") { if (typeof v !== "string" || !SYNC_ID.test(v)) return null; out[k] = v; }
    else if (t === "cats") { if (!Array.isArray(v) || v.length > 20 || v.some((c) => typeof c !== "string" || c.length > 60)) return null; out[k] = v; }
    else { const max = Number(t.split(":")[1]); if (typeof v !== "string" || v.length > max) return null; out[k] = v; }
  }
  if (shape.req.some((k) => out[k] === undefined)) return null;
  if (kind === "note" && !out.categories) out.categories = [];
  if (kind === "form") { try { const d = JSON.parse(out.data); if (!d || typeof d !== "object" || Array.isArray(d)) return null; } catch { return null; } }
  return out;
}

function unsynced() {
  const si = syncInfo(), out = [];
  for (const [kind, arr] of Object.entries(SYNC_KINDS)) for (const r of S[arr] || []) {
    if (!r || !r.id || DEMO_IDS.has(r.id) || r.source === "example") continue;
    const k = kind + ":" + r.id, mt = mtOf(r);
    if ((si.sent[k] || 0) >= mt) continue;
    if (si.failed[k] && si.failed[k].mt === mt) continue; // couldn't be copied; tried again only if it changes
    out.push({ kind, r });
  }
  return out;
}
// Recordings this phone made whose note is in the cloud, but the recording isn't yet.
const unsentAudio = () => { const si = syncInfo(); return S.notes.filter((n) => n.audioId && !DEMO_IDS.has(n.id) && si.sent["note:" + n.id] && !si.audio[n.audioId]); };
function countFailed() { const si = syncInfo(); return Object.keys(si.failed).length + Object.values(si.audio).filter((v) => v === "toolarge" || v === "conflict").length; }

let syncTimer = null;
function scheduleSync(ms = 1500) { if (!cloudOn()) return; clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, ms); }
// Background requests: errors are reported in the cloud status, never acted on mid-task.
async function syncFetch(path, init) {
  const { signal: outer, timeout = 60000, ...rest } = init; init = rest;
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), timeout);
  if (outer) { if (outer.aborted) ctl.abort(); else outer.addEventListener("abort", () => ctl.abort(), { once: true }); }
  try {
    const r = await fetch(relayBase() + path, { method: "POST", ...init, signal: ctl.signal, headers: { "Content-Type": "application/json", ...(init.headers || {}), Authorization: "Bearer " + session.token } });
    if (r.status === 401 || r.status === 428) { syncState.blocked = { why: r.status === 401 ? "signin" : "privacy", token: session.token }; }
    if (!r.ok) { const j = await r.json().catch(() => ({})); const e = new Error(j.error || "Error " + r.status); e.status = r.status; e.code = j.code; throw e; }
    return r;
  } catch (e) { if (e.name === "AbortError") throw new Error("The cloud took too long to answer"); throw e; }
  finally { clearTimeout(timer); }
}
const syncJSON = (path, body, timeout) => syncFetch(path, { body: JSON.stringify(body), timeout }).then((r) => r.json());
// Something is open (recording, a sheet such as "Check before saving", or a full screen): don't
// interrupt it with a reload, a sign-out or the privacy notice; wait until it's closed.
const appBusy = () => !!(rec.on || rec.starting || $("#sheetRoot").innerHTML.trim() || $("#fullRoot").innerHTML.trim());
// Sign-in ended or a new privacy notice: ask only when nothing is open and nobody is recording.
function handleSyncBlocked() {
  const b = syncState.blocked;
  if (!b || !session || b.token !== session.token) { syncState.blocked = null; return false; }
  if (appBusy()) return true;
  syncState.blocked = null;
  if (b.why === "signin") signedOut("Your sign-in has ended. Sign in again to carry on.");
  else { session.privacyAccepted = null; saveSession(); showPrivacy(() => afterSignIn(true)); }
  return true;
}

async function syncNow() {
  if (!KEY || !cloudOn() || !navigator.onLine) return; // no KEY: records not loaded yet
  if (syncState.blocked && handleSyncBlocked()) return;
  if (syncState.busy) { syncState.again = true; return; }
  syncState.busy = true; syncState.again = false;
  const key = KEY, cid = session.client.id, still = () => KEY === key && session && session.client && session.client.id === cid && !syncState.blocked;
  const si = syncInfo(); let changed = false; const errors = [];
  try {
    // 1. Send what's new or changed on this phone, in batches that fit the relay's limits.
    try {
      const todo = unsynced();
      while (todo.length && still()) {
        const batch = []; let size = 0;
        while (todo.length && batch.length < 50) {
          const { kind, r } = todo[0], data = { ...r, mt: mtOf(r) }, len = JSON.stringify(data).length;
          if (len > SYNC_RECORD_MAX) { todo.shift(); si.failed[kind + ":" + r.id] = { why: "size", mt: data.mt }; continue; }
          if (batch.length && size + len > SYNC_BATCH_MAX) break;
          todo.shift(); size += len; batch.push({ kind, id: r.id, data });
        }
        if (!batch.length) continue;
        const out = await syncJSON("/sync/push", { client: cid, records: batch });
        if (!still()) return;
        const why = new Map((out.rejected || []).map((x) => [x.id, x.why]));
        for (const b of batch) {
          const k = b.kind + ":" + b.id, w = why.get(b.id);
          if (!w) { si.sent[k] = b.data.mt; delete si.failed[k]; }
          else if (w === "clock") errors.push("This phone's date or time is wrong. Correct it in the phone's settings.");
          else si.failed[k] = { why: w, mt: b.data.mt };
        }
        saveLocal();
      }
    } catch (e) { errors.push(e.message); }
    // 2. Recordings not copied yet (one request each). One problem never stops the rest.
    for (const n of unsentAudio()) {
      if (!still()) break;
      let blob;
      try { blob = await audioDB.getStrict(n.audioId); } catch { errors.push("Couldn't read a recording on this phone. It will be tried again."); continue; }
      if (!blob) { si.audio[n.audioId] = "missing"; saveLocal(); continue; } // not on this phone (lost before it was copied)
      try {
        await syncFetch(`/sync/audio/put?client=${encodeURIComponent(cid)}&id=${encodeURIComponent(n.audioId)}`, { headers: { "Content-Type": blob.type || "application/octet-stream" }, body: blob });
        if (!still()) break;
        si.audio[n.audioId] = 1; saveLocal();
      } catch (e) {
        if (e.status === 413 || e.code === "too_large") { si.audio[n.audioId] = "toolarge"; saveLocal(); }
        else if (e.status === 409) { si.audio[n.audioId] = "conflict"; saveLocal(); }
        else errors.push(e.message);
      }
    }
    // 3. Fetch what other phones have sent since last time.
    try {
      for (let more = true; more && still();) {
        const out = await syncJSON("/sync/pull", { client: cid, since: si.seq });
        if (!still()) return;
        for (const { kind, id, data: raw, at } of out.records || []) {
          const arr = S[SYNC_KINDS[kind]], data = cleanRecord(kind, raw);
          if (!arr || !data || data.id !== id) continue;
          if (at > 0) data.serverAt = at; // when it first reached the cloud (shown if much later than its time)
          const i = arr.findIndex((x) => x.id === id);
          const isNew = i < 0;
          if (isNew) { arr.push(data); changed = true; }
          else if (mtOf(arr[i]) < mtOf(data) || (kind === "obs" && mtOf(arr[i]) === mtOf(data) && Object.keys(data).some((k) => arr[i][k] === undefined)) || (kind === "flag" && data.status === "resolved" && arr[i].status !== "resolved") || (kind === "transfer" && data.backTs && !arr[i].backTs) || (kind === "event" && data.cancelledTs && !arr[i].cancelledTs) || (kind === "visit" && data.outTs && !arr[i].outTs)) { arr[i] = { ...arr[i], ...data }; changed = true; }
          const k = kind + ":" + id; si.sent[k] = Math.max(si.sent[k] || 0, mtOf(data));
          // A note new to this phone came from another phone (or from the cloud after this phone was
          // cleared): its recording is the cloud's job. This phone's own recordings are uploaded by step 2.
          if (kind === "note" && isNew && data.audioId && !si.audio[data.audioId]) si.audio[data.audioId] = "cloud";
        }
        si.seq = out.seq || si.seq; more = !!out.more;
        saveLocal();
      }
      if (still() && !syncState.pulled) { syncState.pulled = true; changed = true; }
    } catch (e) { errors.push(e.message); }
    try { if (still() && (await sendMedPending())) changed = true; } catch (e) { errors.push(e.message); }
    if (still()) { await loadPlan(); syncState.error = errors[0] || ""; if (!errors.length) syncState.last = Date.now(); }
  } finally {
    syncState.busy = false;
    if (KEY === key) { syncState.pending = unsynced().length; syncState.audioPending = unsentAudio().length; syncState.failed = countFailed(); }
    if (changed && KEY === key) { if (appBusy() || userIsReading()) syncState.redraw = true; else render(); }
    if (syncState.blocked) handleSyncBlocked();
    else if (syncState.again) scheduleSync(300);
  }
}
// A recording that isn't on this phone (made on another phone, or this phone's data was cleared):
// fetch it from the cloud and keep a copy here. Returns { blob } or { why }.
async function cloudAudio(id) {
  if (!cloudOn()) return { why: "off" };
  if (!navigator.onLine) return { why: "offline" };
  try {
    const r = await syncFetch("/sync/audio/get", { body: JSON.stringify({ client: session.client.id, id }) });
    const blob = await r.blob();
    if (!blob.size) return { why: "missing" };
    await audioDB.put(id, blob);
    return { blob };
  } catch (e) { return { why: e.status === 404 ? "missing" : "error" }; }
}
function cloudStatus() {
  if (!cloudOn()) return session && session.local ? "Off (this phone only)" : "Not connected";
  if (syncState.blocked) return syncState.blocked.why === "signin" ? "Paused: sign in again to carry on" : "Paused: accept the new privacy notice";
  const waiting = syncState.pending + syncState.audioPending;
  const failed = syncState.failed ? ` ${syncState.failed} couldn't be copied (too large or not valid); they're kept on this phone.` : "";
  if (syncState.error) return `Not reached${waiting ? `: ${waiting} waiting to send` : ""}. ${syncState.error}${failed}`;
  if (waiting) return `${waiting} waiting to send.${failed}`;
  return (syncState.last ? `Up to date (checked ${fmtTime(syncState.last)}).` : "Checking…") + failed;
}
window.addEventListener("online", () => scheduleSync(500));
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") scheduleSync(300); });
setInterval(() => { if (document.visibilityState === "visible") scheduleSync(0); }, 120000); // pick up other carers' notes

/* ---------- AI: relay first, basic offline rules as fallback ---------- */
async function relay(path, body, { auth = true } = {}) {
  const base = relayBase();
  if (!base) throw new Error("AI not connected");
  if (!navigator.onLine) throw new Error("No internet connection");
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 60000);
  try {
    const headers = { "Content-Type": "application/json" };
    if (auth && session && session.token) headers.Authorization = "Bearer " + session.token;
    const r = await fetch(base + path, { method: "POST", signal: ctl.signal, headers, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    // Mid-task (e.g. writing the note after a recording), never sign out or open a screen: the task
    // carries on with the basic offline version, and the sign-in is asked for once it's finished.
    if ((r.status === 401 && auth && session && !session.local) || (r.status === 428 && session)) {
      syncState.blocked = { why: r.status === 401 ? "signin" : "privacy", token: session.token };
      handleSyncBlocked();
    }
    if (!r.ok) throw new Error(j.error || "Error " + r.status);
    return j;
  } catch (e) { throw new Error(e.name === "AbortError" ? "AI took too long" : e.message); }
  finally { clearTimeout(timer); }
}

const CAT_RULES = [
  ["Personal care", /\b(bath|bathed|shower|showered|wash|washed|strip wash|teeth|shave|shaved|personal care)\b/i],
  ["Hair and dressing", /\b(hair|dress|dressed|clothes|nightie|pyjamas)\b/i],
  ["Meals", /\b(breakfast|lunch|dinner|supper|ate|eat|eaten|meal|snack|toast|porridge|food|soup|sandwich)\b/i],
  ["Fluids", /\b(drink|drank|drinks|water|tea|coffee|juice|fluids?|cup|glass)\b/i],
  ["Medication", /\b(meds|medication|medicine|tablets?|pills?|cosmocol|dose|inhaler|eye drops)\b/i],
  ["Mood", /\b(mood|happy|cheerful|low|tearful|upset|content|good spirits|chatty|smiling)\b/i],
  ["Behaviour", /\b(agitated|aggressive|confused|anxious|wandering|shouting|restless|behaviour)\b/i],
  ["Mobility", /\b(walk|walked|walking|frame|stick|wheelchair|stairs|steps|transfer|hoist|mobility|stood|standing)\b/i],
  ["Skin and bruising", /\b(bruis\w*|skin|sore|redness|cut|bleed\w*|blood|dressing|cream)\b/i],
  ["Toileting", /\b(toilet|pad|commode|wee|bowels?|continence|accident|soiled)\b/i],
  ["Appointment", /\b(doctor|gp|appointment|nurse|hospital|dentist|injection|optician|podiatrist)\b/i],
  ["Activity or outing", /\b(church|outing|went out|garden|lunch out|visit|visited|visitor|tv|puzzle)\b/i],
];
const FLAG_RULES = [
  ["incident", "New bruise", /\bbruis\w*/i],
  ["incident", "Bleeding", /\b(bleed\w*|blood|skin tear)\b/i],
  ["incident", "Fall", /\b(fell|fall|fallen|tumble|tumbled|slipped)\b/i],
  ["incident", "Loss of consciousness", /\b(unconscious|passed out|fainted|collapsed|unresponsive)\b/i],
  ["incident", "Injury", /\b(injured|injury|wound|burn|burnt|scald\w*)\b/i],
  ["incident", "Medication error", /\b(wrong (dose|medication|tablets?)|double dose|given twice)\b/i],
  ["follow_up", "Medication refused", /\b(refused|wouldn'?t take|didn'?t take|spat out)\b[^.]*\b(meds|medication|tablets?|pills?)\b|\b(meds|medication|tablets?|pills?)\b[^.]*\brefused\b/i],
  ["follow_up", "Low food or fluid intake", /\b(not (drinking|eating)|didn'?t (drink|eat)|hardly (drank|ate|drinking|eating)|poor (intake|appetite)|not enough fluids?)\b/i],
  ["follow_up", "Pad or dressing change", /\bneeds? (a )?(pad|dressing) change\b/i],
  ["follow_up", "Task not completed", /\b(didn'?t have|missed|no|refused) (her |his |a )?(bath|shower|wash)\b/i],
];
function basicTidy(transcript) {
  let t = " " + transcript.replace(/\s+/g, " ").trim() + " ";
  t = t.replace(/\b(um+|uh+|erm+|er|ah|you know|i mean|sort of|kind of)\b[,]?\s*/gi, "").replace(/\s+([,.!?])/g, "$1").trim();
  const sentences = (t.match(/[^.!?]+[.!?]*/g) || [t]).map((s) => s.trim()).filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1)).map((s) => /[.!?]$/.test(s) ? s : s + ".");
  const note = sentences.join(" ");
  const categories = CAT_RULES.filter(([, re]) => re.test(note)).map(([c]) => c);
  const flags = [];
  for (const [kind, title, re] of FLAG_RULES) {
    const detail = sentences.find((s) => re.test(s)) || note;
    if (re.test(note) && !flags.some((f) => f.detail === detail)) flags.push({ kind, title, detail });
  }
  if (flags.some((f) => f.kind === "follow_up") && !categories.includes("To note")) categories.push("To note");
  // Aggression or agitation is part of conditions like dementia: recorded as behaviour, not an incident.
  return { note, categories, flags, unclear: [], record_gaps: flags.some((f) => f.kind === "incident") ? ["when", "seen", "done", "told"] : [] };
}
const validTidy = (o) => o && typeof o.note === "string" && o.note.trim() && Array.isArray(o.categories) && Array.isArray(o.flags);
async function tidy(transcript, addition) { // addition: an addition to an earlier note (not a new event)
  try {
    const out = await relay("/tidy", { transcript, addition: !!addition, client: S.client.name, carer: onDuty().name, time: fmtTime(Date.now()), vocabulary: dictVocabulary(), country: clientCountry(), containers: CUPS(), clientId: session && session.client ? session.client.id : "", tasks: tasksNow().due.filter((x) => !x.tick).map((x) => x.t.title), planSections: plan().sections.map((x) => x.title) });
    if (!validTidy(out)) throw new Error("Unexpected reply from the relay");
    return { unclear: [], background: [], record_gaps: [], plan_sections: [], tasks_done: [], observations: [], ...out, source: "ai" };
  } catch (e) {
    return { ...basicTidy(transcript), source: "basic", reason: e.message };
  }
}
const isExample = (r) => !!r && (r.source === "example" || DEMO_IDS.has(r.id) || /^s[123]$|^m0$/.test(r.id));
// This shift: since the last handover (at most 12 hours), so it doesn't repeat what was handed over.
function shiftStart() {
  const last = S.handovers.filter((h) => !isExample(h) && h.ts <= Date.now()).reduce((m, h) => Math.max(m, h.ts), 0);
  return Math.max(Date.now() - 12 * 36e5, last);
}
// Extra assistance (Sam, 2026-10-12): a carer who signs in outside their own shift times, while
// someone else's shift covers now (e.g. called in after a fall). Their notes are marked "Extra
// assistance"; the shift and handover stay with the carer on duty. Only when both shifts have clear
// times: a wrong label is worse than none. The first and last such note give the visit time later.
const inShift = (text, d = new Date()) => { const r = shiftRange(text); if (!r) return null; const m = d.getHours() * 60 + d.getMinutes(); return r.from < r.to ? m >= r.from && m < r.to : m >= r.from || m < r.to; };
function extraAssistanceNow() {
  if (!session || session.local) return false;
  const all = roster(), me = all.find((c) => c.id === myId());
  if (!me || inShift(me.shift) !== false) return false; // no clear times, or on shift
  return all.some((c) => c.id !== me.id && inShift(c.shift) === true);
}
const extraChip = (n) => (n && n.extra ? ' <span class="chip follow">Extra assistance</span>' : "");
// A shift's start and end in minutes from midnight, from text like "Day · 04:00–13:30" (or 4-13.30,
// 4am-1:30pm). null when there are no clear times. Used to tell who is on shift.
function shiftRange(text) {
  const m = String(text || "").toLowerCase().match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\s*(?:–|—|-|to)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/);
  if (!m) return null;
  const mins = (h, mm, ap) => { h = Number(h); if (ap === "pm" && h < 12) h += 12; if (ap === "am" && h === 12) h = 0; return h <= 24 && Number(mm || 0) < 60 ? (h % 24) * 60 + Number(mm || 0) : NaN; };
  const from = mins(m[1], m[2], m[3]), to = mins(m[4], m[5], m[6]);
  return Number.isNaN(from) || Number.isNaN(to) || from === to ? null : { from, to };
}
// The family update covers the last 24 hours, from every carer.
const familyNotes = () => S.notes.filter((n) => Math.max(n.ts, n.approvedTs || 0) >= Date.now() - 24 * 36e5 && !isExample(n)).sort((a, b) => a.ts - b.ts);
function shiftNotes() {
  const since = shiftStart();
  return S.notes.filter((n) => Math.max(n.ts, n.approvedTs || 0) >= since && !isExample(n)).sort((a, b) => a.ts - b.ts);
}
const familyIncidentsOn = () => (session && !session.local && session.client ? !!session.client.familyIncidents : !!S.settings.familyAlerts);
function summaryPayload(mode, toId) {
  return {
    mode, country: clientCountry(), clientId: session && session.client ? session.client.id : "", client: S.client.name, fromCarer: onDuty().name, toCarer: toId ? carer(toId).name : "",
    notes: [...(mode === "handover" ? S.flags.filter((f) => f.status === "resolved" && f.resolvedTs >= shiftStart() && !isExample(f)).map((f) => ({ ts: f.resolvedTs, note: `Resolved: ${f.title}.${f.resolvedNote ? " How: " + f.resolvedNote : ""}`, carerId: f.resolvedBy, resolvedFlag: true })) : []), ...(mode === "family" ? familyNotes() : shiftNotes())].sort((a, b) => a.ts - b.ts).map((n) => { if (n.resolvedFlag) return { time: fmtTime(n.ts), carer: carer(n.carerId).name, note: n.note }; const o = n.amends && S.notes.find((x) => x.id === n.amends); return { time: fmtTime(n.ts), carer: carer(n.carerId, n.carerName).name + (n.extra && mode !== "family" ? ", extra assistance" : ""), note: o ? `(Added to the note from ${dayLabel(o.ts).toLowerCase()} at ${fmtTime(o.ts)}) ${n.note}` : n.note }; }),
    flags: [...openFlags().filter((f) => !isExample(f) && !(mode === "family" && f.kind === "incident" && !familyIncidentsOn()) && !(mode === "family" && (f.ts < Date.now() - 24 * 36e5 || MEDS_SAFETY_FLAG.test(f.title)))).map((f) => ({ kind: f.kind === "incident" ? "Incident" : "To note", title: f.title, detail: f.detail })), ...(mode === "handover" ? [...handoverFormFlags(), ...medPending().map((x) => ({ kind: "To note", title: `Medicine ${x.medId ? "change" : "added"} saved on this phone, not on the chart yet: ${medName(x.med)}`, detail: `${x.med.dose || ""}${x.problem ? ". Not sent: " + x.problem : ". It goes on the chart when there's signal."}` }))] : [])],
    transfers: S.transfers.filter((t) => t.outTs >= (mode === "family" ? Date.now() - 24 * 36e5 : shiftStart()) || !t.backTs).map((t) => `${fmtTime(t.outTs)} out with ${t.withWhom} (${t.purpose || "outing"})${t.backTs ? ", back " + fmtTime(t.backTs) : ", not yet back"}`),
    planGaps: mode === "handover" ? planGaps() : [],
    tasksMissed: mode === "handover" ? tasksMissedForHandover() : [],
    medsSummary: mode === "handover" ? medsForHandover() : [],
    schedule: liveAppts().filter((s) => s.when > Date.now()).sort((a, b) => a.when - b.when).slice(0, 4).map((s) => `${dayLabel(s.when)} ${fmtTime(s.when)}: ${s.label}${s.detail ? " - " + s.detail : ""}`),
  };
}
// Medicine-safety follow-ups are for the carers, not the family update.
const MEDS_SAFETY_FLAG = / given outside its limits$|^Stopping .+: not yet checked$|not signed off|label doesn't match|recorded twice/i;
function basicSummary(p) {
  const first = (s) => (s.match(/[^.!?]+[.!?]/) || [s])[0].trim();
  if (p.mode === "family") {
    const lines = p.notes.map((n) => first(n.note));
    const inc = p.flags.filter((f) => f.kind === "Incident");
    return (lines.length ? lines.join(" ") : `No notes recorded yet today for ${p.client}.`) + (inc.length ? `\n\nTo note: ${inc.map((f) => f.detail).join(" ")}` : "");
  }
  return [
    "How the shift went", ...(p.notes.length || p.transfers.length ? [...p.notes.map((n) => [n.time, `- ${n.time} ${first(n.note)}`]), ...p.transfers.map((t) => [t.slice(0, 5), `- ${t}`])].sort((a, b) => a[0].localeCompare(b[0])).map((x) => x[1]) : ["- No notes recorded this shift."]),
    "", "Points to note", ...(p.flags.length ? p.flags.map((f) => `- ${f.title}: ${f.detail}`) : ["- Nothing to note."]),
    "", "Coming up", ...(p.schedule.length ? p.schedule.map((s) => `- ${s}`) : ["- Nothing scheduled."]),
    ...((p.tasksMissed || []).length ? ["", "Tasks not done this shift:", ...p.tasksMissed.map((t) => `- ${t}`)] : []),
    ...((p.medsSummary || []).length ? ["", "Medicines this shift:", ...p.medsSummary.map((t) => `- ${t}`)] : []),
  ].join("\n");
}
async function summarise(mode, toId) {
  const p = summaryPayload(mode, toId);
  try {
    const out = await relay("/summarise", p);
    if (!out || typeof out.text !== "string" || !out.text.trim()) throw new Error("Unexpected reply from the relay");
    return { text: out.text, source: "ai" };
  }
  catch (e) { return { text: basicSummary(p), source: "basic", reason: e.message }; }
}
const sourceTag = (src, reason) => src === "ai"
  ? '<span class="source"><span class="dot"></span>Tidied by AI. Check it before saving.</span>'
  : src === "basic" ? `<span class="source"><span class="dot basic"></span>Basic tidy (offline${reason ? ": " + esc(reason) : ""})</span>` : "";


/* ---------- family accounts ----------
 * An authorised family member signs in to their own simple screen for the client: the daily
 * summaries carers share, coming appointments, messages with the carers, and incidents if an
 * administrator switched that on (as agreed). The relay enforces this; notes never reach family.
 */
const isFamily = () => !!(session && session.role === "family");
let familyLoading = false;
async function loadFamilyView(force) {
  if (familyLoading || !session || !session.client || session.local || !navigator.onLine) return;
  if (!force && S.familyView && Date.now() - (S.familyView.at || 0) < 60000) return;
  familyLoading = true;
  try { const v = await relay("/family/view", { client: session.client.id }); S.familyView = { ...v, at: Date.now(), error: "" }; saveLocal(); if (isFamily() && tab === "today" && !appBusy() && !userIsReading()) render(); }
  catch (e) { S.familyView = { ...(S.familyView || {}), error: e.message }; if (isFamily() && tab === "today" && !appBusy()) render(); }
  finally { familyLoading = false; }
}
function renderFamilyHome() {
  const v = $("#view-today"), fv = S.familyView || {}, name = esc(S.client.name);
  const sums = fv.summaries || [], msgs = fv.messages || [], coming = fv.coming || [];
  v.innerHTML = `<div class="hello"><h2>Hello, ${esc(session.name)}</h2><p>Updates about ${name} from the carers.</p></div>
    ${fbQuestionsHTML()}
    ${fv.error ? `<div class="warn small">Couldn't get the latest updates: ${esc(fv.error)}</div>` : ""}
    ${!fv.at ? `<div class="card"><div class="empty">${fv.error ? "Tap Check for updates to try again." : navigator.onLine ? "Loading…" : "Connect to the internet to see the latest updates."}</div></div>` : ""}
    <div class="card"><div class="card-h"><h3>Daily updates</h3>${fv.at ? `<span class="muted small">Checked ${isToday(fv.at) ? "" : esc(dayLabel(fv.at)) + " "}${fmtTime(fv.at)}</span>` : ""}</div>
      ${sums.length ? sums.map((x) => `<div style="border-top:1px solid var(--line);padding-top:10px;margin-top:10px"><div class="tiny muted">${esc(dayLabel(x.ts))}${x.byName ? " · from " + esc(x.byName) : ""}</div><p class="note-text" style="white-space:pre-line;margin:4px 0 0">${esc(x.text)}</p></div>`).join("") : '<div class="empty">No updates shared yet. The carers share a short update when they can.</div>'}</div>
    ${coming.length ? `<div class="card"><div class="card-h"><h3>Coming up</h3></div><div class="list">${coming.map((e) => `<div class="item"><div class="when">${fmtTime(e.when)}</div><div class="body"><div><strong>${esc(e.label)}</strong></div><div class="muted small">${esc(dayLabel(e.when))}${e.detail ? " · " + esc(e.detail) : ""}</div></div></div>`).join("")}</div></div>` : ""}
    ${fv.incidents ? `<div class="card"><div class="card-h"><h3>Incidents</h3><span class="muted small">Last 14 days</span></div>${fv.incidents.length ? fv.incidents.map((f) => `<div class="flag incident"><div class="body"><strong>${esc(f.title)}</strong>${f.detail ? `<div class="small">${esc(f.detail)}</div>` : ""}<div class="tiny muted">${esc(dayLabel(f.ts))} ${fmtTime(f.ts)}${f.status === "resolved" ? " · resolved" : ""}</div></div></div>`).join("") : '<div class="empty">No incidents.</div>'}</div>` : ""}
    ${Array.isArray(fv.reports) && fv.reports.length ? `<div class="card"><div class="card-h"><h3>Incident reports</h3><span class="muted small">Last 30 days</span></div><div style="display:grid;gap:8px">${fv.reports.map((r) => `<details><summary class="small"><strong>${esc(r.ref)}</strong> · ${esc(dayLabel(r.ts))} · ${esc(FORM_STATUS[r.status] || "")}</summary><div style="display:grid;gap:4px;margin-top:6px">${formViewHTML("incident", formData({ data: JSON.stringify(r.data || {}) }))}<div class="tiny muted">Last changed by ${esc(r.byName)}. ${internalNoteHTML()}</div></div></details>`).join("")}</div></div>` : ""}
    <div class="card"><div class="card-h"><h3>Messages</h3><span class="muted small">With ${name}'s carers</span></div>
      <div class="thread" id="fThread">${msgs.map((m) => `<div class="msg ${m.from === "family" ? "carer" : ""}"><span class="who">${esc(m.name || (m.from === "family" ? "Family" : "Carer"))} · ${esc(dayLabel(m.ts))} ${fmtTime(m.ts)}</span>${esc(m.text)}</div>`).join("") || '<div class="empty">No messages yet.</div>'}</div>
      <form class="composer" id="fMsgForm" style="margin-top:12px"><input type="text" id="fMsgText" maxlength="2000" placeholder="Write a message to the carers" aria-label="Message" autocomplete="off"><button class="btn primary" style="min-height:46px">Send</button></form>
      <div class="small" id="fMsgErr" role="status"></div></div>
    <p class="tiny muted" style="text-align:center;margin:8px 0 0">You see what the carers share: daily updates, appointments and messages${fv.incidents ? ", and incidents" : ""}. Their care notes and recordings stay in the care record.</p>
    <button class="link small" id="fRefresh" style="justify-self:center">Check for updates</button>`;
  bindFbQuestions(v);
  loadFbQuestions(false).then((changed) => { if (changed && tab === "today" && !appBusy() && !userIsReading()) render(); });
  $("#fMsgForm").onsubmit = async (e) => {
    e.preventDefault(); const t = $("#fMsgText").value.trim(); if (!t) return;
    const btn = e.currentTarget.querySelector("button"); btn.disabled = true;
    try {
      const out = await relay("/family/message", { client: session.client.id, text: t });
      S.familyView = S.familyView || {}; S.familyView.messages = [...(S.familyView.messages || []), out.message]; saveLocal();
      $("#fMsgText").blur(); renderFamilyHome(); toast("Sent to the carers");
    } catch (err) { $("#fMsgErr").textContent = err.message; btn.disabled = false; }
  };
  $("#fRefresh").onclick = () => loadFamilyView(true);
  const th = $("#fThread"); if (th) th.scrollTop = th.scrollHeight;
  loadFamilyView(false);
}
// Family settings: their account, notifications and sign-out only.
function openFamilySettings() {
  const s = sheet(`${sheetHead("Settings")}
    <div class="card" style="display:grid;gap:12px"><h3 style="font-size:17px">Your account</h3>
      <p class="small" style="margin:0">Signed in as <strong>${esc(session.name)}</strong> <span class="muted">(${esc(session.username)} · Family)</span></p>
      <button class="btn secondary" id="stPw">Change my password</button><div id="stPush"></div>
      <button class="btn secondary" id="stSwitch">Switch client</button>
      <button class="btn ghost" id="stOut">Sign out</button></div>`);
  $("#stPw", s.root).onclick = openChangePassword;
  drawPushSetting($("#stPush", s.root));
  $("#stSwitch", s.root).onclick = () => { s.close(); showClients(true); };
  $("#stOut", s.root).onclick = (e) => confirmInline(e.currentTarget, async () => { relay("/logout", {}).catch(() => {}); s.close(); signedOut("You've signed out."); });
}
