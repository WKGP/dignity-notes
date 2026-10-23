// Dignity Notes: catching up after time away, the Log, Handover and Family tabs, attendance.
// Loaded by index.html after app.js, in order; shares its global scope (one app split into files).
"use strict";

/* ---------- catching up after time away ----------
 * A carer new to the client, or back after a number of days away (7 unless an administrator sets it;
 * Sam, 2026-10-16), sees what changed since they were last here at the top of Today: the care plan,
 * medicines, open flags, incident reports and skin. "I've read this" and "I've checked the skin" are
 * recorded with their name and time. It never stops them recording; it stays until both are ticked.
 */
const myActivity = (me) => Math.max(0, ...S.notes.filter((n) => n.carerId === me && !isExample(n)).map((n) => n.ts), ...S.handovers.filter((h) => h.fromId === me && !isExample(h)).map((h) => h.ts), ...(S.acks || []).filter((a) => a.by === me).map((a) => a.ts), ...(S.doses || []).filter((x) => x.by === me).map((x) => x.ts));
function catchupState() {
  if (!session || isFamily() || !session.client) return null;
  if (cloudOn() && !syncState.pulled) return null; // wait until this phone has the latest record
  const me = stampId(), c = S.catchup;
  if (c && c.me === me && c.client === session.client.id) {
    const done = new Set((S.acks || []).filter((a) => a.by === me && a.ts >= c.at).map((a) => a.what));
    if (!(done.has("read") && done.has("skin"))) return { ...c, done };
  }
  const last = myActivity(me), days = (session.client.catchupDays || 7);
  if (last && Date.now() - last < days * 864e5) return null;
  if (!last && !S.notes.some((n) => !isExample(n))) return null; // a brand-new client: nothing to catch up on
  S.catchup = { me, client: session.client.id, at: Date.now(), since: last, isNew: !last }; saveLocal();
  return { ...S.catchup, done: new Set() };
}
function catchupHTML() {
  const c = catchupState(); if (!c) return "";
  const since = c.since || 0, li = [];
  const p = plan();
  const names = (ms) => { const u = [...new Set(ms.map(medName))]; return esc(u.slice(0, 3).join(", ")) + (u.length > 3 ? ` and ${u.length - 3} more` : ""); };
  if (p.sections.length && (p.updatedAt || 0) > since) li.push(`Care plan${since ? ` changed ${esc(fmtDay(p.updatedAt))}` : ""}${p.updatedBy ? ` by ${esc(p.updatedBy)}` : ""}: <button class="link small" data-cu="plan">read it</button>`);
  const meds = medsState().list, newMeds = meds.filter((m) => !m.stoppedAt && (m.createdAt || 0) > since), chMeds = meds.filter((m) => !m.stoppedAt && (m.createdAt || 0) <= since && (m.updatedAt || 0) > since), stopped = meds.filter((m) => m.stoppedAt && m.stoppedAt > since);
  if (since && (newMeds.length || chMeds.length || stopped.length)) li.push(`Medicines: ${[newMeds.length ? `${names(newMeds)} added` : "", chMeds.length ? `${names(chMeds)} changed` : "", stopped.length ? `${names(stopped)} stopped` : ""].filter(Boolean).join("; ")}. <button class="link small" data-cu="meds">See the list</button>`);
  else if (!since && meds.some((m) => !m.stoppedAt)) li.push(`Medicines: ${meds.filter((m) => !m.stoppedAt).length} on the list. <button class="link small" data-cu="meds">See the list</button>`);
  const of = openFlags().filter((f) => !isExample(f));
  if (of.length) li.push(`${of.length} flag${of.length === 1 ? "" : "s"} still open: ${of.slice(0, 3).map((f) => esc(f.title)).join("; ")}${of.length > 3 ? "…" : ""}`);
  const inc = latestForms("incident").filter((r) => formVersions(r.formId)[0].ts > since || r.status !== "closed");
  if (inc.length) li.push(`Incident reports: ${inc.slice(0, 3).map((r) => `<button class="link small" data-openform="${esc(r.formId)}">${esc(r.ref)}</button> (${esc(FORM_STATUS[r.status].toLowerCase())})`).join(", ")}`);
  const sk = latestForms("skin").filter((r) => r.status !== "closed"), skObs = observations().filter((o) => o.topic === "skin" && o.ts > (since || Date.now() - 14 * 864e5));
  if (sk.length || skObs.length) li.push(`Skin: ${[sk.length ? `${sk.map((r) => `<button class="link small" data-openform="${esc(r.formId)}">${esc(skinWhere(formData(r)))}</button>`).join(", ")} being followed up` : "", skObs.length ? `${skObs.length} note${skObs.length === 1 ? "" : "s"} about skin${since ? " since you were last here" : " in the last 14 days"}` : ""].filter(Boolean).join("; ")}`);
  if (since) { const n = S.notes.filter((x) => x.ts > since && !isExample(x)).length; if (n) li.push(`${n} note${n === 1 ? "" : "s"} since you were last here: <button class="link small" data-cu="diary">read them day by day</button>`); }
  return `<div class="card" id="catchup" style="display:grid;gap:8px;border:2px solid var(--accent, #6b4fa0)"><div class="card-h"><h3>${c.isNew ? `Getting to know ${esc(S.client.name)}` : `Welcome back: catch up on ${esc(S.client.name)}`}</h3></div>
    <p class="small" style="margin:0">${c.isNew ? "Before your first shift, read what's below." : `Since you were last here (${esc(fmtDay(since))}):`}</p>
    <ul class="small" style="margin:0;padding-left:18px;display:grid;gap:4px">${li.length ? li.map((x) => `<li>${x}</li>`).join("") : "<li>Nothing has changed.</li>"}</ul>
    <div style="display:grid;gap:6px">${[["read", "I've read this"], ["skin", "I've checked the skin"]].map(([k, l]) => c.done.has(k) ? `<div class="small">✓ ${l}</div>` : `<button class="btn secondary" data-ack="${k}">${l}</button>`).join("")}</div>
    <p class="tiny muted" style="margin:0">Recorded with your name and the time. You can record notes before ticking these.</p></div>`;
}
function bindCatchup(v) {
  v.querySelectorAll("[data-ack]").forEach((b) => (b.onclick = () => {
    const c = S.catchup; if (!c) return;
    const rec = { id: uid(), ts: Date.now(), what: b.dataset.ack, since: c.since || 0, by: stampId(), byName: session.name || onDuty().name };
    touch(rec); (S.acks = S.acks || []).push(rec); save();
    toast(b.dataset.ack === "skin" ? "Skin check recorded" : "Recorded"); render();
  }));
  v.querySelectorAll("[data-cu]").forEach((b) => (b.onclick = () => {
    const k = b.dataset.cu;
    if (k === "plan") openPlan(); else if (k === "meds") openMeds("list");
    else { logDay = dayKey(new Date(S.catchup && S.catchup.since ? S.catchup.since : Date.now())); go("log"); }
  }));
}
// Follow-up checks from every version of a skin form (two phones adding a check at once keep both).
function allFollowups(formId) {
  const seen = new Map();
  for (const v of formVersions(formId)) for (const f of formData(v).followups) seen.set(`${f.ts}|${f.byName}`, f);
  return [...seen.values()].sort((a, b) => a.ts - b.ts);
}
// Two versions amending the same one: changed on two phones at once.
const formConflict = (formId) => { const vs = formVersions(formId), n = new Map(); for (const v of vs) if (v.prevId) n.set(v.prevId, (n.get(v.prevId) || 0) + 1); return [...n.values()].some((x) => x > 1); };
// For the handover: skin concerns being followed up and incident reports not yet closed.
function handoverFormFlags() {
  return [...latestForms("skin").filter((r) => r.status !== "closed").map((r) => { const d = formData(r); return { kind: "To note", title: `Skin concern being followed up (${r.ref}): ${skinWhere(d)}`, detail: `${opt(SKIN_STATUS, d.status) || "Status not given"}${d.nextReview ? `; next check due ${fmtDay(new Date(d.nextReview + "T12:00:00").getTime())}` : ""}.` }; }),
    ...latestForms("incident").filter((r) => r.status !== "closed").map((r) => ({ kind: "To note", title: `Incident report ${r.ref}: ${FORM_STATUS[r.status].toLowerCase()}`, detail: formLine(r) }))];
}

