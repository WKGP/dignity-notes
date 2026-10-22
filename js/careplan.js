// Dignity Notes: the care plan, shift tasks, the guided care plan.
// Loaded by index.html after app.js, in order; shares its global scope (one app split into files).
"use strict";

/* ---------- care plan ----------
 * Each client's care plan (sections such as Personal care or Skin care, each with an urgency) and
 * key documents (an emergency care plan such as ReSPECT, DNACPR or an Advance Care Directive; risk assessments). Kept on the relay; a copy is kept with the
 * client's notes on this phone so carers can read it without signal. Any carer on the client can write
 * it (each save keeps the previous version); administrators manage the shift tasks and remove documents.
 */
// The standard sections, in the order the guided set-up asks about them (Sam checks the wording).
const PLAN_DEFAULTS = ["About me and what matters to me", "Health conditions", "Medication", "Mobility", "Personal care", "Oral care", "Skin care", "Continence", "Nutrition and hydration", "Night time support", "Communication", "Emotional wellbeing", "Social interests and activities", "Relationships", "Beliefs, culture and faith", "Risks", "Decisions and consent", "Scope of work"];
// Who agreed to a section's wording, kept with each version (Sam: only with the agreement of the client
// or their attorney). "Not yet" never blocks a carer; the section shows "To check with them" until confirmed.
const AGREED_LABEL = { client: "Agreed with the client", attorney: "Agreed with their attorney (LPA)", pending: "Not yet: to check with them" };
let lastAgreed = "";
const agreedSelectHTML = (id, v) => `<label class="f">Who agreed to this?<select id="${id}"><option value="" ${v ? "" : "selected"}>Choose…</option>${Object.entries(AGREED_LABEL).map(([k, l]) => `<option value="${k}" ${v === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
const URGENCY_LABEL = { urgent: "Urgent", important: "Important", non_urgent: "Non urgent" };
const DOC_KIND_LABEL = { respect: "Emergency care plan (ReSPECT, DNACPR, Advance Care Directive)", risk: "Risk assessment", care_plan: "Care plan", medicine: "Medicine label, prescription or box photo", other: "Other document" };
// Care plan wording with "- " lines shown as a proper list (Sam, 2026-10-20).
function planTextHTML(t) {
  if (!t || !t.trim()) return "No details written yet.";
  let out = "", list = [];
  const flush = () => { if (list.length) { out += `<ul style="margin:4px 0;padding-left:18px">${list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`; list = []; } };
  for (const line of t.split("\n")) { const m = line.match(/^\s*[-•*]\s+(.*)$/); if (m) list.push(m[1]); else { flush(); if (line.trim()) out += `<span style="display:block">${esc(line)}</span>`; } }
  flush(); return out;
}
const plan = () => (S.plan && Array.isArray(S.plan.sections) ? S.plan : { sections: [], docs: [] });
const planDocs = () => (S.plan && Array.isArray(S.plan.docs) ? S.plan.docs : []);
const respectDoc = () => planDocs().find((d) => d.kind === "respect");
const isAdminHere = () => !!(session && session.role === "admin");
const urgencyPill = (u) => `<span class="chip ${u === "urgent" ? "incident" : u === "important" ? "follow" : ""}">${esc(URGENCY_LABEL[u] || "Non urgent")}</span>`;
// Fetch the latest care plan. Returns true when it was fetched.
async function loadPlan() {
  if (!cloudOn()) return false;
  const key = KEY;
  try {
    const out = await syncJSON("/plan/get", { client: session.client.id });
    if (KEY !== key) return false;
    loadCups();
    const before = JSON.stringify(S.plan || null);
    S.plan = { sections: (out.plan && out.plan.sections) || [], tasks: (out.plan && out.plan.tasks) || [], updatedAt: (out.plan && out.plan.updatedAt) || 0, updatedBy: out.plan && out.plan.updatedBy, docs: out.docs || [], emergency: out.emergency || null };
    // Documents taken out of the care plan are removed from this phone too.
    const keep = new Set(S.plan.docs.map((d) => d.id)), gone = (S.docCache || []).filter((id) => !keep.has(id));
    if (gone.length) { audioDB.del(gone.map((id) => "doc_" + id)); S.docCache = (S.docCache || []).filter((id) => keep.has(id)); }
    if (JSON.stringify(S.plan) !== before || gone.length) { saveLocal(); if (tab === "today" && !appBusy() && !userIsReading()) render(); }
    return true;
  } catch { return false; }
}
// Taken off a client (or the client was removed): delete this phone's copy of the client's record,
// except anything this person wrote that hasn't reached the cloud yet. That is kept out of sight and
// sent if they're put back on the client; otherwise it's never shown again.
function detachClient() {
  clearDocCache();
  const si = syncInfo(), pend = new Set(unsynced().map(({ kind, r }) => kind + ":" + r.id)), kept = {};
  for (const [kind, arr] of Object.entries(SYNC_KINDS)) kept[arr] = (S[arr] || []).filter((r) => pend.has(kind + ":" + r.id) || (kind === "note" && r.audioId && si.sent["note:" + r.id] && !si.audio[r.audioId]));
  const keptAudio = new Set(kept.notes.map((n) => n.audioId).filter(Boolean));
  audioDB.del([...S.notes.map((n) => n.audioId), ...(S.pending || []).map((p) => p.audioId)].filter((a) => a && !keptAudio.has(a)));
  if (!Object.values(kept).some((a) => a.length)) { recStore.del(KEY); return; }
  Object.assign(S, kept, { detached: true, plan: null, messages: [], contacts: null, meds: null }); saveLocal();
}
// Remove every document copy kept on this phone for the open client (sign-out, reset, client removed).
function clearDocCache() { if (S && S.docCache && S.docCache.length) { audioDB.del(S.docCache.map((id) => "doc_" + id)); S.docCache = []; } }
// Open a document in a viewer inside the app: pictures show straight away; a PDF opens with one more
// tap (the carer's own tap, so the phone never blocks it as a pop-up). Kept on this phone after the
// first time, so it opens without signal.
async function openDoc(id) {
  const d = planDocs().find((x) => x.id === id); if (!d) return toast("That document is no longer in the care plan");
  const s = sheet(`${sheetHead(esc(d.name))}<div id="dvBody"><div class="recorder"><div class="spinner"></div><p class="muted" style="margin:0">Opening…</p></div></div>`);
  let blob = await audioDB.get("doc_" + id);
  if (!blob) {
    if (!cloudOn() || !navigator.onLine) { $("#dvBody", s.root).innerHTML = '<div class="warn">Connect to the internet to open this document the first time. After that it opens without signal.</div>'; return; }
    try {
      const r = await syncFetch("/plan/doc/get", { body: JSON.stringify({ client: session.client.id, id }) }); blob = await r.blob();
      if (await audioDB.put("doc_" + id, blob)) { S.docCache = [...new Set([...(S.docCache || []), id])]; saveLocal(); }
    } catch (e) { if ($("#dvBody", s.root)) $("#dvBody", s.root).innerHTML = `<div class="warn">${e.status === 404 ? "That document isn't in the care plan any more." : "Couldn't open the document. Check the signal and try again."}</div>`; return; }
  }
  const body = $("#dvBody", s.root); if (!body) return; // closed while loading
  const url = urlFor("doc_" + id, new Blob([blob], { type: d.type }));
  body.innerHTML = d.type.startsWith("image/")
    ? `<img src="${url}" alt="${esc(d.name)}" style="width:100%;border-radius:10px;border:1px solid var(--line)">`
    : `<div style="display:grid;gap:10px"><p class="small muted" style="margin:0">${esc(DOC_KIND_LABEL[d.kind] || "Document")} · PDF</p><a class="btn primary block" href="${url}" target="_blank" rel="noopener">Open the PDF</a><button class="btn secondary block" data-sharepdf="${url}" data-name="${esc((d.name || "document").replace(/\.pdf$/i, "") + ".pdf")}">Print or share</button><p class="tiny muted" style="margin:0">It opens in your phone's PDF viewer. Come back to Dignity Notes when you've finished.</p></div>`;
}
// Buttons anywhere with data-opendoc="<id>" open that document.
// A flag row (Today, Family) opens the whole flag.
document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-flag]"); if (b) openFlag(b.dataset.flag); });
// Long texts on Today show a few lines; "Read all" opens them in place.
document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-unclamp]"); if (!b) return; const t = b.previousElementSibling; if (t) t.classList.toggle("clamp"); const shut = t && t.classList.contains("clamp"); b.textContent = shut ? "Read all" : "Show less"; b.setAttribute("aria-expanded", String(!shut)); });
document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-opendoc]"); if (b) { e.preventDefault(); openDoc(b.dataset.opendoc); } });
/* ---------- tasks for each shift ----------
 * Set in the care plan by an administrator (what, when in the day, which days). Carers tick each one
 * Done or Not done (with a reason); a tick is kept like a note and never changed. A task whose part of
 * the day has passed without a tick shows as not ticked, and goes into the handover.
 */