let logFilter = "all";
// Diary view (Sam, 2026-10-16: she flips back through a paper diary to spot patterns or catch up after
// leave): one day at a time, oldest first, stepping back and forward. null = everything, newest first.
let logDay = null;
// The diary looks ahead too (Sam, 2026-10-21: "I still want to see what else I have on that day"),
// up to two years, with that day's appointments at the top.
const diaryLast = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 2); return dayKey(d); };
function diaryApptsHTML(day) {
  const list = S.schedule.filter((e) => !isExample(e) && dayKey(new Date(e.when)) === day).sort((a, b) => a.when - b.when);
  return `<div class="card" style="display:grid;gap:6px;padding:10px 12px"><strong class="small">Appointments and plans</strong>
    ${list.length ? list.map((e) => `<button class="link small" data-appt="${esc(e.id)}" style="justify-self:start;text-align:left;min-height:36px;${e.cancelledTs ? "text-decoration:line-through;opacity:.7" : ""}"><strong>${fmtTime(e.when)}</strong> ${esc(e.label)}${e.detail ? ` · ${esc(e.detail)}` : ""}${e.seriesId ? " ↻" : ""}${e.remind ? " 🔔" : ""}${e.cancelledTs ? " (cancelled)" : ""}</button>`).join("") : `<div class="small muted">None on this day.</div>`}
    ${day >= dayKey(new Date()) && !isFamily() ? `<button class="link small" id="ldAddAppt" style="justify-self:start;min-height:40px">+ Add an appointment on this day</button>` : ""}</div>`;
}
let logOpen = false; // "Show all words and recordings" in the record log
try { logOpen = localStorage.getItem("dignitynotes.logopen") === "1"; } catch {}
// Where a word appears in a text, with a few words either side ("…had her porridge at…").
// "\"Muppet cream\" – name of the cream is unclear" -> "Muppet cream": the words to look for.
const unclearWords = (w) => { const q = String(w).match(/["“]([^"”]+)["”]/); return (q ? q[1] : String(w).split(/\s[–-]\s|:/)[0]).trim(); };
// Text boxes that grow to show all their words, so nothing hides behind a scroll inside the box.
function autoGrow(el) {
  if (!el) return;
  // Measure once at the start; while typing, only ever grow. Shrinking to "auto" on each key made the
  // box collapse for a moment and the iPhone scroll it out of view behind the keyboard.
  const fit = () => { el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; };
  const grow = () => { if (el.scrollHeight > el.clientHeight) el.style.height = el.scrollHeight + 2 + "px"; };
  fit(); if (!el.dataset.grows) { el.dataset.grows = "1"; el.addEventListener("input", grow); }
}
function wordInContext(text, word) {
  const t = String(text || ""), i = t.toLowerCase().indexOf(String(word).toLowerCase());
  if (!word || i < 0) return null;
  let a = Math.max(0, i - 40), b = Math.min(t.length, i + word.length + 40);
  if (a > 0) a = t.indexOf(" ", a) + 1 || a;
  if (b < t.length) b = t.lastIndexOf(" ", b) > i + word.length ? t.lastIndexOf(" ", b) : b;
  return { i, html: (a > 0 ? "…" : "") + esc(t.slice(a, i)) + "<mark>" + esc(t.slice(i, i + word.length)) + "</mark>" + esc(t.slice(i + word.length, b)) + (b < t.length ? "…" : "") };
}
// Load a saved recording into an <audio> the first time it's needed. A recording that isn't on this
// phone comes from the cloud: straight away if the carer opened that note, or with a Download
// button when every note is opened at once (so the app doesn't download them all together).
const blobUrls = new Map();
const urlFor = (key, blob) => { if (!blobUrls.has(key)) blobUrls.set(key, URL.createObjectURL(blob)); return blobUrls.get(key); };
async function loadAudio(a, fromCloud) {
  if (!a || a.src || a.dataset.loading || !a.isConnected) return;
  a.dataset.loading = "1";
  const local = await audioDB.get(a.dataset.audio);
  if (local) { a.src = urlFor(a.dataset.audio, local); return; }
  const msg = (text, retry) => {
    const p = Object.assign(document.createElement("p"), { className: "small muted" });
    p.append(text + " ");
    if (retry) { const btn = Object.assign(document.createElement("button"), { className: "link small", textContent: retry }); btn.onclick = () => { p.remove(); a.hidden = false; delete a.dataset.loading; loadAudio(a, true); }; p.append(btn); }
    a.hidden = true; a.before(p);
  };
  if (!fromCloud) return msg("This recording is in the cloud.", "Download");
  const { blob, why } = await cloudAudio(a.dataset.audio);
  if (blob) { a.src = urlFor(a.dataset.audio, blob); return; }
  if (why === "offline") msg("Connect to the internet to play this recording.", "Try again");
  else if (why === "missing") msg("This recording isn't in the cloud yet. It appears once the phone that made it is back online.", "Try again");
  else if (why === "off") msg("This recording is stored on the phone that made it.");
  else msg("Couldn't download the recording.", "Try again");
}

// An addition is shown under its note when that note is on this phone and is itself an original.
const isNested = (n) => !!n.amends && n.amends !== n.id && S.notes.some((o) => o.id === n.amends && !o.amends);
function renderLog() {
  const v = $("#view-log");
  const items = [
    ...S.notes.filter((n) => !isNested(n)).map((n) => ({ type: "note", ts: n.ts, n })),
    ...S.transfers.flatMap((t) => [{ type: "out", ts: t.outTs, t }, ...(t.backTs ? [{ type: "back", ts: t.backTs, t }] : [])]),
    ...S.handovers.map((h) => ({ type: "handover", ts: h.ts, h })),
    ...latestForms().map((r) => ({ type: "form", ts: formVersions(r.formId)[0].ts, r })),
  ].filter((it) => !logDay || dayKey(new Date(it.ts)) === logDay).filter((it) => {
    if (logFilter === "all") return true;
    if (it.type === "form") return logFilter === "incident" ? it.r.type === "incident" : it.r.status !== "closed";
    if (it.type !== "note") return false;
    const ids = new Set([it.n.id, ...S.notes.filter((x) => x.amends === it.n.id).map((x) => x.id)]);
    const fl = S.flags.filter((f) => ids.has(f.noteId));
    return logFilter === "incident" ? fl.some((f) => f.kind === "incident") : fl.some((f) => f.kind === "follow_up");
  }).sort((a, b) => (logDay ? a.ts - b.ts : b.ts - a.ts));
  let lastDay = "";
  const rows = items.map((it) => {
    const d = dayLabel(it.ts); const head = d !== lastDay ? `<div class="day-h">${esc(d)}</div>` : ""; lastDay = d;
    if (it.type === "form") { const r = it.r, vs = formVersions(r.formId); return head + `<div class="card entry system"><div class="entry-top"><span class="t">${fmtTime(it.ts)}</span><span class="chip ${r.type === "incident" ? "incident" : "follow"}">${formTitle(r.type)}</span><span class="muted">${esc(vs[0].byName || "")}</span></div>
      <button class="link small" data-openform="${esc(r.formId)}" style="justify-self:start;text-align:left;min-height:40px">${esc(r.ref)} · ${esc(formLine(r))} · ${esc(r.type === "skin" && r.status === "open" ? "being followed up" : FORM_STATUS[r.status].toLowerCase())}${vs.length > 1 ? ` · changed ${vs.length - 1} time${vs.length === 2 ? "" : "s"}` : ""}</button></div>`; }
    if (it.type === "note") {
      const n = it.n; const fl = S.flags.filter((f) => f.noteId === n.id);
      return head + `<article class="card entry">
        <div class="entry-top"><span class="t">${fmtTime(n.ts)}</span><span class="muted">${esc(carer(n.carerId, n.carerName).name)}</span>${extraChip(n)}${n.approvedTs && n.approvedTs - n.ts > 30 * 60 * 1000 ? `<span class="chip" title="Recorded ${esc(fmtTime(n.ts))}, saved ${esc(fmtTime(n.approvedTs))}">Saved later</span>` : ""}${n.serverAt && n.serverAt - (n.approvedTs || n.ts) > 30 * 60 * 1000 ? `<span class="chip">Added later: ${dayLabel(n.serverAt)} ${fmtTime(n.serverAt)}</span>` : ""}${n.source === "example" ? '<span class="chip">Example</span>' : ""}</div>
        ${fl.length ? `<div class="chips">${fl.map((f) => `<span class="chip ${f.kind === "incident" ? "incident" : "follow"}">${esc(f.title)}</span>`).join("")}</div>` : ""}
        ${latestForms().filter((r) => r.noteId === n.id).map((r) => `<button class="link small" data-openform="${esc(r.formId)}" style="justify-self:start;min-height:40px">${formTitle(r.type)} ${esc(r.ref)}</button>`).join("")}
        <p class="note-text">${esc(n.note)}</p>
        <div class="chips">${n.categories.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>
        <details ${logOpen ? "open" : ""}><summary>${n.audioId ? "Recording and words" : "Words"}</summary>
          ${n.audioId ? `<audio controls preload="none" data-audio="${esc(n.audioId)}"></audio>` : ""}
          ${n.heard ? `<p class="small muted" style="margin:8px 0 0"><strong>${n.heardBy === "relay" ? "Speech-to-text heard" : "The phone heard"}:</strong> ${esc(n.heard)}</p>${n.phoneHeard ? `<p class="small muted" style="margin:6px 0 0"><strong>The phone heard (live preview):</strong> ${esc(n.phoneHeard)}</p>` : ""}
          <p class="small muted" style="margin:6px 0 0"><strong>${n.auto ? "After remembered word fixes" : "Checked by the carer"}:</strong> ${esc(n.transcript)}</p>` : `<p class="small muted" style="margin:8px 0 0">${esc(n.transcript)}</p>`}
           <p class="tiny muted" style="margin:6px 0 0">${n.auto ? `Saved automatically at ${fmtTime(n.approvedTs || n.ts)} from ${esc(carer(n.carerId, n.carerName).name)}'s recording. The note was written by the app and not checked before saving; the words and recording above are what was said.` : `Approved by ${esc(carer(n.carerId, n.carerName).name)} at ${fmtTime(n.approvedTs || n.ts)}`}</p></details>
         ${n.amends ? "" : S.notes.filter((x) => x.amends === n.id && x.id !== n.id).sort((x, y) => x.ts - y.ts).map((x) => `<div style="border-top:1px solid var(--line);margin-top:10px;padding-top:8px">
           <div class="tiny muted"><strong>Added</strong> ${esc(dayLabel(x.ts))} ${fmtTime(x.ts)} · ${esc(carer(x.carerId, x.carerName).name)}</div>
           ${S.flags.filter((f) => f.noteId === x.id).map((f) => `<span class="chip ${f.kind === "incident" ? "incident" : "follow"}">${esc(f.title)}</span>`).join(" ")}
           <p class="note-text" style="margin:4px 0 0">${esc(x.note)}</p>
           <details><summary class="small">${x.audioId ? "Recording and words" : "Words"}</summary>${x.audioId ? `<audio controls preload="none" data-audio="${esc(x.audioId)}"></audio>` : ""}<p class="small muted" style="margin:8px 0 0">${esc(x.transcript)}</p></details></div>`).join("")}
         <button class="link small" data-addto="${esc(n.amends || n.id)}" style="justify-self:start;margin-top:6px">Add to this note</button>
      </article>`;
    }
    if (it.type === "out") return head + `<div class="card entry system"><div class="entry-top"><span class="t">${fmtTime(it.ts)}</span><span class="chip follow">Out of carer's care</span></div><div class="small">${esc(S.client.name)} went out with <strong>${esc(it.t.withWhom)}</strong>${it.t.relationship ? " (" + esc(it.t.relationship) + ")" : ""}${it.t.purpose ? " for " + esc(it.t.purpose) : ""}. Logged by ${esc(carer(it.t.carerId).name)}.</div></div>`;
    if (it.type === "back") return head + `<div class="card entry system"><div class="entry-top"><span class="t">${fmtTime(it.ts)}</span><span class="chip accent">Back in carer's care</span></div><div class="small">Returned from ${esc(it.t.withWhom)}.${it.t.backNote ? " " + esc(it.t.backNote) : ""}</div></div>`;
    return head + `<div class="card entry system"><div class="entry-top"><span class="t">${fmtTime(it.ts)}</span><span class="chip accent">Handover</span><span class="muted">${esc(carer(it.h.fromId, it.h.fromName).name)} → ${esc(it.h.toId ? carer(it.h.toId).name : "next carer")}</span></div><details ${logOpen ? "open" : ""}><summary>Read handover</summary><p class="small" style="white-space:pre-line;margin:0">${esc(it.h.text)}</p></details></div>`;
  }).join("");
  v.innerHTML = `<div class="hello"><h2>Record log</h2><p>Every saved note, outing and handover, newest first.</p></div>
    <button class="searchbar" id="logFind">${ICON.search}<span>Search notes, care plan, contacts…</span></button>
    <div class="seg" role="group" aria-label="Filter">${[["all", "Everything"], ["incident", "Incidents"], ["follow", "To note"]].map(([k, l]) => `<button data-f="${k}" aria-pressed="${logFilter === k}">${l}</button>`).join("")}</div>
    ${logDay ? `<div class="card" style="display:grid;gap:8px;padding:10px 12px"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><button class="btn ghost" id="ldPrev" aria-label="Previous day" style="flex:0 0 auto">‹ Day before</button><strong class="small" style="text-align:center">${esc(fmtDay(new Date(logDay + "T12:00:00").getTime()))}</strong><button class="btn ghost" id="ldNext" aria-label="Next day" style="flex:0 0 auto" ${logDay >= diaryLast() ? "disabled" : ""}>Day after ›</button></div>
      <div class="row" style="gap:8px"><label class="f" style="flex:1">Go to a date<input type="date" id="ldDate" value="${esc(logDay)}" max="${esc(diaryLast())}"></label><button class="btn secondary" id="ldAll" style="align-self:end">Show everything</button></div>
      <button class="link small" id="ldCal" style="justify-self:start;min-height:40px">Calendar (a month at a time)</button></div>
      ${diaryApptsHTML(logDay)}`
      : `<button class="link small" id="ldOpen" style="justify-self:start;min-height:40px">View one day at a time (diary)</button>`}
    ${rows ? `<button class="link small" id="logOpen" style="justify-self:start">${logOpen ? "Hide words and recordings" : "Show all words and recordings"}</button>` : ""}
    ${rows || `<div class="empty">${logDay ? (logDay > dayKey(new Date()) ? "This day hasn't happened yet: appointments for it are above." : "Nothing was recorded on this day.") : "Nothing here yet."}</div>`}`;
  v.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { logFilter = b.dataset.f; renderLog(); }));
  const stepDay = (n) => { const d = new Date(logDay + "T12:00:00"); d.setDate(d.getDate() + n); logDay = dayKey(d); renderLog(); window.scrollTo(0, 0); };
  if ($("#ldOpen", v)) $("#ldOpen", v).onclick = () => { logDay = dayKey(new Date()); renderLog(); };
  if ($("#ldPrev", v)) $("#ldPrev", v).onclick = () => stepDay(-1);
  if ($("#ldNext", v)) $("#ldNext", v).onclick = () => stepDay(1);
  if ($("#ldAll", v)) $("#ldAll", v).onclick = () => { logDay = null; renderLog(); };
  if ($("#ldCal", v)) $("#ldCal", v).onclick = () => openCalendar(undefined, logDay);
  if ($("#ldAddAppt", v)) $("#ldAddAppt", v).onclick = () => openEventSheet(logDay, () => renderLog());
  if ($("#ldDate", v)) $("#ldDate", v).onchange = (e) => { if (e.target.value) { logDay = e.target.value; renderLog(); } };
  v.querySelectorAll("[data-addto]").forEach((b) => (b.onclick = () => openRecorder({ amends: b.dataset.addto })));
  $("#logFind", v).onclick = () => { openFind(); const q = $("#fdQ"); if (q) q.focus(); };
  if ($("#logOpen", v)) $("#logOpen", v).onclick = () => { logOpen = !logOpen; try { localStorage.setItem("dignitynotes.logopen", logOpen ? "1" : "0"); } catch {} renderLog(); };
  if (logOpen) v.querySelectorAll("audio[data-audio]").forEach((a) => loadAudio(a, false));
  v.querySelectorAll("details").forEach((d) => d.addEventListener("toggle", () => { if (d.open && !logOpen) loadAudio(d.querySelector("audio[data-audio]"), true); }));
}

let handoverDraft = null;
function renderHandover() {
  const v = $("#view-handover");
  const past = [...S.handovers].sort((a, b) => b.ts - a.ts).slice(0, 5);
  const others = roster().filter((c) => c.id !== S.onDuty);
  v.innerHTML = `<div class="hello"><h2>End-of-shift handover</h2><p>Built from your saved notes and open flags. Nothing to write twice.</p></div>
    ${emergForm() && emergForm().form !== "unknown" ? `<p class="small" style="margin:0"><strong>${esc(emergText(emergForm()))}</strong> <span class="muted">· ${emergChecked(emergForm())}</span></p>` : ""}
    <div class="card">
      <div class="card-h"><h3>This shift</h3><span class="muted small">${shiftNotes().length} notes · ${openFlags().length} open flags</span></div>
      ${handoverDraft ? `
        ${sourceTag(handoverDraft.source, handoverDraft.reason)}
        <label class="f" style="margin-top:10px">Handover (edit if needed)<textarea id="hoText" class="note-edit">${esc(handoverDraft.text)}</textarea></label>
        ${others.length ? `<label class="f" style="margin-top:12px">Handing over to<select id="hoTo"><option value="">Choose who…</option><option value="next">Whoever is on next</option>${others.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}${c.shift ? " · " + esc(c.shift) : ""}</option>`).join("")}</select></label>`
          : `<p class="small muted" style="margin:12px 0 0">No other carers are on ${esc(S.client.name)} yet. The handover is saved for the next carer. An administrator can add carers in Manage people.</p>`}
        ${myOpenVisit() ? `<label class="check small" style="margin-top:12px"><input type="checkbox" id="hoOut" checked><span>I'm leaving now: check me out too (here since ${fmtTime(myOpenVisit().inTs)}${isToday(myOpenVisit().inTs) ? "" : " " + esc(dayLabel(myOpenVisit().inTs).toLowerCase())})</span></label>` : ""}
        <div class="row" style="margin-top:14px"><button class="btn ghost" id="hoRedo">Prepare again</button><button class="btn primary" id="hoSave">Approve and hand over</button></div>`
      : `<p class="small muted" style="margin:0 0 12px">When your shift ends, prepare the handover. You can edit it before approving.</p>
        <button class="btn primary block" id="hoPrep">Prepare handover</button>`}
    </div>
    <div class="card"><div class="card-h"><h3>Recent handovers</h3></div><div class="list">
      ${past.map((h) => `<div class="item"><div class="when">${fmtTime(h.ts)}</div><div class="body"><div class="small"><strong>${esc(carer(h.fromId).name)} → ${esc(h.toId ? carer(h.toId).name : "next carer")}</strong> <span class="muted">· ${dayLabel(h.ts)}</span></div><details><summary>Read</summary><p class="small" style="white-space:pre-line;margin:0">${esc(h.text)}</p></details></div></div>`).join("") || '<div class="empty">None yet.</div>'}</div></div>`;
  if ($("#hoText")) $("#hoText").oninput = (e) => { handoverDraft.text = e.target.value; };
  const prep = async (btn) => { btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:3px"></span> Preparing…'; handoverDraft = await summarise("handover"); renderHandover(); };
  if ($("#hoPrep")) $("#hoPrep").onclick = (e) => prep(e.currentTarget);
  if ($("#hoRedo")) $("#hoRedo").onclick = (e) => prep(e.currentTarget);
  if ($("#hoSave")) $("#hoSave").onclick = () => {
    if ($("#hoTo") && !$("#hoTo").value) { $("#hoTo").focus(); return toast("Choose who you're handing over to"); }
    const toId = $("#hoTo") && $("#hoTo").value !== "next" ? $("#hoTo").value : null; const text = $("#hoText").value.trim(); if (!text) return toast("The handover is empty");
    const now = Date.now();
    S.handovers.push({ id: uid(), ts: now, fromId: stampId(), toId, text, source: handoverDraft.source });
    // Handing over usually ends the shift: check out at the same time (Gavin, 2026-10-23), every open visit of yours.
    const out = $("#hoOut") && $("#hoOut").checked ? visits().filter((x) => x.by === stampId() && !x.outTs && x.inTs <= now) : [];
    for (const x of out) { Object.assign(x, { outTs: now, outBy: stampId() }); touch(x); }
    handoverDraft = null; save(); go("today"); toast((toId ? `Handed over to ${carer(toId).name}` : "Handover saved for the next carer") + (out.length ? ` · Checked out at ${fmtTime(now)}` : ""));
  };
}

let familySummary = null, sendAs = "family";
// The daily family update, written automatically at the client's set time (an administrator chooses
// it on the Family tab) for a carer to read, change if needed and share. Never sent without a carer.
const familyAt = () => (session && !session.local && session.client && session.client.familyAt) || "";
// The most recent time the update was due (today's, or yesterday's before today's time comes round),
// so an unshared draft written late in the evening is still offered after midnight.
const familyDueAt = () => { const t = familyAt(); if (!t) return 0; const [h, m] = t.split(":").map(Number); const d = new Date(); d.setHours(h, m, 0, 0); if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1); return d.getTime(); };
// A shared report isn't the daily update: it doesn't stop today's update being written or shared.
const REPORT_SHARE_PREFIX = "Report: ";
const familySharedSince = (ts) => (S.summaries || []).some((x) => x.ts >= ts && !String(x.text || "").startsWith(REPORT_SHARE_PREFIX));
let familyAuto = { busy: false, retryAt: 0 };
async function autoFamilyUpdate() {
  const due = familyDueAt();
  if (!due || isFamily() || !cloudOn() || !navigator.onLine || familyAuto.busy || Date.now() < familyAuto.retryAt) return false;
  if (familySharedSince(due) || (S.familyDraft && S.familyDraft.due === due)) return false;
  familyAuto.busy = true;
  const key = KEY, id = session.client.id; // the client this is for: the carer may switch client meanwhile
  try {
    // One draft per client, kept on the relay and shared by every phone: written once, not per phone.
    let d = (await relay("/clients/familydraft", { id, op: "get" })).draft;
    if (KEY !== key) return false;
    if (!d || d.due !== due) {
      const w = await summarise("family");
      if (KEY !== key) return false;
      // Only an AI-written update is offered; if the AI couldn't be reached, try again in 15 minutes.
      if (w.source !== "ai") { familyAuto.retryAt = Date.now() + 15 * 60000; return false; }
      d = (await relay("/clients/familydraft", { id, op: "put", due, text: w.text, source: w.source })).draft;
      if (KEY !== key) return false;
    }
    S.familyDraft = { text: d.text, source: d.source, due, at: d.at }; saveLocal(); return true;
  } catch { familyAuto.retryAt = Date.now() + 15 * 60000; return false; }
  finally { familyAuto.busy = false; }
}
const familyReadyHTML = () => { const due = familyDueAt(); return due && S.familyDraft && S.familyDraft.due === due && !familySharedSince(due)
  ? `<button class="warn small" data-gofamily style="display:block;width:100%;text-align:left;border:0">Today's family update is written and ready to check. Tap to read it and share it with the family.</button>` : ""; };
// Carers' Family tab. Signed in, messages and shared updates are real records the family see in
// their own app; on a phone without a sign-in it stays a demo with both sides on this phone.
function renderFamily() {
  const v = $("#view-family"), live = cloudOn();
  const inc = S.flags.filter((f) => f.kind === "incident" && isToday(f.ts));
  // Another carer may have shared since (synced from their phone): then this draft is out of date.
  if (S.familyDraft && familySharedSince(S.familyDraft.due)) { S.familyDraft = null; if (familySummary && familySummary.auto) familySummary = null; saveLocal(); }
  if (!familySummary && S.familyDraft && S.familyDraft.due === familyDueAt()) familySummary = { text: S.familyDraft.text, source: S.familyDraft.source, reason: S.familyDraft.reason, auto: true };
  const msgs = [...(S.messages || [])].sort((a, b) => a.ts - b.ts);
  const shared = [...(S.summaries || [])].sort((a, b) => b.ts - a.ts);
  const fam = (session && session.client && session.client.family) || [];
  const famInc = live ? !!session.client.familyIncidents : !!S.settings.familyAlerts;
  v.innerHTML = `<div class="hello"><h2>Family</h2><p>What the authorised family member sees: daily updates you share, appointments and messages. Never the notes.</p></div>
    <div class="card"><div class="card-h"><h3>Today's update</h3><span class="muted small">${fmtDay(Date.now())}</span></div>
      ${familySummary ? `${sourceTag(familySummary.source, familySummary.reason)}${live ? `<textarea id="famText" rows="7" maxlength="4000" aria-label="Today's update" style="width:100%;margin-top:8px">${esc(familySummary.text)}</textarea>` : `<p class="note-text" style="white-space:pre-line;margin-top:8px">${esc(familySummary.text)}</p>`}<button class="link" id="famRedo" style="margin-top:8px">Write again</button>
        ${live ? `<button class="btn primary block" id="famShare" style="margin-top:10px">Share with family</button><p class="tiny muted" style="margin:6px 0 0">Read and change it first if needed: family see exactly this, and it can't be taken back.</p>` : ""}`
      : `<p class="small muted" style="margin:0 0 12px">A short, plain-English update written from the last 24 hours of notes, from every carer.${familyAt() ? ` It's written automatically each day at ${esc(familyAt())} for a carer to check and share.` : ""}</p><button class="btn primary block" id="famGen">Write today's update</button>`}
      ${live && session.role === "admin" ? `<label class="f" style="margin-top:12px">Write it automatically each day at<select id="famAt"><option value="">Off (only when a carer asks)</option>${Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`).map((t) => `<option ${t === familyAt() ? "selected" : ""}>${t}</option>`).join("")}</select></label><p class="tiny muted" style="margin:4px 0 0">A carer still reads it and taps Share: nothing goes to the family on its own.</p>` : ""}
      ${shared.length ? `<details style="margin-top:10px"><summary class="small">Shared with family (${shared.length})</summary>${shared.slice(0, 7).map((x) => `<div class="small" style="border-top:1px solid var(--line);padding-top:6px;margin-top:6px"><span class="tiny muted">${esc(dayLabel(x.ts))} ${fmtTime(x.ts)}${x.byName ? " · " + esc(x.byName) : ""}</span><div style="white-space:pre-line">${esc(x.text)}</div></div>`).join("")}</details>` : ""}</div>
    <div class="card"><div class="card-h"><h3>Incidents today</h3><span class="muted small">${famInc ? "Family can see these" : "For you; not shown to family"}</span></div>${inc.length ? `<div class="attn">${inc.map(attnRowHTML).join("")}</div>` : '<div class="empty">No incidents today.</div>'}</div>
    <div class="card"><div class="card-h"><h3>Messages</h3><span class="muted small">${live ? "With the family" : "Reaches whoever is on duty"}</span></div>
      <div class="thread" id="thread">${msgs.map((m) => `<div class="msg ${m.from === "carer" ? "carer" : ""}"><span class="who">${esc(m.name || (m.from === "carer" ? "Carer" : "Family"))} · ${dayLabel(m.ts)} ${fmtTime(m.ts)}</span>${esc(m.text)}</div>`).join("") || '<div class="empty">No messages yet.</div>'}</div>
      ${live ? "" : `<div class="seg" style="margin-top:12px" role="group" aria-label="Send as"><button data-as="family" aria-pressed="${sendAs === "family"}">Send as family</button><button data-as="carer" aria-pressed="${sendAs === "carer"}">Send as ${esc(onDuty().name)}</button></div>`}
      <form class="composer" id="msgForm" style="margin-top:12px"><input type="text" id="msgText" maxlength="2000" placeholder="Write a message" aria-label="Message" autocomplete="off"><button class="btn primary" style="min-height:46px">Send</button></form>
      <p class="tiny muted" style="margin:8px 0 0">${live ? (fam.length ? "Family linked: " + fam.map((f) => esc(f.name)).join(", ") + ". They see your messages and shared updates in their own app." : "No family member is linked to this client yet. An administrator can add one in Manage people.") : "Demo: both sides are on this phone. Signed in, family use their own login."}</p></div>
    <div class="card"><div class="switch"><div><strong>Family can see incidents</strong><div class="small muted">Off by default. Only switch on if agreed with the client or their representative. This is a care record, not a monitoring tool.${live && session.role !== "admin" ? " An administrator can change this." : ""}</div></div><input type="checkbox" id="famAlerts" ${famInc ? "checked" : ""} ${live && session.role !== "admin" ? "disabled" : ""} aria-label="Family can see incidents"></div></div>`;
  const gen = async (btn) => { btn.disabled = true; btn.textContent = "Writing…"; familySummary = await summarise("family"); renderFamily(); };
  if ($("#famGen")) $("#famGen").onclick = (e) => gen(e.currentTarget);
  if ($("#famRedo")) $("#famRedo").onclick = (e) => gen(e.currentTarget);
  if ($("#famShare")) $("#famShare").onclick = (e) => confirmInline(e.currentTarget, () => {
    S.summaries = S.summaries || [];
    const text = ($("#famText") ? $("#famText").value : familySummary.text).trim().slice(0, 4000); if (!text) return toast("Write the update first");
    S.summaries.push({ id: uid(), ts: Date.now(), day: new Date().toLocaleDateString("en-CA"), text }); S.familyDraft = null; save();
    if (cloudOn()) relay("/clients/familydraft", { id: session.client.id, op: "drop" }).catch(() => {}); familySummary = null; renderFamily(); toast("Shared with family");
  }, "Tap again to share with the family");
  v.querySelectorAll("[data-as]").forEach((b) => (b.onclick = () => { sendAs = b.dataset.as; renderFamily(); }));
  $("#msgForm").onsubmit = (e) => {
    e.preventDefault(); const text = $("#msgText").value.trim(); if (!text) return;
    const from = live ? "carer" : sendAs; // signed in, a carer's message is always the carer's (the relay stamps it too)
    S.messages = S.messages || [];
    S.messages.push({ id: uid(), ts: Date.now(), from, name: from === "family" ? "Family" : onDuty().name, text }); save(); renderFamily();
  };
  if ($("#famAt")) $("#famAt").onchange = async (e) => {
    try { const out = await relay("/clients/familyshare", { id: session.client.id, familyAt: e.target.value }); session.client.familyAt = out.client.familyAt || ""; saveSession(); toast(session.client.familyAt ? `The family update will be written each day at ${session.client.familyAt}` : "The family update is written only when a carer asks"); }
    catch (err) { toast(err.message); renderFamily(); }
  };
  $("#famAlerts").onchange = async (e) => {
    if (!live) { S.settings.familyAlerts = e.target.checked; save(); return toast(e.target.checked ? "Family will see incidents" : "Incidents hidden from family"); }
    try { const out = await relay("/clients/familyshare", { id: session.client.id, incidents: e.target.checked }); session.client.familyIncidents = !!out.client.familyIncidents; saveSession(); toast(session.client.familyIncidents ? "Family can now see incidents" : "Incidents are no longer shown to family"); }
    catch (err) { e.target.checked = !e.target.checked; toast(err.message); }
  };
  const th = $("#thread"); th.scrollTop = th.scrollHeight;
}