const PERIODS = [["morning", "Morning", 6, 12], ["afternoon", "Afternoon", 12, 18], ["evening", "Evening", 18, 22], ["night", "Night", 22, 30]];
const periodLabel = (p) => (PERIODS.find((x) => x[0] === p) || [, "Any time"])[1];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// The care day and part of the day for a moment: a night (22:00 to 06:00) belongs to the day it started.
function careSlot(ts = Date.now()) {
  const d = new Date(ts), h = d.getHours();
  if (h < 6) { const y = new Date(d); y.setDate(y.getDate() - 1); return { day: dayKey(y), dow: y.getDay(), period: "night" }; }
  return { day: dayKey(d), dow: d.getDay(), period: PERIODS.find(([, , a, b]) => h >= a && h < b)[0] };
}
const planTasks = () => (Array.isArray(plan().tasks) ? plan().tasks : []);
// The latest tick wins: a mistaken tick is corrected by a newer one (ticks themselves never change).
const taskTick = (taskId, day) => (S.tasks || []).filter((t) => t.taskId === taskId && t.day === day).reduce((best, t) => (!best || t.ts >= best.ts ? t : best), null) || undefined;
// Every time a task falls due between two moments: { t, day, start, end } (an "any time" task spans its
// whole care day, 06:00 to 06:00). Clock changes are handled by building times from calendar dates.
function taskOccurrences(from, to) {
  const out = [], first = new Date(from); first.setHours(0, 0, 0, 0); first.setDate(first.getDate() - 1);
  for (const d = first; d.getTime() <= to; d.setDate(d.getDate() + 1)) {
    const at = (h) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setHours(h); return x.getTime(); };
    for (const t of planTasks()) {
      if (t.days.length && !t.days.includes(d.getDay())) continue;
      const p = PERIODS.find((x) => x[0] === t.period), start = at(p ? p[2] : 6), end = at(p ? p[3] : 30);
      if (end > from && start < to) out.push({ t, day: dayKey(d), start, end });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
// For Today: what's due now, and what fell due in the last 12 hours without a tick (still tickable,
// against the care day it belonged to, so a night carer's 05:00 task is ticked for that night).
function tasksNow() {
  const now = Date.now(), slot = careSlot(now), occ = taskOccurrences(now - 12 * 36e5, now);
  const due = occ.filter((o) => o.start <= now && now < o.end).map((o) => ({ ...o, tick: taskTick(o.t.id, o.day) }));
  const missed = occ.filter((o) => o.end <= now && !taskTick(o.t.id, o.day));
  return { slot, due, missed };
}
function tickTask(o, status, extra = {}) {
  const t = o.t || o, day = o.day || careSlot().day;
  S.tasks.push({ id: uid(), ts: Date.now(), taskId: t.id, title: t.title, day, period: t.period, status, by: stampId(), ...extra });
  save(); render();
  toast(status === "done" ? `Done: ${t.title}` : `Not done: ${t.title}`);
}
function notDoneSheet(o) {
  const t = o.t;
  const s = sheet(`${sheetHead("Not done")}<p class="small" style="margin:0"><strong>${esc(t.title)}</strong></p>
    <label class="f">Why not?<input type="text" id="ndWhy" maxlength="300" placeholder="e.g. Refused, asleep, out with family" autocomplete="off"></label>
    <button class="btn primary block" id="ndSave">Save</button>`);
  $("#ndSave", s.root).onclick = () => { const why = $("#ndWhy", s.root).value.trim(); if (!why) return toast("Say why it wasn't done"); s.close(); tickTask(o, "not_done", { reason: why }); };
  setTimeout(() => $("#ndWhy", s.root)?.focus(), 50);
}
let taskBtns = []; // the occurrences behind the buttons on screen
function tasksCardHTML() {
  if (!planTasks().length) return "";
  const { slot, due, missed } = tasksNow(); taskBtns = [];
  const btns = (o, label = "") => { const i = taskBtns.push(o) - 1; return `<div class="row" style="gap:6px;margin-top:6px">${label}<button class="btn secondary" data-tdone="${i}">Done</button><button class="btn ghost" data-tnot="${i}">Not done</button></div>`; };
  const row = (o, tick) => `<div class="item"><div class="body"><div><strong>${esc(o.t.title)}</strong>${o.day !== slot.day || (o.t.period !== slot.period && o.t.period !== "any") ? ` <span class="muted small">· ${esc(periodLabel(o.t.period))}${o.day !== slot.day ? " (" + esc(dayLabel(o.start)) + ")" : ""}</span>` : ""}</div>
    ${tick ? `<div class="small ${tick.status === "done" ? "" : "muted"}">${tick.status === "done" ? "Done" : "Not done: " + esc(tick.reason || "")} · ${esc(carer(tick.by).name)} ${fmtTime(tick.ts)} <button class="link small" data-tchange="${taskBtns.length}">Change</button></div><div hidden data-tchangebox="${taskBtns.length}">${btns(o)}</div>` : btns(o)}</div></div>`;
  const open = due.filter((x) => !x.tick).length + missed.length;
  return `<div class="card"><div class="card-h"><h3>Tasks this shift</h3><span class="muted small">${esc(periodLabel(slot.period))}${open ? ` · ${open} to tick` : " · all ticked"}</span></div>
    <div class="list">${due.length ? due.map((x) => row(x, x.tick)).join("") : '<div class="empty">No tasks for this part of the day.</div>'}</div>
    ${missed.length ? `<div class="warn small" style="margin-top:10px">Not ticked from earlier:</div><div class="list">${missed.map((x) => row(x)).join("")}</div>` : ""}</div>`;
}
function bindTasks(root) {
  root.querySelectorAll("[data-tdone]").forEach((b) => (b.onclick = () => { const o = taskBtns[+b.dataset.tdone]; if (o) tickTask(o, "done"); }));
  root.querySelectorAll("[data-tnot]").forEach((b) => (b.onclick = () => { const o = taskBtns[+b.dataset.tnot]; if (o) notDoneSheet(o); }));
  root.querySelectorAll("[data-tchange]").forEach((b) => (b.onclick = () => { const box = root.querySelector(`[data-tchangebox="${b.dataset.tchange}"]`); if (box) { box.hidden = false; b.hidden = true; } }));
}
// For the handover: every task that fell due during this shift (since the last handover) and wasn't
// done: not ticked, ticked "not done" (the latest tick), or due now and not ticked yet.
function tasksMissedForHandover() {
  const now = Date.now(), out = [];
  for (const o of taskOccurrences(shiftStart(), now)) {
    const tick = taskTick(o.t.id, o.day), when = `${periodLabel(o.t.period)}${o.day !== careSlot(now).day ? ", " + dayLabel(o.start).toLowerCase() : ""}`;
    if (tick && tick.status === "done") continue;
    if (tick) out.push(`${o.t.title} (${when}): not done (${tick.reason || "no reason given"})`);
    else out.push(`${o.t.title} (${when})${o.end > now ? ": not ticked yet" : ": not ticked"}`);
  }
  return [...new Set(out)];
}
// Admin: the shift tasks (part of the care plan, saved with it).
async function openTasksEdit() {
  if (!navigator.onLine || !(await loadPlan())) return toast("Connect to the internet to edit the tasks, so you start from the latest version");
  const base = plan().updatedAt || 0;
  let rows = planTasks().map((t) => ({ ...t, days: [...t.days] }));
  const s = sheet(`${sheetHead("Shift tasks")}<p class="small muted" style="margin:0">What carers should do, and when in the day. Leave all days unticked for every day. Carers tick each task Done or Not done. Pilot: made-up details only.</p>
    <div id="tkRows" style="display:grid;gap:12px"></div>
    <button class="link" id="tkAdd" style="justify-self:start">+ Add a task</button>
    <button class="btn primary block" id="tkSave">Save tasks</button>`, { guard: () => true });
  const box = $("#tkRows", s.root);
  const read = () => { rows = [...box.querySelectorAll("[data-row]")].map((el, i) => ({ id: rows[i] && rows[i].id, title: $(".tkT", el).value.trim(), period: $(".tkP", el).value, days: [...el.querySelectorAll("[data-day]")].filter((c) => c.checked).map((c) => +c.dataset.day), section: rows[i] ? rows[i].section : "" })); };
  const draw = () => {
    box.innerHTML = rows.map((r, i) => `<div class="card" data-row="${i}" style="box-shadow:none;display:grid;gap:8px">
      <input class="tkT" type="text" value="${esc(r.title)}" maxlength="120" placeholder="e.g. Morning medication" aria-label="Task">
      <select class="tkP" aria-label="When">${[...PERIODS.map(([k, l, a, b]) => [k, `${l} (${String(a).padStart(2, "0")}:00 to ${String(b % 24).padStart(2, "0")}:00)`]), ["any", "Any time of day"]].map(([k, l]) => `<option value="${k}" ${r.period === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
      <div class="row" style="gap:6px;flex-wrap:wrap">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label class="small" style="display:flex;gap:4px;align-items:center"><input type="checkbox" data-day="${d}" ${r.days.includes(d) ? "checked" : ""}>${DAY_NAMES[d]}</label>`).join("")}</div>
      <button class="link small" data-rm="${i}" style="justify-self:start;color:var(--incident)">Remove task</button></div>`).join("") || '<div class="empty">No tasks yet.</div>';
    box.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => { read(); rows.splice(+b.dataset.rm, 1); draw(); }));
  };
  draw();
  $("#tkAdd", s.root).onclick = () => { read(); rows.push({ title: "", period: careSlot().period, days: [] }); draw(); box.lastElementChild.querySelector(".tkT").focus(); };
  $("#tkSave", s.root).onclick = async (e) => {
    read(); const tasks = rows.filter((r) => r.title);
    e.currentTarget.disabled = true;
    try { const out = await syncJSON("/plan/save", { client: session.client.id, sections: plan().sections, tasks, baseUpdatedAt: base }); S.plan = { ...plan(), ...out.plan, docs: planDocs() }; saveLocal(); s.close(); render(); toast("Tasks saved"); }
    catch (err) { toast(err.message || "Couldn't save the tasks"); $("#tkSave", s.root).disabled = false; }
  };
}

function openPlan() {
  loadPlan();
  const p = plan(), docs = planDocs(), r = respectDoc();
  const s = sheet(`${sheetHead(`Care plan · ${esc(S.client.name)}`)}
    ${r ? `<button class="btn primary block" data-opendoc="${esc(r.id)}">Emergency care plan</button>` : ""}
    ${p.sections.length ? [...p.sections].sort((a, b) => ({ urgent: 0, important: 1 }[a.urgency] ?? 2) - ({ urgent: 0, important: 1 }[b.urgency] ?? 2)).map((x) => `<details class="card" style="box-shadow:none"><summary><strong>${esc(x.title)}</strong> ${urgencyPill(x.urgency)}${x.agreed === "pending" ? ' <span class="chip follow">To check with them</span>' : ""}</summary><p class="small" style="margin:8px 0 0">${planTextHTML(x.text)}</p>${x.agreed ? `<p class="tiny muted" style="margin:6px 0 0">${esc(AGREED_LABEL[x.agreed])}${x.agreed !== "pending" && x.agreedAt ? " · " + fmtDay(x.agreedAt) : ""}</p>` : ""}</details>`).join("")
      : '<div class="empty">No sections yet.</div>'}
    <div class="card" style="box-shadow:none;display:grid;gap:6px"><h3 style="font-size:17px;margin:0">Shift tasks</h3>
      ${planTasks().length ? planTasks().map((t) => `<div class="small"><strong>${esc(t.title)}</strong> <span class="muted">· ${esc(periodLabel(t.period))}${t.days.length ? " · " + t.days.map((d) => DAY_NAMES[d]).join(", ") : ""}</span></div>`).join("") : '<div class="small muted">No tasks yet.</div>'}
      ${isAdminHere() ? '<button class="link small" id="tkEdit" style="justify-self:start">Edit shift tasks</button>' : ""}</div>
    <div class="card" style="box-shadow:none;display:grid;gap:8px"><h3 style="font-size:17px;margin:0">Documents</h3>
      ${docs.length ? docs.map((d) => `<div class="row" style="justify-content:space-between;align-items:center;gap:8px"><button class="link" data-opendoc="${esc(d.id)}" style="text-align:left">${esc(d.name)}</button><span class="tiny muted">${esc(DOC_KIND_LABEL[d.kind] || "Document")}</span>${canEditPlan() && d.kind === "care_plan" ? `<button class="link small" data-filldoc="${esc(d.id)}">Fill the care plan from this</button>` : ""}${isAdminHere() || (d.mine && Date.now() - (d.uploadedAt || 0) < 24 * 3600000) ? `<button class="link small" data-deldoc="${esc(d.id)}" style="color:var(--incident)">Remove</button>` : ""}</div>`).join("") : '<p class="small muted" style="margin:0">No documents yet.</p>'}
    </div>
    ${p.updatedAt ? `<p class="tiny muted" style="margin:0">Last changed ${fmtDay(p.updatedAt)} ${fmtTime(p.updatedAt)}${p.updatedBy ? " by " + esc(p.updatedBy) : ""}.${isAdminHere() && cloudOn() ? ` <button class="link tiny" id="plHist">Earlier versions</button>` : ""}</p>` : ""}
    ${canEditPlan() ? `${planDoneCount() < PLAN_DEFAULTS.length ? `<button class="btn primary block" id="plGuide">${planDoneCount() ? "Finish it step by step" : "Set it up step by step"} (${planDoneCount()} of ${PLAN_DEFAULTS.length} done)</button>` : ""}
      <button class="btn secondary block" id="plReports">Reports</button>
      <div class="row"><button class="btn secondary" id="plEdit">${p.sections.length ? "Edit care plan" : "Write it all at once"}</button><button class="btn secondary" id="plUpload">Add a document</button></div>` : ""}`);
  if ($("#plGuide", s.root)) $("#plGuide", s.root).onclick = () => { s.close(); openPlanGuide(); };
  if ($("#plReports", s.root)) $("#plReports", s.root).onclick = () => { s.close(); openReports(); };
  if ($("#plHist", s.root)) $("#plHist", s.root).onclick = () => openPlanHistory();
  s.root.querySelectorAll("[data-filldoc]").forEach((b) => (b.onclick = () => { s.close(); openPlanFromDoc(b.dataset.filldoc); }));
  if ($("#plEdit", s.root)) $("#plEdit", s.root).onclick = () => { s.close(); openPlanEdit(); };
  if ($("#tkEdit", s.root)) $("#tkEdit", s.root).onclick = () => { s.close(); openTasksEdit(); };
  if ($("#plUpload", s.root)) $("#plUpload", s.root).onclick = () => { s.close(); openDocUpload(); };
  s.root.querySelectorAll("[data-deldoc]").forEach((b) => (b.onclick = () => confirmInline(b, async () => {
    try { await syncJSON("/plan/doc/delete", { client: session.client.id, id: b.dataset.deldoc }); audioDB.del(["doc_" + b.dataset.deldoc]); S.plan.docs = planDocs().filter((d) => d.id !== b.dataset.deldoc); saveLocal(); s.close(); openPlan(); toast("Document removed"); }
    catch (e) { toast(e.message); }
  })));
}
// Earlier versions of the care plan (administrators): every save keeps the one it replaced. Restoring
// one saves it as the newest version, so the version it replaces is kept too and nothing is lost.
async function openPlanHistory() {
  const seen = plan().updatedAt || 0; // restore only over the plan as it was when this list was opened
  const s = sheet(`${sheetHead("Earlier versions")}<div id="phBody" style="display:grid;gap:8px"><div class="recorder"><div class="spinner"></div></div></div>`, { onClose: () => openPlan() });
  let versions;
  try { versions = (await syncJSON("/plan/history", { client: session.client.id })).versions || []; }
  catch (e) { const b = $("#phBody", s.root); if (b) b.innerHTML = `<p class="warn">${esc(e.message || "Couldn't load them. Try again when you have signal.")}</p>`; return; }
  const b = $("#phBody", s.root); if (!b) return;
  b.innerHTML = versions.length ? `<p class="small muted" style="margin:0">Each one is the care plan as it was before someone changed it. Tap one to read it.</p>${versions.map((v, i) => `<button class="card" data-phv="${i}" style="box-shadow:none;text-align:left;display:grid;gap:2px"><strong class="small">${esc(fmtDay(v.savedAt))} ${esc(fmtTime(v.savedAt))}${v.savedBy ? " · " + esc(v.savedBy) : ""}</strong><span class="tiny muted">${v.sections.length} section${v.sections.length === 1 ? "" : "s"} · replaced ${esc(fmtDay(v.replacedAt))} ${esc(fmtTime(v.replacedAt))}${v.replacedBy ? " by " + esc(v.replacedBy) : ""}</span></button>`).join("")}`
    : '<div class="empty">No earlier versions yet. One is kept each time the care plan is changed.</div>';
  if (versions.length >= 50) b.insertAdjacentHTML("beforeend", '<p class="tiny muted" style="margin:0">Showing the latest 50.</p>');
  b.querySelectorAll("[data-phv]").forEach((x) => (x.onclick = () => openPlanVersion(versions[+x.dataset.phv], seen)));
}
function openPlanVersion(v, seen) {
  const s = sheet(`${sheetHead("Earlier version")}
    <p class="small" style="margin:0">As saved ${esc(fmtDay(v.savedAt))} ${esc(fmtTime(v.savedAt))}${v.savedBy ? " by " + esc(v.savedBy) : ""}. Replaced ${esc(fmtDay(v.replacedAt))} ${esc(fmtTime(v.replacedAt))}${v.replacedBy ? " by " + esc(v.replacedBy) : ""}.</p>
    ${v.sections.length ? v.sections.map((x) => `<details class="card" style="box-shadow:none"><summary><strong>${esc(x.title)}</strong> ${urgencyPill(x.urgency)}</summary><p class="small" style="margin:8px 0 0">${planTextHTML(x.text)}</p></details>`).join("") : '<div class="empty">This version had no sections.</div>'}
    ${v.tasks ? `<p class="small muted" style="margin:0">Shift tasks: ${v.tasks.length ? v.tasks.map((t) => esc(t.title)).join(", ") : "none"}.</p>` : ""}
    <button class="btn secondary block" id="pvRestore">Restore this version</button>
    <p class="tiny muted" style="margin:0">Restoring makes this the care plan again${v.tasks ? ", with its shift tasks" : " (today's shift tasks stay)"}. The current version is kept under Earlier versions, so it can be brought back.</p>`, { onClose: () => (restored ? openPlan() : openPlanHistory()) });
  let restored = false;
  $("#pvRestore", s.root).onclick = (e) => confirmInline(e.currentTarget, async () => {
    const btn = $("#pvRestore", s.root); if (btn) { btn.disabled = true; btn.textContent = "Restoring…"; }
    try {
      // If someone changed the plan since the list was opened, the relay refuses: look again first.
      const out = await syncJSON("/plan/restore", { client: session.client.id, replacedAt: v.replacedAt, baseUpdatedAt: seen });
      S.plan = { ...plan(), ...out.plan, docs: planDocs() }; saveLocal(); render();
      restored = true; s.close(); toast("Earlier version restored");
    } catch (err) { if (btn) { btn.disabled = false; btn.textContent = "Restore this version"; } toast(err.message || "Couldn't restore it. Try again."); }
  }, "Tap again to restore");
}
async function openPlanEdit() {
  // Start from the latest saved plan, so a phone that hadn't loaded it never overwrites it.
  if (!navigator.onLine || !(await loadPlan())) return toast("Connect to the internet to edit the care plan, so you start from the latest version");
  const base = plan().updatedAt || 0;
  let rows = plan().sections.map((x) => ({ ...x }));
  for (const t of PLAN_DEFAULTS) if (!rows.some((r) => r.title === t)) rows.push({ title: t, urgency: "non_urgent", text: "" }); // empty ones aren't kept
  const s = sheet(`${sheetHead("Edit care plan")}<p class="small muted" style="margin:0">One section for each area of care. Write what carers need to know and do. Pilot: use made-up details only.</p><div id="plRows" style="display:grid;gap:12px"></div>
    <button class="link" id="plAdd" style="justify-self:start">+ Add a section</button>
    ${agreedSelectHTML("plAgree", lastAgreed)}
    <button class="btn primary block" id="plSave">Save care plan</button>`, { guard: () => true });
  const box = $("#plRows", s.root);
  const read = () => { rows = [...box.querySelectorAll("[data-row]")].map((el) => ({ ...rows[+el.dataset.row], title: $(".plT", el).value.trim(), urgency: $(".plU", el).value, text: $(".plX", el).value })); };
  const draw = () => {
    box.innerHTML = rows.map((r, i) => `<div class="card" data-row="${i}" style="box-shadow:none;display:grid;gap:8px">
      <div class="row" style="gap:8px"><input class="plT" type="text" value="${esc(r.title)}" maxlength="60" aria-label="Section name" style="flex:1 1 160px"><select class="plU" aria-label="Urgency">${Object.entries(URGENCY_LABEL).map(([k, l]) => `<option value="${k}" ${r.urgency === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <textarea class="plX grow" maxlength="4000" placeholder="What carers need to know and do" aria-label="What carers need to know and do" style="min-height:80px">${esc(r.text)}</textarea>
      <button class="link small" data-rm="${i}" style="justify-self:start;color:var(--incident)">Remove section</button></div>`).join("");
    box.querySelectorAll("textarea.grow").forEach(autoGrow);
    box.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => { read(); rows.splice(+b.dataset.rm, 1); draw(); }));
  };
  draw();
  $("#plAdd", s.root).onclick = () => { read(); rows.push({ title: "", urgency: "non_urgent", text: "" }); draw(); box.lastElementChild.querySelector(".plT").focus(); };
  $("#plSave", s.root).onclick = async (e) => {
    read();
    const untitled = rows.findIndex((r) => !r.title && r.text.trim());
    if (untitled >= 0) { box.querySelectorAll(".plT")[untitled].focus(); return toast("Give this section a name, or remove it"); }
    const before = new Map(plan().sections.map((x) => [x.title, x])), ag = $("#plAgree", s.root).value;
    const sections = rows.filter((r) => r.title && (r.text.trim() || !PLAN_DEFAULTS.includes(r.title)))
      .map((r) => { const o = before.get(r.title); return !o || o.text !== r.text || o.urgency !== r.urgency || (r.agreed === "pending" && ag && ag !== "pending") ? { ...r, agreed: ag, agreedAt: Date.now() } : r; }); // a "to check" section is confirmed too
    if (!ag && sections.some((r) => r.agreed === "")) { $("#plAgree", s.root).focus(); return toast("Say who agreed to these changes, or choose Not yet"); }
    lastAgreed = ag || lastAgreed;
    e.currentTarget.disabled = true;
    try { const out = await syncJSON("/plan/save", { client: session.client.id, sections, baseUpdatedAt: base }); S.plan = { ...plan(), ...out.plan, docs: planDocs() }; saveLocal(); s.close(); render(); toast("Care plan saved"); }
    catch (err) { toast(err.message || "Couldn't save the care plan"); $("#plSave", s.root).disabled = false; }
  };
}
function openDocUpload(kindPreset) {
  const s = sheet(`${sheetHead("Add a document")}
    <div class="warn small">Pilot: upload made-up documents only, never a real person's emergency care plan or assessments.</div>
    <label class="f">Type<select id="duKind">${Object.entries(DOC_KIND_LABEL).map(([k, l]) => `<option value="${k}" ${k === kindPreset ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label class="f">Name<input type="text" id="duName" maxlength="80" placeholder="e.g. Moving and handling risk assessment"></label>
    <label class="f">File (PDF, JPG or PNG, up to 10 MB)<input type="file" id="duFile" accept="application/pdf,image/jpeg,image/png"></label>
    <button class="btn primary block" id="duGo">Upload</button>`);
  $("#duFile", s.root).onchange = (e) => { const f = e.target.files[0]; if (f && !$("#duName", s.root).value) $("#duName", s.root).value = f.name.replace(/\.[^.]+$/, ""); };
  $("#duGo", s.root).onclick = async (e) => {
    const f = $("#duFile", s.root).files[0]; if (!f) return toast("Choose a file first");
    if (!/^(application\/pdf|image\/jpeg|image\/png)$/.test(f.type)) return toast("Documents must be a PDF, JPG or PNG");
    if (f.size > 10 * 1024 * 1024) return toast("Documents can be up to 10 MB");
    const kind = $("#duKind", s.root).value, name = $("#duName", s.root).value.trim() || f.name;
    e.currentTarget.disabled = true; e.currentTarget.textContent = "Uploading…";
    try {
      const r = await syncFetch(`/plan/doc/put?client=${encodeURIComponent(session.client.id)}&kind=${encodeURIComponent(kind)}&name=${encodeURIComponent(name)}`, { headers: { "Content-Type": f.type }, body: f });
      const { doc } = await r.json();
      S.plan = { ...plan(), docs: [doc, ...planDocs()] }; saveLocal(); s.close(); render(); toast("Document added");
      if (kind === "care_plan" && canEditPlan()) {
        const q = sheet(`${sheetHead("Fill the care plan from this?")}<p class="small" style="margin:0">The AI can read <strong>${esc(doc.name)}</strong> and copy what it says into the care plan sections, for you to check before anything is saved. The document is sent to our AI provider to be read.</p>
          <button class="btn primary block" id="fqYes">Fill the care plan from this</button><button class="btn ghost block" id="fqNo">Not now</button>`);
        $("#fqYes", q.root).onclick = () => { q.close(); openPlanFromDoc(doc.id); };
        $("#fqNo", q.root).onclick = () => q.close();
      }
    } catch (err) { toast(err.message || "Couldn't upload the document"); const b = $("#duGo", s.root); if (b) { b.disabled = false; b.textContent = "Upload"; } }
  };
}
/* ---------- guided care plan ----------
 * Private live-in care often starts with no care plan (Sam, 2026-10-14). The carer goes through the
 * standard sections one at a time: says what they know, the AI writes it up in care-plan wording, and
 * the carer checks and changes it before saving. Each section is saved as it's done, so stopping part
 * way loses nothing. An existing care plan document can fill the sections instead, as a draft to check.
 */
const PLAN_ASK = {
  "About me and what matters to me": "Tell me about them: their life, what matters to them, what makes a good day, what they like to be called, their routines, and what they can do on their own.",
  "Health conditions": "What health conditions do they have, and what should carers look out for?",
  Medication: "How are medicines handled? Who orders and collects them, and what help is needed to take them? (Each medicine goes in the medicines chart.)",
  Mobility: "How do they move about? Any walking aids, equipment, help to stand, or falls?",
  "Personal care": "What help do they need to wash, dress and use the toilet, and how do they like it done?",
  "Oral care": "How are their teeth or dentures looked after?",
  "Skin care": "Any skin problems, pressure areas, creams, or changes of position?",
  Continence: "Any help needed with continence? Pads, a catheter, or times to offer the toilet?",
  "Nutrition and hydration": "What do they like to eat and drink? Any special diet, allergies, softer food, or help needed?",
  "Night time support": "What happens at night? Bedtime routine, waking, and any help needed?",
  Communication: "How do they communicate best? Hearing, sight, memory, language, aids? How do they show pain or distress, and what helps?",
  "Emotional wellbeing": "What worries or upsets them? What comforts them, and how is it best to reassure them?",
  "Social interests and activities": "What do they enjoy doing? Hobbies, outings, routines?",
  Relationships: "Who are the important people in their life, and how do they keep in touch?",
  "Beliefs, culture and faith": "Optional: only what they want to share. Any faith, culture or beliefs that matter to them, for example food, prayer, privacy or who gives personal care?",
  Risks: "What risks should carers know about, and what keeps them safe?",
  "Decisions and consent": "Which decisions do they make themselves? Is there a Lasting Power of Attorney, or someone who helps them decide?",
  "Scope of work": "What is the carer there to do, and what is not part of the role?",
};
const canEditPlan = () => !!(session && !session.local && !isFamily());
const planHas = (title) => plan().sections.some((x) => x.title === title && x.text.trim());
const planDoneCount = () => PLAN_DEFAULTS.filter(planHas).length;
// On Today until every standard section has something in it (only once the plan has been fetched).
function planProgressHTML() {
  if (!canEditPlan() || !S.plan || !Array.isArray(S.plan.sections)) return "";
  const done = planDoneCount(); if (done >= PLAN_DEFAULTS.length) return "";
  return `<div class="card" style="display:flex;gap:10px;align-items:center;justify-content:space-between"><span class="small"><strong>Care plan:</strong> ${done} of ${PLAN_DEFAULTS.length} sections done</span><button class="btn secondary" id="plGuideGo" style="flex:0 0 auto">${done ? "Finish it" : "Start it"}</button></div>`;
}
// Saves one section (adding it if new) over the latest version. Returns the new updatedAt.
async function savePlanSection(title, text, urgency, base, agreed) {
  const sections = plan().sections.map((x) => ({ ...x })), i = sections.findIndex((x) => x.title === title), row = { text, urgency, agreed, agreedAt: Date.now() };
  if (i >= 0) sections[i] = { ...sections[i], ...row }; else sections.push({ title, ...row });
  const out = await syncJSON("/plan/save", { client: session.client.id, sections, baseUpdatedAt: base });
  S.plan = { ...plan(), ...out.plan, docs: planDocs() }; saveLocal();
  return out.plan.updatedAt;
}
// Offered straight after a client is added.
function offerPlanSetup() {
  const s = sheet(`${sheetHead("Set up the care plan?")}
    <p class="small" style="margin:0">A care plan tells every carer what ${esc(S.client.name)} needs and how they like things done. It takes about 20 minutes, and you can stop at any time: each part is saved as you go.</p>
    <button class="btn primary block" id="ofGuide">Go through it step by step</button>
    <button class="btn secondary block" id="ofDoc">Copy it from a care plan document</button>
    <button class="btn ghost block" id="ofLater">Later</button>`);
  $("#ofGuide", s.root).onclick = () => { s.close(); openPlanGuide(); };
  $("#ofDoc", s.root).onclick = () => { s.close(); openDocUpload("care_plan"); };
  $("#ofLater", s.root).onclick = () => s.close();
}
async function openPlanGuide() {
  if (!navigator.onLine || !(await loadPlan())) return toast("Connect to the internet to write the care plan, so you start from the latest version");
  let base = plan().updatedAt || 0, i = Math.max(0, PLAN_DEFAULTS.findIndex((t) => !planHas(t))), dict = null, busy = false;
  const s = sheet(`${sheetHead("Care plan step by step")}<div id="pgStep" style="display:grid;gap:10px"></div>`, { guard: () => busy || (dict && dict.busy()) || !!($("#pgWords", s.root) && $("#pgWords", s.root).value.trim()) || !!($("#pgText", s.root) && $("#pgText", s.root).dataset.changed), onClose: () => dict && dict.cancel() });
  const box = $("#pgStep", s.root);
  const draw = () => {
    if (dict) dict.cancel(); dict = null;
    if (i >= PLAN_DEFAULTS.length) {
      const left = PLAN_DEFAULTS.length - planDoneCount();
      box.innerHTML = `<p style="margin:0"><strong>${left ? `That's the end. ${left} section${left === 1 ? " is" : "s are"} still empty` : "All done"}.</strong></p>
        <p class="small muted" style="margin:0">${left ? "You can come back to them any time from Today or the care plan." : "Every carer on " + esc(S.client.name) + " can now read the care plan."} Keep it up to date as things change.</p>
        <button class="btn primary block" id="pgClose">Close</button>`;
      $("#pgClose", box).onclick = () => s.close(); return;
    }
    const title = PLAN_DEFAULTS[i], cur = plan().sections.find((x) => x.title === title) || { text: "", urgency: "non_urgent" };
    box.innerHTML = `<p class="tiny muted" style="margin:0">Section ${i + 1} of ${PLAN_DEFAULTS.length}</p>
      <h3 style="margin:0">${esc(title)}</h3>
      <p class="small" style="margin:0">${esc(PLAN_ASK[title] || "What do carers need to know and do?")}</p>
      <div class="warn small">Pilot: use made-up details only.</div>
      <textarea id="pgWords" rows="3" style="min-height:84px" placeholder="Tap Speak and say what you know, or type it" aria-label="What you know"></textarea>
      <div class="row"><button class="btn ghost" id="pgMic" style="flex:0 0 auto"></button><button class="btn secondary" id="pgWrite">Write it up</button></div>
      <div class="small" id="pgMsg" role="status"></div>
      <label class="f">Care plan wording (check and change it)<textarea id="pgText" class="grow" maxlength="4000" style="min-height:90px" placeholder="What carers need to know and do">${esc(cur.text)}</textarea></label>
      <label class="f">How important is it<select id="pgUrg">${Object.entries(URGENCY_LABEL).map(([k, l]) => `<option value="${k}" ${cur.urgency === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      ${agreedSelectHTML("pgAgree", cur.agreed || lastAgreed)}
      <button class="btn primary block" id="pgSave">Save and next</button>
      <div class="row"><button class="btn ghost" id="pgBack" ${i ? "" : "disabled"}>Back</button><button class="btn ghost" id="pgSkip">Skip for now</button></div>`;
    const words = $("#pgWords", box), text = $("#pgText", box), msg = $("#pgMsg", box);
    autoGrow(text); text.oninput = () => (text.dataset.changed = "1");
    dict = dictation(words, $("#pgMic", box), (t) => (msg.textContent = t), { hint: "Check the words, then tap Write it up.", max: 6000 });
    $("#pgWrite", box).onclick = async (e) => {
      if (dict.busy()) await dict.finish();
      if (!words.value.trim()) return (msg.textContent = "Say or type what you know first.");
      busy = true; e.currentTarget.disabled = true; e.currentTarget.textContent = "Writing…"; msg.textContent = "";
      try {
        const out = await syncJSON("/plan/draft", { client: session.client.id, clientName: S.client.name, section: title, words: words.value.trim(), existing: text.value }, 120000);
        if (!text.isConnected) { busy = false; return; } // closed meanwhile
        text.value = out.text; text.dataset.changed = "1"; autoGrow(text); $("#pgUrg", box).value = out.urgency;
        words.value = ""; msg.textContent = "Written up below. Check it is right and nothing has been added, then Save and next.";
      } catch (err) { msg.textContent = err.message || "Couldn't write it up. You can type it below instead."; }
      busy = false; const b = $("#pgWrite", box); if (b) { b.disabled = false; b.textContent = "Write it up"; }
    };
    const doSave = async () => {
      const t = text.value.trim(), u = $("#pgUrg", box).value, ag = $("#pgAgree", box).value;
      if (!t || (t === cur.text.trim() && u === cur.urgency && ag === (cur.agreed || ag))) { i++; return draw(); } // nothing new to save
      if (!ag) { $("#pgAgree", box).focus(); return toast("Say who agreed to this, or choose Not yet"); }
      lastAgreed = ag;
      busy = true; $("#pgSave", box).disabled = true;
      try {
        try { base = await savePlanSection(title, t, u, base, ag); }
        catch (err) {
          // Someone saved another part meanwhile: save over the new version if this section is as it was.
          if (err.status !== 409 || !(await loadPlan())) throw err;
          const now = plan().sections.find((x) => x.title === title) || { text: "", urgency: "non_urgent" };
          if (now.text !== cur.text) throw new Error("Someone else changed this section meanwhile. Copy your wording, then go Back and Forward to see theirs.");
          base = await savePlanSection(title, t, u, plan().updatedAt || 0, ag);
        }
        busy = false; i++; draw(); toast(`${title} saved`);
      } catch (err) { busy = false; toast(err.message || "Couldn't save this section"); const b = $("#pgSave", box); if (b) b.disabled = false; }
    };
    // Words said but not written up yet: a second tap saves without them.
    $("#pgSave", box).onclick = (e) => busy ? null : (words.value.trim() && !dict.busy() ? confirmInline(e.currentTarget, doSave, "Not written up yet. Tap again to save without it") : dict.busy() ? (msg.textContent = "Tap Stop, then Write it up.") : doSave());
    // Moving on keeps nothing unsaved: a second tap is needed if words or wording would be lost.
    const leave = (e, step) => { if (busy) return; const lose = words.value.trim() || text.value.trim() !== cur.text.trim(); if (lose) return confirmInline(e.currentTarget, () => { i += step; draw(); }, "Not saved. Tap again"); i += step; draw(); };
    $("#pgSkip", box).onclick = (e) => leave(e, 1);
    $("#pgBack", box).onclick = (e) => leave(e, -1);
  };
  draw();
}
// Fills the standard sections from a care plan document, for the carer to check section by section.
async function openPlanFromDoc(docId) {
  if (!navigator.onLine || !(await loadPlan())) return toast("Connect to the internet to fill the care plan, so you start from the latest version");
  const doc = planDocs().find((d) => d.id === docId); if (!doc) return toast("That document isn't there any more");
  const base = plan().updatedAt || 0; let busy = true;
  const s = sheet(`${sheetHead("Fill the care plan from a document")}<div id="fdBox" style="display:grid;gap:12px"><p class="small" style="margin:0">Reading <strong>${esc(doc.name)}</strong>… This can take a minute.</p></div>`, { guard: () => busy || !!$("#fdSave", s.root) });
  const box = $("#fdBox", s.root);
  let out;
  try { out = await syncJSON("/plan/fromdoc", { client: session.client.id, clientName: S.client.name, id: docId }, 240000); }
  catch (err) { busy = false; box.innerHTML = `<p class="small" style="margin:0">${esc(err.message || "Couldn't read the document.")}</p><button class="btn secondary block" id="fdClose">Close</button>`; $("#fdClose", box).onclick = () => s.close(); return; }
  busy = false;
  const found = (out.sections || []).filter((x) => PLAN_DEFAULTS.includes(x.title) && x.text.trim());
  if (out.other && out.other.trim()) found.push({ title: "Other information", text: out.other.trim(), urgency: "non_urgent", other: true });
  if (!found.length) { box.innerHTML = `<p class="small" style="margin:0">Nothing in the document matched the care plan sections. You can write it step by step instead.</p><button class="btn secondary block" id="fdClose">Close</button>`; $("#fdClose", box).onclick = () => s.close(); return; }
  const curOf = (t) => plan().sections.find((x) => x.title === t);
  box.innerHTML = `<p class="small" style="margin:0">The AI copied these from the document. <strong>Check each one against the document</strong> and change anything that's wrong before saving. The AI can miss things, and anything it missed isn't shown here, so look through the document for it too. The document stays in the care plan.</p>
    ${found.map((x, k) => { const cur = curOf(x.title); return `<div class="card" data-fd="${k}" style="box-shadow:none;display:grid;gap:8px">
      <div class="row" style="justify-content:space-between;gap:8px"><strong>${esc(x.title)}</strong><select class="fdU" aria-label="How important">${Object.entries(URGENCY_LABEL).map(([u, l]) => `<option value="${u}" ${x.urgency === u ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <textarea class="fdX grow" maxlength="4000" style="min-height:80px" aria-label="${esc(x.title)}">${esc(x.text)}</textarea>
      ${cur && cur.text.trim() ? `<details><summary class="small">What the care plan says now</summary><p class="small muted" style="white-space:pre-line;margin:6px 0 0">${esc(cur.text)}</p></details>
        <label class="small" style="display:flex;gap:6px;align-items:center"><input type="radio" name="fd${k}" value="use"> Use the document's</label><label class="small" style="display:flex;gap:6px;align-items:center"><input type="radio" name="fd${k}" value="keep" checked> Keep what's there now</label>`
        : `<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="fdUse" checked> Add to the care plan</label>`}</div>`; }).join("")}
    ${agreedSelectHTML("fdAgree", lastAgreed)}
    <button class="btn primary block" id="fdSave">Save to the care plan</button>`;
  box.querySelectorAll("textarea.grow").forEach(autoGrow);
  $("#fdSave", box).onclick = async (e) => {
    const ag = $("#fdAgree", box).value; if (!ag) { $("#fdAgree", box).focus(); return toast("Say who agreed to these, or choose Not yet"); }
    lastAgreed = ag;
    const sections = plan().sections.map((x) => ({ ...x }));
    box.querySelectorAll("[data-fd]").forEach((el) => {
      const x = found[+el.dataset.fd], radio = el.querySelector("input[type=radio]:checked"), tick = el.querySelector(".fdUse");
      if ((radio && radio.value === "keep") || (tick && !tick.checked)) return;
      const text = $(".fdX", el).value.trim(); if (!text) return;
      const j = sections.findIndex((y) => y.title === x.title), row = { title: x.title, text, urgency: $(".fdU", el).value, agreed: ag, agreedAt: Date.now() };
      if (j >= 0) sections[j] = row; else sections.push(row);
    });
    busy = true; e.currentTarget.disabled = true;
    try { const o = await syncJSON("/plan/save", { client: session.client.id, sections, baseUpdatedAt: base }); S.plan = { ...plan(), ...o.plan, docs: planDocs() }; saveLocal(); busy = false; $("#fdSave", box).remove(); s.close(); render(); toast("Care plan saved"); }
    catch (err) { busy = false; toast(err.message || "Couldn't save the care plan"); const b = $("#fdSave", box); if (b) b.disabled = false; }
  };
}