/* ---------- attendance ----------
 * Carers check in and out on Today; the list shows every carer's visits.
 */
// Attendance (Gavin, 2026-10-22): each carer records when they arrive and when they leave. A time can be put
// in later (forgot to tap), but the relay keeps when it was recorded, so a late entry shows as one. No
// location is recorded. Arriving can't be changed afterwards, and leaving is added once.
const visits = () => (S.visits || []).filter((v) => !isExample(v));
const myOpenVisit = () => visits().filter((v) => v.by === stampId() && !v.outTs).sort((a, b) => b.inTs - a.inTs)[0];
const durText = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`; };
const enteredLater = (ts, at) => !!at && at - ts > 15 * 60000;
function attendHTML() {
  if (!session || session.local || isFamily() || !S.client) return "";
  const v = myOpenVisit(), list = '<button class="link small" id="atList" style="min-height:40px;padding:0;justify-self:start">Attendance</button>';
  const line = (text, btn) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><div style="display:grid;gap:0"><span class="small">${text}</span>${list}</div>${btn}</div>`;
  if (!v) return `<div class="card">${line("Not checked in", `<button class="btn secondary" id="atIn" style="flex:0 0 auto">I've arrived</button>`)}</div>`;
  const long = Date.now() - v.inTs > 16 * 36e5;
  return `<div class="card" style="display:grid;gap:8px">${long ? `<div class="warn small" style="margin:0">Still checked in since ${esc(dayLabel(v.inTs))} ${fmtTime(v.inTs)}. Did you forget to check out? Tap I'm leaving and put in when you left.</div>` : ""}
    ${line(`Here since <strong>${fmtTime(v.inTs)}</strong>${isToday(v.inTs) ? "" : " " + esc(dayLabel(v.inTs).toLowerCase())} · ${durText(Date.now() - v.inTs)}`, `<button class="btn secondary" id="atOut" style="flex:0 0 auto">I'm leaving</button>`)}</div>`;
}
// Arriving or leaving: now, or a time typed in (today or yesterday) for a tap that was forgotten.
function openAttendTime(mode, other) {
  const v = mode === "out" ? other || myOpenVisit() : null;
  if (mode === "out" && !v) return render();
  const now = new Date(), pad = (n) => String(n).padStart(2, "0"), hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const s = sheet(`${sheetHead(mode === "in" ? "I've arrived" : "I'm leaving")}
    <p class="small" style="margin:0">${mode === "in" ? `Arriving to care for ${esc(S.client.name)}.` : other ? `${esc(other.byName || carer(other.by).name)} arrived ${esc(dayLabel(v.inTs).toLowerCase())} at ${fmtTime(v.inTs)} and didn't check out. Put in when they left, if you know it.` : `Leaving ${esc(S.client.name)}. You arrived ${esc(dayLabel(v.inTs).toLowerCase())} at ${fmtTime(v.inTs)}.`} If you forgot to tap at the time, change the time to when you ${mode === "in" ? "arrived" : "left"}: it's kept as entered later.</p>
    <div class="row" style="gap:8px"><label class="f" style="flex:1">Day<input type="date" id="atDay" value="${dayKey(now)}" max="${dayKey(now)}" min="${dayKey(new Date(mode === "out" ? v.inTs : Date.now() - 864e5))}"></label>
      <label class="f" style="flex:1">Time<input type="time" id="atTime" value="${hm(now)}"></label></div>
    ${mode === "out" ? '<label class="f">Anything to add? (optional)<input id="atNote" maxlength="300" placeholder="e.g. Stayed late: waited for the GP to call back"></label>' : ""}
    <button class="btn primary block" id="atSave">${mode === "in" ? "Check in" : "Check out"}</button>`);
  $("#atSave", s.root).onclick = () => {
    const day = $("#atDay", s.root).value, t = $("#atTime", s.root).value;
    const ts = day && t ? new Date(`${day}T${t}:00`).getTime() : NaN;
    if (!Number.isFinite(ts)) return toast("Choose the day and time");
    const nowMs = Date.now();
    if (ts > nowMs + 5 * 60000) return toast("That time hasn't happened yet");
    if (mode === "in") {
      if (ts < nowMs - 24 * 36e5) return toast("An arrival can be put in up to a day back");
      const rec = { id: uid(), ts: nowMs, inTs: ts, by: stampId(), byName: (session && session.name) || onDuty().name };
      touch(rec); S.visits = [...(S.visits || []), rec];
      save(); s.close(); render(); toast(`Checked in at ${fmtTime(ts)}`);
    } else {
      const cur = other ? (S.visits || []).find((x) => x.id === other.id && !x.outTs) : myOpenVisit(); if (!cur) { s.close(); return render(); }
      if (ts < cur.inTs) return toast(`That's before ${other ? "they" : "you"} arrived (${fmtTime(cur.inTs)})`);
      const note = ($("#atNote", s.root).value || "").trim().slice(0, 300);
      // Two phones that were offline can both have checked this carer in: leaving closes every open one.
      const open = other ? [cur] : visits().filter((x) => x.by === stampId() && !x.outTs && x.inTs <= ts);
      for (const x of open) { Object.assign(x, { outTs: ts, outBy: stampId(), ...(note ? { outNote: note } : {}) }); touch(x); }
      save(); s.close(); render(); toast(`Checked out at ${fmtTime(ts)} · ${durText(ts - cur.inTs)}`);
      if (other) openAttendance();
    }
  };
}
// Who was here and when, for a period: every carer's visits by day, with time there, and totals.
function openAttendance(days = 30) {
  const to = Date.now(), from = new Date(new Date().setHours(0, 0, 0, 0) - (days - 1) * 864e5).getTime();
  const list = visits().filter((v) => v.inTs >= from && v.inTs <= to).sort((a, b) => b.inTs - a.inTs);
  const name = (v) => v.byName || carer(v.by).name;
  const totals = new Map();
  for (const v of list) if (v.outTs) totals.set(name(v), (totals.get(name(v)) || 0) + (v.outTs - v.inTs));
  const byDay = new Map(); for (const v of list) { const k = dayKey(new Date(v.inTs)); byDay.set(k, [...(byDay.get(k) || []), v]); }
  const row = (v) => {
    const late = [enteredLater(v.inTs, v.inAt) ? `arrival put in at ${fmtTime(v.inAt)}` : "", v.outTs && enteredLater(v.outTs, v.outAt) ? `leaving put in ${sameDay(v.outAt, v.outTs) ? "at" : dayLabel(v.outAt).toLowerCase() + " at"} ${fmtTime(v.outAt)}` : ""].filter(Boolean);
    const notes = [...late, v.outNote ? esc(v.outNote) : ""].filter(Boolean).join("; ");
    return `<div class="at-row" style="padding:8px 0;border-top:1px solid var(--line)"><div class="small"><strong>${esc(name(v))}</strong> · ${fmtTime(v.inTs)} to ${v.outTs ? `${fmtTime(v.outTs)}${sameDay(v.outTs, v.inTs) ? "" : ` ${esc(dayLabel(v.outTs).toLowerCase())}`} · ${durText(v.outTs - v.inTs)}` : Date.now() - v.inTs > 16 * 36e5 ? "<em>not checked out</em>" : "<em>still here</em>"}${!v.outTs && isAdminHere() && v.by !== stampId() ? ` <button class="link small noprint" data-atclose="${esc(v.id)}">Put in when they left</button>` : ""}</div>${notes ? `<div class="tiny muted">${notes}</div>` : ""}</div>`;
  };
  const root = $("#fullRoot");
  root.innerHTML = `<div class="full mar-print" role="dialog" aria-modal="true" aria-label="Attendance"><div class="wrap" style="display:grid;gap:8px">
    <div class="row noprint" style="gap:8px;justify-content:space-between"><button class="btn ghost" id="atClose">Close</button><button class="btn primary" id="atPrint">Print or save as PDF</button></div>
    <h2 style="font-size:20px">Attendance · ${esc(S.client.name)}</h2>
    <div class="seg noprint" role="group" aria-label="Period">${[7, 30, 90].map((d) => `<button data-atdays="${d}" aria-pressed="${d === days}">${d} days</button>`).join("")}</div>
    <p class="small" style="margin:0">${esc(fmtDay(from))} to ${esc(fmtDay(to))}. Times are as each carer recorded them; a time put in later says so.</p>
    ${totals.size ? `<p class="small" style="margin:0"><strong>Time there:</strong> ${[...totals].map(([n, ms]) => `${esc(n)} ${durText(ms)}`).join(" · ")}</p>` : ""}
    ${list.length ? [...byDay].map(([k, vs]) => `<h3 style="font-size:15px;margin:12px 0 4px">${esc(fmtDay(new Date(k + "T12:00:00").getTime()))}</h3>
      <div>${vs.map(row).join("")}</div>`).join("")
      : '<div class="empty">No visits recorded in this period. Carers check in on Today with I\'ve arrived.</div>'}
    <p class="tiny muted">Dignity Notes · printed ${esc(fmtDay(Date.now()))} ${fmtTime(Date.now())} · pilot, made-up data only</p></div></div>`;
  document.body.classList.add("printing-mar");
  $("#atClose").onclick = () => { root.innerHTML = ""; document.body.classList.remove("printing-mar"); };
  $("#atPrint").onclick = () => window.print();
  root.querySelectorAll("[data-atdays]").forEach((b) => (b.onclick = () => openAttendance(+b.dataset.atdays)));
  root.querySelectorAll("[data-atclose]").forEach((b) => (b.onclick = () => { const v = visits().find((x) => x.id === b.dataset.atclose); if (v) { root.innerHTML = ""; document.body.classList.remove("printing-mar"); openAttendTime("out", v); } }));
}
