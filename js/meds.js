// Dignity Notes: the medicines chart (MAR), medicine changes without signal, medicines from a photo, training certificates.
// Loaded by index.html after app.js, in order; shares its global scope (one app split into files).
"use strict";

/* ---------- medicines chart (MAR) ----------
 * Each client's medicine list (any carer can add or change it; every change says where it came from
 * and is "not yet checked" until someone who didn't edit it confirms it against the label, NICE NG67
 * 1.5.4), and every dose recorded with the codes from Sam's paper chart. Doses are ordinary synced
 * records (kind "dose"), never edited: an entry is replaced only by a correction that names it
 * ("corrects"), never by a newer time, so phone clocks can't reorder them. Two entries saying a dose
 * was given are shown as "Recorded twice" (a possible double dose), never hidden. The app records what
 * carers did; it never suggests a dose or when to stop a medicine.
 */
const DOSE_CODES = [["T", "Taken"], ["P", "Prompted"], ["R", "Refused"], ["NT", "Not taken"], ["NR", "Not required"], ["M", "Made available"], ["D", "Social leave"], ["C", "Hospitalised"], ["E", "Refused and destroyed"], ["O", "Other"], ["V", "Entered in error"]];
const doseLabel = (c) => (DOSE_CODES.find((x) => x[0] === c) || [c, c])[1];
const DOSE_NEEDS_WHY = new Set(["R", "NT", "D", "C", "E", "O", "V"]);
const GIVEN = new Set(["T", "P"]);
const MED_SOURCES = [["label", "Pharmacy label"], ["prescription", "Prescription"], ["gp_letter", "GP letter"], ["discharge", "Hospital discharge letter"], ["verbal", "By phone from the prescriber"], ["other", "Other"]];
const medSourceLabel = (k) => (MED_SOURCES.find((x) => x[0] === k) || [k, k])[1];
const medsState = () => (S.meds = S.meds || { profile: null, list: [], at: 0 });
const medName = (m) => [m.name, m.strength, m.form].filter(Boolean).join(" ");
const doses = () => (S.doses || []).filter((d) => !d.outcomeOf);
// Did a when-required dose work (CQC: reason, amount, time and outcome)? Kept as its own entry.
const outcomeFor = (id) => (S.doses || []).filter((d) => d.outcomeOf === id).sort((a, b) => b.ts - a.ts)[0];
function openPrnOutcome(d, after) {
  const s = sheet(`${sheetHead("Did it help?")}<p class="small" style="margin:0">${fmtTime(d.ts)} ${esc(d.med || "")}${d.prnFor ? " for " + esc(d.prnFor) : ""}</p>
    <label class="f">What happened?<input type="text" id="poTxt" maxlength="200" placeholder="e.g. Pain eased within the hour" autocomplete="off"></label>
    <button class="btn primary block" id="poSave">Save</button>`);
  $("#poSave", s.root).onclick = () => { const t = $("#poTxt", s.root).value.trim(); if (!t) return toast("Say what happened"); pushDose({ medId: d.medId, med: d.med, day: d.day, slot: "prn", code: "O", outcomeOf: d.id, outcome: t }); s.close(); render(); if (after) after(); toast("Saved"); };
}
const doseBy = (d) => d.byName || carer(d.by).name;
const initialsOf = (n) => String(n || "?").split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase()).join("").slice(0, 3);
// "1 to 2 tablets", "1-2", "5 or 10 ml": the amount actually given must be written down.
const variableDose = (dose) => /\d\s*(-|–|to|or)\s*\d|\bor\b/i.test(String(dose || ""));
const medsProfile = () => medsState().profile || {};
// The client manages their own medicines, and that was checked by a second person.
const medsSelf = () => { const p = medsProfile(); return p.mode === "self" && !p.selfLog && !!p.checkedAt; };
let medsLoading = false;
// Fetch the list at most every 5 minutes (or when asked); true when something new arrived. A reply for
// a client the phone has since switched away from is thrown away.
async function loadMeds(force) {
  const ms = medsState();
  if (!cloudOn() || medsLoading || !navigator.onLine || (!force && Date.now() - ms.at < 5 * 60000)) return false;
  medsLoading = true;
  const key = KEY, clientId = session.client.id;
  try {
    const out = await syncJSON("/plan/meds/get", { client: clientId });
    if (!out || out.error || KEY !== key || !session || !session.client || session.client.id !== clientId) return false;
    const cur = medsState(), changed = JSON.stringify([out.profile, out.meds, out.me]) !== JSON.stringify([cur.profile, cur.list, cur.me]);
    S.meds = { profile: out.profile, list: out.meds || [], me: out.me || null, at: Date.now() }; saveLocal();
    return changed;
  } catch { return false; } finally { medsLoading = false; }
}
const medOnDay = (m, day) => (!m.startDate || m.startDate <= day) && (!m.endDate || m.endDate >= day) && (!m.stoppedAt || dayKey(new Date(m.stoppedAt)) >= day);
const slotTs = (day, slot) => { const [y, mo, d] = day.split("-").map(Number), [h, mi] = slot.split(":").map(Number); return new Date(y, mo - 1, d, h, mi).getTime(); };
// Does this dose time apply? Not before the medicine was added (unless a start date says so), not after it stopped.
function medSlotApplies(m, day, slot) {
  if (!medOnDay(m, day)) return false;
  const ts = slotTs(day, slot);
  if (m.stoppedAt && ts >= m.stoppedAt) return false;
  if (m.createdAt && ts < m.createdAt && !(m.startDate && m.startDate < dayKey(new Date(m.createdAt)))) return false;
  return true;
}
// Every entry for a medicine, day and time; the ones still standing (not corrected by another entry);
// and what they say. Entered-in-error entries leave the dose unrecorded.
function doseState(medId, day, slot) {
  const all = doses().filter((d) => d.medId === medId && d.day === day && d.slot === slot);
  const live = all.filter((d) => !all.some((x) => x.corrects === d.id)).filter((d) => d.code !== "V").sort((a, b) => a.ts - b.ts);
  const given = live.filter((d) => GIVEN.has(d.code));
  return { all, live, given, last: live[live.length - 1] || null, twice: given.length > 1 };
}
// Scheduled doses whose time falls between two moments, with what was recorded for each. Times that
// have entries stay listed even if the medicine's times have changed since.
function dosesDue(from, to) {
  const out = [], d = new Date(from); d.setHours(0, 0, 0, 0);
  for (; d.getTime() <= to; d.setDate(d.getDate() + 1)) {
    const day = dayKey(d);
    for (const m of medsState().list) {
      if (m.prn) continue;
      const recorded = doses().filter((x) => x.medId === m.id && x.day === day && x.slot !== "prn").map((x) => x.slot);
      const slots = new Set([...(m.times || []).filter((t) => medSlotApplies(m, day, t)), ...recorded]);
      for (const slot of slots) { const ts = slotTs(day, slot); if (ts >= from && ts <= to) out.push({ m, day, slot, ts, st: doseState(m.id, day, slot) }); }
    }
  }
  return out.sort((a, b) => a.ts - b.ts || a.m.name.localeCompare(b.m.name));
}
const prnLive = (medId, since) => { const all = doses().filter((d) => d.medId === medId && d.slot === "prn"); return all.filter((d) => d.ts >= since && !all.some((x) => x.corrects === d.id) && GIVEN.has(d.code)); };
const medsUnchecked = () => medsState().list.filter((m) => !m.stoppedAt && !m.checkedAt);
// Monthly, when the new month's medicines arrive and a new chart starts (Sam, 2026-10-16: copying last
// month's chart carried mistakes forward). Due from the 1st until someone checks the list against the boxes.
const monthStart = () => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); };
const medsListCheckDue = () => { const ms = medsState(), p = medsProfile(); return ms.list.some((m) => !m.stoppedAt) && (!p.listCheckedAt || p.listCheckedAt < monthStart()); };
// With one live-in carer there's often nobody else to check a change: the carer who made it can
// double-check it (reading the label again and typing the strength and dose, or the allergies). It
// still counts as not checked until the next carer checks it at handover.
const medSelfChecked = (m) => !!(m && m.selfCheck && m.selfCheck.of === m.updatedAt);
const profileSelfChecked = () => { const p = medsProfile(); return !!(p.selfCheck && p.selfCheck.of === p.updatedAt); };
const profileUnchecked = () => { const p = medsProfile(); return !!p.updatedAt && !p.checkedAt; };
const doseStatusHTML = (o) => {
  const st = o.st, last = st.last;
  if (st.twice) return `<span class="chip incident">Recorded twice: check</span> <span class="tiny muted">${st.given.map((d) => esc(doseBy(d)) + " " + fmtTime(d.ts)).join(", ")}</span>`;
  if (last) return `<span class="chip ${GIVEN.has(last.code) ? "accent" : "follow"}">${esc(doseLabel(last.code))}</span> <span class="tiny muted">${esc(doseBy(last))} ${fmtTime(last.ts)}${st.live.length > 1 ? " · offered again" : ""}</span>`;
  return o.ts < Date.now() - 60 * 60000 ? `<span class="chip incident">Not recorded${o.m.timeSensitive ? " (time-sensitive)" : ""}</span>` : o.ts <= Date.now() + 30 * 60000 ? '<span class="chip follow">Due</span>' : '<span class="chip">Later</span>';
};
const doseRowHTML = (o) => `<div class="item"><div class="when">${esc(o.slot)}</div><div class="body"><div><strong>${esc(medName(o.m))}</strong>${o.m.timeSensitive ? ' <span class="chip incident">On time</span>' : ""}${o.m.stoppedAt ? ' <span class="chip">Stopped</span>' : ""}</div><div class="muted small">${esc(o.m.dose)} · ${esc(o.m.route)}${o.day !== dayKey(new Date()) ? " · " + esc(dayLabel(o.ts)) : ""}</div>${labelMismatch(o.m) ? '<div class="small" style="color:var(--incident);font-weight:600">Label didn&#39;t match the list: check before giving</div>' : ""}<div style="margin-top:4px">${doseStatusHTML(o)}</div></div><button class="btn ${o.st.last ? "ghost" : "secondary"}" data-mdose="${esc(o.m.id)}|${esc(o.day)}|${esc(o.slot)}" style="min-height:44px;padding:8px 12px">${o.st.last ? "Open" : "Record"}</button></div>`;
// Today: this shift's doses, plus any dose from the last 24 hours still not recorded.
function dosesForToday() {
  const now = Date.now(), from = shiftStart();
  return dosesDue(now - 24 * 36e5, now + 60 * 60000).filter((o) => o.ts >= from || !o.st.last || o.st.twice);
}
/* ---------- medicine changes saved without signal (Sam, 2026-10-15 and 20) ----------
 * The medicine list lives in the cloud (one list for every carer, each change checked by someone else),
 * so a change made with no signal is kept on this phone, for this person and client, and shown as
 * "not on the chart yet" until it's sent. It's sent by itself when there's signal. If someone else
 * changed that medicine meanwhile it isn't sent: the carer sees the chart as it is now and decides.
 */
const medPending = () => (S.medPending = S.medPending || []);
let medPendingBusy = false;
const MED_SAME_SKIP = new Set(["changeReason", "photoId"]);
const medVal = (v) => JSON.stringify(typeof v === "string" ? v.trim() : Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x.trim() : x)) : v ?? "");
const sameMed = (cur, med) => Object.keys(med).filter((k) => !MED_SAME_SKIP.has(k)).every((k) => medVal(cur[k]) === medVal(med[k]));
async function sendMedPending() {
  if (medPendingBusy || !cloudOn() || !navigator.onLine || !medPending().some((p) => !p.problem)) return false;
  medPendingBusy = true; let changed = false; const key = KEY;
  try {
    for (const p of medPending().filter((x) => !x.problem)) {
      if (KEY !== key) break;
      try {
        await syncJSON("/plan/meds/save", { client: session.client.id, id: p.medId || undefined, baseUpdatedAt: p.medId ? p.baseUpdatedAt : undefined, newId: p.medId ? undefined : p.newId, med: p.med });
        S.medPending = medPending().filter((x) => x.id !== p.id); changed = true;
      } catch (e) {
        if (!e.status || e.status >= 500 || [401, 428, 429].includes(e.status)) break; // no connection, or the cloud busy or signed out: try again later
        // Changed meanwhile, or already saved by an earlier try whose answer was lost.
        if (e.status === 409 && p.medId) { medsState().at = 0; await loadMeds(true); const cur = medsState().list.find((m) => m.id === p.medId); if (cur && sameMed(cur, p.med)) { S.medPending = medPending().filter((x) => x.id !== p.id); changed = true; continue; } }
        p.problem = e.status === 409 ? "Someone else changed this medicine before your change was sent." : e.message || "It couldn't be saved."; changed = true;
      }
      saveLocal();
    }
  } finally { medPendingBusy = false; }
  if (changed && KEY === key) { medsState().at = 0; await loadMeds(true); }
  return changed;
}
function medPendingHTML() {
  const ps = medPending(); if (!ps.length || !cloudOn()) return "";
  return `<div class="warn small" style="display:grid;gap:8px;margin-bottom:8px"><strong>Saved on this phone, not on the chart yet</strong>
    ${ps.map((p) => `<div style="display:grid;gap:4px"><div>${p.medId ? "Change to" : "New medicine:"} <strong>${esc(medName(p.med))}</strong>, ${esc(p.med.dose || "")} · saved ${esc(dayLabel(p.ts).toLowerCase())} ${fmtTime(p.ts)}</div>
      ${p.problem ? `<div><strong>Not sent:</strong> ${esc(p.problem)} Open it to check it against the chart as it is now.</div>` : `<div>It goes on the chart when there's signal. Until then, record doses against the chart as it is, and say in a note what you gave.</div>`}
      <div class="row" style="gap:8px;flex-wrap:wrap">${p.problem ? `<button class="btn secondary" data-mpopen="${esc(p.id)}" style="min-height:40px">Open it</button>` : `<button class="btn secondary" data-mpsend style="min-height:40px">Send now</button>`}<button class="btn ghost" data-mpdrop="${esc(p.id)}" style="min-height:40px">Discard it</button></div></div>`).join("")}</div>`;
}
document.addEventListener("click", async (e) => {
  const t = e.target.closest && e.target.closest("[data-mpsend],[data-mpopen],[data-mpdrop]"); if (!t) return;
  if (t.hasAttribute("data-mpsend")) {
    if (!navigator.onLine) return toast("Still no signal: it's sent by itself when there is");
    if (medPendingBusy) return toast("Sending it now");
    t.disabled = true; const before = medPending().length, probs = medPending().filter((p) => p.problem).length;
    await sendMedPending(); render();
    const sent = before - medPending().length, newProbs = medPending().filter((p) => p.problem).length - probs;
    return toast(sent ? `Sent: on the chart now, waiting to be checked${medPending().length ? ". Something is still waiting." : ""}` : newProbs ? "Not sent: see the message on the change" : "Couldn't send it yet: it's sent by itself when there's signal");
  }
  const p = medPending().find((x) => x.id === (t.dataset.mpopen || t.dataset.mpdrop)); if (!p) return;
  if (t.dataset.mpdrop) return confirmInline(t, async () => {
    if (navigator.onLine) { medsState().at = 0; await loadMeds(true).catch(() => {}); }
    const there = medsState().list.find((m) => (p.medId ? m.id === p.medId : m.id === p.newId)), reached = there && sameMed(there, p.med);
    S.medPending = medPending().filter((x) => x.id !== p.id); saveLocal(); render();
    toast(reached ? "It was already on the chart (the answer had been lost). Removed from this phone." : "Discarded: it isn't on the chart");
  }, "Tap again to discard it");
  medsState().at = 0; await loadMeds(true);
  const cur = p.medId ? medsState().list.find((m) => m.id === p.medId && !m.stoppedAt) : null;
  if (p.medId && !cur) return toast("That medicine is no longer on the list. Discard this, or add it again.");
  openMedEdit(cur, null, `<strong>Not sent:</strong> ${esc(p.problem)} The form shows your ${cur ? "change" : "new medicine"}${cur ? `; the chart now says ${esc(medName(cur))}, ${esc(cur.dose || "")}` : ""}. Check it against the label, then save.`, p);
});
function medsCardHTML() {
  const ms = medsState(), p = medsProfile(), active = ms.list.filter((m) => !m.stoppedAt);
  if (!cloudOn()) return "";
  // No medicines yet: still shown, so the chart is easy to find (Sam, 2026-10-15: "can't find it").
  if (!active.length && p.mode !== "self") return ms.at ? `<div class="card"><div class="card-h"><h3>Medicines</h3><button class="link small" data-openmeds="list" style="min-height:44px">Open chart</button></div>
    <p class="small muted" style="margin:0 0 10px">No medicines on the chart yet. Add each one from the pharmacy label or prescription, or take a photo of it.</p>
    <button class="btn secondary block" data-maddfirst>Add the first medicine</button></div>` : "";
  const head = `<div class="card-h"><h3>Medicines</h3><button class="link small" data-openmeds style="min-height:44px">Open chart</button></div>`;
  const pcheck = profileUnchecked() ? `<button class="warn small" data-openmeds="details" style="display:block;width:100%;text-align:left;border:0;margin-bottom:8px">Medicines details changed by ${esc(p.updatedBy || "someone")} (who gives them${p.allergies ? ", allergies" : ""}): ${profileSelfChecked() ? `double-checked by ${esc(p.selfCheck.by)}; the next carer checks them at handover.` : "not yet checked."} Tap to ${p.mine && !profileSelfChecked() ? "double-check" : "check"}.</button>` : "";
  if (medsSelf()) return `<div class="card">${head}${pcheck}<p class="small muted" style="margin:0">${esc(S.client.name)} manages their own medicines. Nothing to record here.</p></div>`;
  const now = Date.now(), due = dosesForToday(), uc = medsUnchecked();
  const open = due.filter((o) => (!o.st.last && o.ts <= now + 30 * 60000) || o.st.twice).length;
  return `<div class="card">${head}
    ${p.allergies ? `<div class="small" style="margin:-4px 0 8px"><strong style="color:var(--incident)">Allergies:</strong> ${esc(p.allergies)}</div>` : ""}
    ${pcheck}
    ${uc.filter((m) => !medSelfChecked(m)).length ? `<button class="warn small" data-openmeds="list" style="display:block;width:100%;text-align:left;border:0;margin-bottom:8px">${uc.filter((m) => !medSelfChecked(m)).length} change${uc.filter((m) => !medSelfChecked(m)).length > 1 ? "s" : ""} to the list not yet checked against the label: ${esc(uc.filter((m) => !medSelfChecked(m)).map((m) => m.name).join(", "))}. Tap to check.</button>` : ""}
    ${uc.filter(medSelfChecked).length ? `<button class="warn small" data-openmeds="list" style="display:block;width:100%;text-align:left;border:0;margin-bottom:8px">Double-checked by the carer who changed them, to check at handover: ${esc(uc.filter(medSelfChecked).map((m) => `${m.name} (${m.selfCheck.by})`).join(", "))}. Tap to check against the label.</button>` : ""}
    ${medsListCheckDue() ? `<button class="warn small" data-openmeds="details" style="display:block;width:100%;text-align:left;border:0;margin-bottom:8px">Monthly medicines check due: check the new month's medicines against the list. Tap to check.</button>` : ""}
    <div class="list">${due.length ? due.map(doseRowHTML).join("") : '<div class="empty">No doses due this shift.</div>'}</div>
    ${active.some((m) => m.prn) ? '<button class="btn secondary block" data-mprn style="margin-top:10px">Give a when-required medicine</button>' : ""}
    ${open ? `<p class="tiny muted" style="margin:8px 0 0">${open} to record or check. Record each one at the time.</p>` : ""}
    <p class="tiny muted" style="margin:4px 0 0">List as of ${ms.at ? esc(dayLabel(ms.at).toLowerCase()) + " " + fmtTime(ms.at) : "never"}.</p></div>`;
}
function bindMeds(root, after) {
  root.querySelectorAll("[data-mdose]").forEach((b) => (b.onclick = () => { const [id, day, slot] = b.dataset.mdose.split("|"); openDoseSheet(id, day, slot, after); }));
  root.querySelectorAll("[data-mprn]").forEach((b) => (b.onclick = () => openPrnSheet(after)));
  root.querySelectorAll("[data-openmeds]").forEach((b) => (b.onclick = () => openMeds(b.dataset.openmeds || "today")));
  root.querySelectorAll("[data-maddfirst]").forEach((b) => (b.onclick = () => (medsSignedOff() ? openMedEdit(null, () => openMeds("list")) : openMeds("list")))); // the list explains a missing sign-off
}
function pushDose(rec) {
  S.doses = S.doses || [];
  for (const k of Object.keys(rec)) if (rec[k] === undefined || rec[k] === "") delete rec[k];
  S.doses.push({ id: uid(), ts: Date.now(), by: stampId(), ...rec });
  save();
}
// One scheduled dose: what to give, everything recorded already (NG67 1.7.6), then what happened.
// With an entry already there: "Offered again" (after a refusal) adds one; "Correct" replaces one.
function openDoseSheet(medId, day, slot, after, preset) {
  const m = medsState().list.find((x) => x.id === medId); if (!m) return toast("That medicine isn't on the list on this phone");
  const p = medsProfile(), st = doseState(m.id, day, slot), ts = slotTs(day, slot);
  const codes = p.mode === "prompt" ? ["P", "R", "NT", "NR", "M"] : ["T", "R", "NT", "NR", "M"];
  let code = "", mode = st.last ? "" : "new";
  const s = sheet(`${sheetHead(esc(medName(m)))}
    <div class="small" style="display:grid;gap:4px"><div><strong>${esc(m.dose)}</strong> · ${esc(m.route)} · ${esc(slot)} ${esc(dayLabel(ts).toLowerCase())}${m.timeSensitive ? ' · <span class="chip incident">Give on time</span>' : ""}</div>
      ${m.instructions ? `<div>${esc(m.instructions)}</div>` : ""}
      ${p.allergies ? `<div><strong style="color:var(--incident)">Allergies:</strong> ${esc(p.allergies)}</div>` : ""}
      ${!m.checkedAt ? `<div class="warn">This medicine's details haven't been checked against the label yet (changed by ${esc(m.updatedBy)}).</div>` : ""}
      ${labelMismatch(m) ? `<div class="warn" style="background:var(--incident-soft)"><strong>The last supply's label didn't match the list</strong> (${esc(labelMismatch(m).mismatch || "")}). Check with the pharmacy or GP before giving it.</div>` : ""}
      ${p.mode !== "prompt" && medsSignOffKnownNo() ? `<div class="warn"><strong>${esc(medsSignOffText())}</strong> Only give medicines if you're trained and assessed. You can still record what happened; giving it will be flagged for an administrator.</div>` : ""}
      ${ts > Date.now() + 60 * 60000 ? `<div class="warn">This dose isn't due until ${esc(slot)}${day !== dayKey(new Date()) ? " " + esc(dayLabel(ts).toLowerCase()) : ""}. Record it when it's given.</div>` : ""}</div>
    ${st.twice ? `<div class="warn small" style="background:var(--incident-soft)"><strong>Recorded as given twice.</strong> Check whether ${esc(S.client.name)} had it twice. If so, record an incident and get advice (GP or 111). If one entry is a mistake, correct it below.</div>` : ""}
    ${st.all.length ? `<div class="small" style="display:grid;gap:4px"><strong>Recorded for this dose</strong>${st.all.sort((a, b) => a.ts - b.ts).map((d) => `<div class="${st.live.includes(d) ? "" : "muted"}">${fmtTime(d.ts)} ${esc(doseLabel(d.code))}${d.amount ? " (" + esc(d.amount) + ")" : ""} · ${esc(doseBy(d))}${d.reason ? " · " + esc(d.reason) : ""}${d.corrects ? " · correction" : ""}${st.live.includes(d) ? "" : " · replaced"}</div>`).join("")}</div>
      <div class="seg" role="group" aria-label="What to record">${st.given.length ? "" : '<button data-dmode="again">Offered again</button>'}<button data-dmode="correct">Correct an entry</button></div>`
      : `<p class="small" style="margin:0">Check ${esc(S.client.name)} hasn't already taken it, then record what happened.</p>`}
    <div id="dsBody" ${st.last ? "hidden" : ""} style="display:grid;gap:12px">
      <label class="f" id="dsTargetBox" hidden>Which entry is wrong?<select id="dsTarget">${st.live.map((d) => `<option value="${esc(d.id)}">${fmtTime(d.ts)} ${esc(doseLabel(d.code))} · ${esc(doseBy(d))}</option>`).join("")}</select></label>
      <div class="row" style="gap:8px">${codes.map((c) => `<button class="btn secondary" data-code="${c}" style="flex:1 1 30%">${esc(doseLabel(c))}</button>`).join("")}</div>
      <details><summary class="small">Other codes</summary><div class="row" style="gap:8px;margin-top:8px">${["D", "C", "E", "O"].map((c) => `<button class="btn ghost" data-code="${c}" style="flex:1 1 45%">${esc(doseLabel(c))}</button>`).join("")}<button class="btn ghost" data-code="V" id="dsVoid" hidden style="flex:1 1 45%">Entered in error</button></div></details>
      ${variableDose(m.dose) ? `<label class="f" id="dsAmtBox" hidden>Amount given<input type="text" id="dsAmt" maxlength="40" placeholder="e.g. 2 tablets" autocomplete="off"></label>` : ""}
      <label class="f" id="dsWhyBox" hidden>Why?<input type="text" id="dsWhy" maxlength="300" placeholder="e.g. Said she felt sick" autocomplete="off"></label>
      <label class="f"><span id="dsNoteL">Note (optional)</span><input type="text" id="dsNote" maxlength="500" autocomplete="off"></label>
      <button class="btn primary block" id="dsSave" disabled>Save</button></div>`);
  const $s = (q) => $(q, s.root);
  s.root.querySelectorAll("[data-dmode]").forEach((b) => (b.onclick = () => {
    mode = b.dataset.dmode; s.root.querySelectorAll("[data-dmode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $s("#dsBody").hidden = false; $s("#dsTargetBox").hidden = mode !== "correct"; $s("#dsVoid").hidden = mode !== "correct";
    $s("#dsNoteL").textContent = mode === "correct" ? "What was wrong with that entry?" : "Note (optional)";
  }));
  s.root.querySelectorAll("[data-code]").forEach((b) => (b.onclick = () => {
    code = b.dataset.code;
    s.root.querySelectorAll("[data-code]").forEach((x) => x.classList.toggle("primary", x === b));
    $s("#dsWhyBox").hidden = !DOSE_NEEDS_WHY.has(code) || code === "V"; if ($s("#dsAmtBox")) $s("#dsAmtBox").hidden = !GIVEN.has(code);
    $s("#dsSave").disabled = false; $s("#dsSave").textContent = `Save: ${doseLabel(code)}`;
  }));
  $s("#dsSave").onclick = () => {
    const why = $s("#dsWhy").value.trim(), note = $s("#dsNote").value.trim(), amt = $s("#dsAmt") ? $s("#dsAmt").value.trim() : "";
    if (!code || !mode) return;
    if (DOSE_NEEDS_WHY.has(code) && code !== "V" && !why) return toast("Say why");
    if (mode === "correct" && !note) return toast("Say what was wrong with that entry");
    if (GIVEN.has(code) && variableDose(m.dose) && !amt) return toast("Write the amount given");
    // Re-read: another carer's entry may have arrived while this was open.
    const now = doseState(m.id, day, slot);
    if (mode !== "correct" && GIVEN.has(code) && now.given.length) return toast(`Already recorded as given by ${doseBy(now.given[0])} at ${fmtTime(now.given[0].ts)}. Check before giving it again.`);
    pushDose({ medId: m.id, med: `${medName(m)}, ${m.dose}`, day, slot, code, amount: amt, reason: why, note, corrects: mode === "correct" ? $s("#dsTarget").value : undefined });
    if (code === "T") flagUnsignedGiven(m, `${slot} ${dayLabel(ts).toLowerCase()}`);
    s.close(); render(); if (after) after();
    toast(code === "R" ? "Recorded as refused. You could offer it again a little later." : `Recorded: ${doseLabel(code)}`);
  };
  if (preset && !st.last) { const b = s.root.querySelector(`[data-code="${preset}"]`); if (b) b.click(); } // suggested from a note: still checked and saved here
}
// A when-required dose: what for, how much, and how it fits the limits (warn, never block what happened).
function openPrnSheet(after, presetId) {
  const list = medsState().list.filter((m) => m.prn && !m.stoppedAt && medOnDay(m, dayKey(new Date()))), p = medsProfile();
  if (!list.length) return toast("No when-required medicines on the list");
  const s = sheet(`${sheetHead("When-required medicine")}
    <label class="f">Which medicine<select id="prM">${list.map((m) => `<option value="${esc(m.id)}" ${m.id === presetId ? "selected" : ""}>${esc(medName(m))}</option>`).join("")}</select></label>
    ${p.mode !== "prompt" && medsSignOffKnownNo() ? `<div class="warn small"><strong>${esc(medsSignOffText())}</strong> Only give medicines if you're trained and assessed; giving it will be flagged for an administrator.</div>` : ""}
    <div id="prInfo" class="small" style="display:grid;gap:6px"></div>
    <label class="f">What for?<input type="text" id="prFor" maxlength="200" placeholder="e.g. Pain in her knee" autocomplete="off"></label>
    <label class="f" id="prAmtBox" hidden>Amount given<input type="text" id="prAmt" maxlength="40" placeholder="e.g. 1 tablet" autocomplete="off"></label>
    <label class="f" id="prWhyBox" hidden>Why give it now?<input type="text" id="prWhy" maxlength="300" autocomplete="off"></label>
    <div class="row" style="gap:8px"><button class="btn primary" id="prGive" style="flex:1">${p.mode === "prompt" ? "Prompted" : "Given"}</button><button class="btn ghost" id="prNo" style="flex:1">Offered, refused</button></div>`);
  const $s = (q) => $(q, s.root);
  const check = (m) => {
    const now = Date.now(), day = prnLive(m.id, now - 24 * 36e5), lastD = prnLive(m.id, now - 72 * 36e5).sort((a, b) => b.ts - a.ts)[0];
    let warn = "";
    if (m.prnMax24 && day.length >= m.prnMax24) warn = `${day.length} doses given in the last 24 hours: the most allowed is ${m.prnMax24} doses.`;
    else if (lastD && m.prnMinHours && now - lastD.ts < m.prnMinHours * 36e5) warn = `Last given at ${fmtTime(lastD.ts)}${isToday(lastD.ts) ? "" : " " + dayLabel(lastD.ts).toLowerCase()}: it should be at least ${m.prnMinHours} hours apart (not before ${fmtTime(lastD.ts + m.prnMinHours * 36e5)}).`;
    return { warn, day, lastD };
  };
  const info = () => {
    const m = list.find((x) => x.id === $s("#prM").value), { warn, day, lastD } = check(m);
    $s("#prInfo").innerHTML = `<div><strong>${esc(m.dose)}</strong> · ${esc(m.route)}${m.prnFor ? ` · for ${esc(m.prnFor)}` : ""}</div>
      <div class="muted">${m.prnMinHours ? `At least ${m.prnMinHours} hours apart` : "No minimum gap given"}${m.prnMax24 ? `, at most ${m.prnMax24} doses in 24 hours` : ""}. ${lastD ? `Last given ${esc(dayLabel(lastD.ts).toLowerCase())} ${fmtTime(lastD.ts)} by ${esc(doseBy(lastD))}; ${day.length} dose${day.length === 1 ? "" : "s"} in the last 24 hours.` : "Not given in the last 3 days."}${navigator.onLine ? "" : " No signal: doses recorded on other phones may not show yet."}</div>
      ${m.instructions ? `<div>${esc(m.instructions)}</div>` : ""}${labelMismatch(m) ? `<div class="warn" style="background:var(--incident-soft)"><strong>The last supply's label didn't match the list.</strong> Check with the pharmacy or GP before giving it.</div>` : ""}${warn ? `<div class="warn"><strong>Check:</strong> ${esc(warn)} If you give it, say why: it goes under Needs attention and into the handover.</div>` : ""}`;
    if (!$s("#prFor").value) $s("#prFor").value = m.prnFor || "";
    $s("#prWhyBox").hidden = !warn; $s("#prAmtBox").hidden = !variableDose(m.dose);
  };
  $s("#prM").onchange = () => { $s("#prFor").value = ""; info(); };
  info();
  const store = (code) => { // not "save": that's the app's own save, used below
    const m = list.find((x) => x.id === $s("#prM").value), { warn } = check(m); // checked again at the moment of saving
    const why = $s("#prWhy").value.trim(), forWhat = $s("#prFor").value.trim(), amt = $s("#prAmt").value.trim();
    if (!forWhat) return toast("Say what it's for");
    if (code !== "R" && variableDose(m.dose) && !amt) { $s("#prAmtBox").hidden = false; return toast("Write the amount given"); }
    if (warn && code !== "R" && !why) { info(); return toast("Say why it's being given now"); }
    pushDose({ medId: m.id, med: `${medName(m)}, ${m.dose}`, day: dayKey(new Date()), slot: "prn", code, amount: code === "R" ? "" : amt, prnFor: forWhat, reason: code === "R" ? "Offered, refused" : "", note: warn && code !== "R" ? `${warn} Given because: ${why}` : "" });
    // Outside the limits: a To note flag so it reaches the handover and the administrators.
    if (warn && code !== "R") { S.flags.push({ id: uid(), ts: Date.now(), kind: "follow_up", title: `${m.name} given outside its limits`, detail: `${warn} Reason: ${why}`, status: "open", raisedBy: stampId() }); save(); }
    if (code === "T") flagUnsignedGiven(m, `${fmtTime(Date.now())} when required`);
    s.close(); render(); if (after) after(); toast(code === "R" ? "Recorded as refused" : "Recorded");
  };
  $s("#prGive").onclick = () => store(p.mode === "prompt" ? "P" : "T");
  $s("#prNo").onclick = () => store("R");
}
// Correct a when-required entry (wrong medicine, entered in error...): a new entry that replaces it.
function openPrnCorrect(id, after) {
  const d = doses().find((x) => x.id === id); if (!d) return;
  const s = sheet(`${sheetHead("Correct an entry")}<p class="small" style="margin:0">${fmtTime(d.ts)} ${esc(d.med || "")}: ${esc(doseLabel(d.code))} · ${esc(doseBy(d))}</p>
    <label class="f">What should it say?<select id="pcCode"><option value="V">Entered in error (remove it)</option>${["T", "P", "R"].map((c) => `<option value="${c}">${esc(doseLabel(c))}</option>`).join("")}</select></label>
    <label class="f">What was wrong?<input type="text" id="pcWhy" maxlength="300" placeholder="e.g. Recorded against the wrong medicine" autocomplete="off"></label>
    <button class="btn primary block" id="pcSave">Save the correction</button>`);
  $("#pcSave", s.root).onclick = () => {
    const why = $("#pcWhy", s.root).value.trim(); if (!why) return toast("Say what was wrong");
    pushDose({ medId: d.medId, med: d.med, day: d.day, slot: "prn", code: $("#pcCode", s.root).value, prnFor: d.prnFor, note: why, corrects: d.id });
    s.close(); render(); if (after) after(); toast("Corrected");
  };
}
// The medicines screen: Today, the list, the monthly chart, and the client's medicines details.
function openMeds(tabName = "today") {
  if (!cloudOn()) return toast("The medicines chart needs a signed-in account");
  let tabNow = tabName;
  const s = sheet(`${sheetHead(`Medicines · ${esc(S.client.name)}`)}
    <div class="seg" role="group" aria-label="Medicines view">${[["today", "Today"], ["list", "List"], ["chart", "Chart"], ["details", "Details"]].map(([k, l]) => `<button data-mtab="${k}">${l}</button>`).join("")}</div>
    <div id="mdBody" style="display:grid;gap:12px"></div>`, { onClose: () => render() });
  const body = $("#mdBody", s.root), back = (t) => () => openMeds(t);
  const draw = () => {
    s.root.querySelectorAll("[data-mtab]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mtab === tabNow)));
    const ms = medsState(), p = medsProfile(), active = ms.list.filter((m) => !m.stoppedAt), stopped = ms.list.filter((m) => m.stoppedAt);
    if (tabNow === "today") {
      const d0 = new Date(); d0.setHours(0, 0, 0, 0); const d1 = new Date(d0); d1.setDate(d1.getDate() + 1); // next midnight, right on clock-change days
      const due = dosesDue(d0.getTime(), d1.getTime() - 1), prnAll = doses().filter((d) => d.slot === "prn" && d.day === dayKey(new Date()));
      const prn = prnAll.filter((d) => !prnAll.some((x) => x.corrects === d.id) && d.code !== "V").sort((a, b) => a.ts - b.ts);
      body.innerHTML = `${p.allergies ? `<div class="small"><strong style="color:var(--incident)">Allergies:</strong> ${esc(p.allergies)}</div>` : ""}
        <div class="card" style="box-shadow:none"><div class="list">${due.length ? due.map(doseRowHTML).join("") : '<div class="empty">No doses on the list for today.</div>'}</div></div>
        ${active.some((m) => m.prn) || prn.length ? `<div class="card" style="box-shadow:none"><div class="card-h"><h3>When required, today</h3></div>${prn.length ? prn.map((d) => `<div class="small" style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span>${fmtTime(d.ts)} <strong>${esc(d.med)}</strong>${d.amount ? " (" + esc(d.amount) + ")" : ""}${d.prnFor ? " for " + esc(d.prnFor) : ""}: ${esc(doseLabel(d.code))} · ${esc(doseBy(d))}${d.corrects ? " · correction" : ""}</span><span>${GIVEN.has(d.code) ? (outcomeFor(d.id) ? `<span class="tiny muted">${esc(outcomeFor(d.id).outcome)}</span>` : `<button class="link small" data-pout="${esc(d.id)}" style="min-height:44px">Did it help?</button>`) : ""} <button class="link small" data-pcorr="${esc(d.id)}" style="min-height:44px">Correct</button></span></div>`).join("") : '<div class="empty">None given today.</div>'}
          ${active.some((m) => m.prn) ? '<button class="btn secondary block" data-mprn style="margin-top:10px">Give a when-required medicine</button>' : ""}</div>` : ""}
        <p class="tiny muted" style="margin:0">List as of ${ms.at ? esc(dayLabel(ms.at).toLowerCase()) + " " + fmtTime(ms.at) : "never"}.</p>`;
      bindMeds(body, back("today"));
      body.querySelectorAll("[data-pcorr]").forEach((b) => (b.onclick = () => openPrnCorrect(b.dataset.pcorr, back("today"))));
      body.querySelectorAll("[data-pout]").forEach((b) => (b.onclick = () => openPrnOutcome(doses().find((x) => x.id === b.dataset.pout), back("today"))));
    } else if (tabNow === "list") {
      const card = (m) => `<div class="card" style="box-shadow:none;display:grid;gap:6px">
        <div><strong>${esc(medName(m))}</strong>${m.timeSensitive ? ' <span class="chip incident">On time</span>' : ""}${m.stoppedAt ? ' <span class="chip">Stopped</span>' : !m.checkedAt ? ` <span class="chip follow">${m.source === "verbal" && !m.writtenConfirmation ? "Waiting for written confirmation" : medSelfChecked(m) ? `Double-checked by ${esc(m.selfCheck.by)}: check at handover` : "Not yet checked"}</span>` : ""}</div>
        <div class="small">${esc(m.dose)} · ${esc(m.route)} · ${m.prn ? `when required${m.prnFor ? " for " + esc(m.prnFor) : ""}${m.prnMinHours ? `, ${m.prnMinHours} h apart` : ""}${m.prnMax24 ? `, at most ${m.prnMax24} doses in 24 h` : ""}` : esc((m.times || []).join(", "))}</div>
        ${m.instructions ? `<div class="small">${esc(m.instructions)}</div>` : ""}
        <div class="tiny muted">${m.prescriber ? "Prescribed by " + esc(m.prescriber) + " · " : ""}${m.startDate ? "from " + esc(m.startDate) : ""}${m.endDate ? " · stops " + esc(m.endDate) : ""}${m.reviewDate ? " · review " + esc(m.reviewDate) : ""}</div>
        <div class="tiny muted">From: ${esc(medSourceLabel(m.source))}${m.sourceDetail ? " (" + esc(m.sourceDetail) + ")" : ""}${m.source === "verbal" ? ` · asked by ${esc(m.verbalFrom)} at ${esc(m.verbalAt)}, read back${m.verbalRepeatedTo ? ", repeated to " + esc(m.verbalRepeatedTo) : ""}${m.writtenConfirmation ? " · in writing: " + esc(m.writtenConfirmation) : ""}` : ""} · ${m.stoppedAt ? "stopped" : "changed"} by ${esc(m.updatedBy)} ${esc(dayLabel(m.updatedAt).toLowerCase())} ${fmtTime(m.updatedAt)}${m.changeReason && !m.stoppedAt ? " · " + esc(m.changeReason) : ""}${m.stopReason ? " · " + esc(m.stopReason) : ""}${m.checkedAt ? ` · checked by ${esc(m.checkedBy)}` : ""}</div>
        ${m.stoppedAt && m.stopCheck ? `<div class="tiny ${m.stopCheck === "unchecked" ? "" : "muted"}" ${m.stopCheck === "unchecked" ? 'style="color:var(--incident)"' : ""}>Stopped: ${esc(m.stopReason || "")} · ${m.stopCheck === "now" ? "pharmacist or doctor said it can stop now" : m.stopCheck === "gradual" ? "pharmacist or doctor said to reduce it gradually" : "how to stop it not yet checked with a pharmacist or doctor"}${m.stopCheckWith ? " (" + esc(m.stopCheckWith) + ")" : ""}</div>` : ""}
        ${lastSupply(m.id) ? `<div class="tiny muted">Last supply: ${esc(lastSupply(m.id).qty)}${lastSupply(m.id).from ? " from " + esc(lastSupply(m.id).from) : ""}, ${esc(dayLabel(lastSupply(m.id).ts).toLowerCase())} · ${lastSupply(m.id).matches === "yes" ? "label matched" : "<strong>label didn't match</strong>"} · ${esc(doseBy(lastSupply(m.id)))}</div>` : ""}
        ${m.photoId && planDocs().some((d) => d.id === m.photoId) ? `<button class="link small" data-opendoc="${esc(m.photoId)}" style="justify-self:start;min-height:40px">Photo it was copied from</button>` : ""}
        ${m.stoppedAt ? "" : `<div class="row" style="gap:8px"><button class="btn ghost" data-msup="${esc(m.id)}" style="flex:1">Record a new supply</button><button class="btn ghost" data-mbox="${esc(m.id)}" style="flex:1">Check the box with a photo</button></div>`}
        ${m.stoppedAt || !medsSignedOff() ? "" : `<div class="row" style="gap:8px">${!m.checkedAt ? (m.mine ? (medSelfChecked(m) ? '<span class="tiny muted" style="align-self:center">You double-checked this. The next carer checks it against the label at handover.</span>' : `<span class="tiny muted" style="align-self:center;flex:1 1 100%">Someone who didn't change it should check this against the label. If you're the only carer here:</span><button class="btn primary" data-mself="${esc(m.id)}" style="flex:1 1 100%">Double-check it myself</button>`) : `<button class="btn primary" data-mcheck="${esc(m.id)}" style="flex:1 1 100%">${m.source === "verbal" && !m.writtenConfirmation ? "Written confirmation received" : "I've checked it against the label"}</button>`) : ""}
          <button class="btn secondary" data-medit="${esc(m.id)}" style="flex:1">Change</button><button class="btn ghost" data-mstop="${esc(m.id)}" style="flex:1">Stop</button></div>`}
        <button class="link small" data-mhist="${esc(m.id)}" style="justify-self:start;min-height:44px">Earlier versions</button></div>`;
      body.innerHTML = `${medPendingHTML()}${medsSignedOff() ? '<button class="btn primary block" id="mdAdd">Add a medicine</button>' : `<div class="warn small">${esc(medsSignOffText())} You can read the list and record supplies; adding, changing, stopping or checking medicines needs a sign-off from an administrator (Manage people).</div>`}
        ${active.length ? active.map(card).join("") : '<div class="empty">No medicines on the list yet.</div>'}
        ${stopped.length ? `<details><summary class="small">Stopped recently (${stopped.length})</summary>${stopped.map(card).join("")}</details>` : ""}`;
      if ($("#mdAdd", s.root)) $("#mdAdd", s.root).onclick = () => openMedEdit(null, back("list"));
      body.querySelectorAll("[data-msup]").forEach((b) => (b.onclick = () => openSupplySheet(ms.list.find((m) => m.id === b.dataset.msup), back("list"))));
      body.querySelectorAll("[data-mbox]").forEach((b) => (b.onclick = () => openBoxCheck(ms.list.find((m) => m.id === b.dataset.mbox), back("list"))));
      body.querySelectorAll("[data-medit]").forEach((b) => (b.onclick = () => openMedEdit(ms.list.find((m) => m.id === b.dataset.medit), back("list"))));
      body.querySelectorAll("[data-mself]").forEach((b) => (b.onclick = async () => {
        const m = ms.list.find((x) => x.id === b.dataset.mself);
        let written;
        if (m.source === "verbal" && !m.writtenConfirmation) {
          written = (window.prompt("This change was made by phone. Which written confirmation has arrived? (e.g. GP letter 12 Oct, new pharmacy label)") || "").trim();
          if (!written) return;
        }
        window.alert(`Double-check ${m.name}: pick up the pharmacy label or prescription and read it again. Type what it says, not what you remember.`);
        const typedStrength = m.strength ? window.prompt("What strength does the label say? (e.g. 10 mg)") : "";
        if (typedStrength === null) return;
        const typedDose = window.prompt("What dose does the label say? (e.g. 1 tablet)");
        if (typedDose === null) return;
        const out = await syncJSON("/plan/meds/confirm", { client: session.client.id, id: m.id, baseUpdatedAt: m.updatedAt, written, self: true, typedStrength, typedDose }).catch(() => ({ error: "No connection" }));
        if (out.error) return toast(out.error);
        Object.assign(m, out.med); saveLocal(); draw(); toast("Double-checked. The next carer checks it at handover.");
      }));
      body.querySelectorAll("[data-mcheck]").forEach((b) => (b.onclick = async () => {
        const m = ms.list.find((x) => x.id === b.dataset.mcheck);
        let written;
        if (m.source === "verbal" && !m.writtenConfirmation) {
          written = (window.prompt("Which written confirmation has arrived? (e.g. GP letter 12 Oct, new pharmacy label)") || "").trim();
          if (!written) return;
        } else if (!window.confirm(`Check ${medName(m)}, ${m.dose}, ${m.route}${m.prn ? ", when required" : ", at " + (m.times || []).join(", ")} against the label or prescription. Does it all match?`)) return;
        const out = await syncJSON("/plan/meds/confirm", { client: session.client.id, id: m.id, baseUpdatedAt: m.updatedAt, written }).catch(() => ({ error: "No connection" }));
        if (out.error) return toast(out.error);
        Object.assign(m, out.med); saveLocal(); draw(); toast("Checked");
      }));
      body.querySelectorAll("[data-mstop]").forEach((b) => (b.onclick = () => {
        const m = ms.list.find((x) => x.id === b.dataset.mstop);
        // Some medicines need reducing gradually, not stopping at once. The app doesn't say which: it asks
        // whether a pharmacist or doctor has said how to stop it, and an unchecked stop becomes a "to note" flag.
        const st = sheet(`${sheetHead("Stop " + esc(m.name))}<label class="f">Why is it stopping?<input type="text" id="stWhy" maxlength="300" placeholder="e.g. Course finished, GP letter 9 Oct" autocomplete="off"></label>
          <fieldset style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend class="small" style="font-weight:600;margin-bottom:6px">Some medicines need to be reduced gradually rather than stopped at once. Has a pharmacist or doctor said how to stop this one?</legend>
            <label class="check"><input type="radio" name="stChk" value="now"><span>Yes: they said it can stop now</span></label>
            <label class="check"><input type="radio" name="stChk" value="gradual"><span>Yes: they said to reduce it gradually (add the reducing doses to the list as they said)</span></label>
            <label class="check"><input type="radio" name="stChk" value="unchecked"><span>Not checked yet</span></label></fieldset>
          <label class="f" id="stWithBox" hidden>Who said so?<input type="text" id="stWith" maxlength="120" placeholder="e.g. Boots pharmacist, Dr Patel by phone 12 Oct" autocomplete="off"></label>
          <button class="btn danger block" id="stGo">Stop this medicine</button>`);
        st.root.querySelectorAll('[name="stChk"]').forEach((r) => (r.onchange = () => { $("#stWithBox", st.root).hidden = r.value === "unchecked"; }));
        $("#stGo", st.root).onclick = async () => {
          const why = $("#stWhy", st.root).value.trim(); if (!why) return toast("Say why");
          const chk = (st.root.querySelector('[name="stChk"]:checked') || {}).value;
          if (!chk) return toast("Say whether a pharmacist or doctor has said how to stop it");
          const withWho = $("#stWith", st.root).value.trim();
          if (chk !== "unchecked" && !withWho) return toast("Say who said so");
          const out = await syncJSON("/plan/meds/stop", { client: session.client.id, id: m.id, baseUpdatedAt: m.updatedAt, reason: why, stopCheck: chk, stopCheckWith: withWho }).catch(() => ({ error: "No connection" }));
          if (out.error) return toast(out.error);
          if (chk === "unchecked") { S.flags.push({ id: uid(), ts: Date.now(), kind: "follow_up", title: `Stopping ${m.name}: not yet checked`, detail: `${m.name} was stopped (${why}). Not yet checked with a pharmacist or doctor whether it should have been reduced gradually rather than stopped at once.`, status: "open", raisedBy: stampId() }); save(); }
          medsState().at = 0; await loadMeds(true); st.close(); render(); openMeds("list"); toast("Stopped");
        };
      }));
      body.querySelectorAll("[data-mhist]").forEach((b) => (b.onclick = async () => {
        const out = await syncJSON("/plan/meds/history", { client: session.client.id, id: b.dataset.mhist }).catch(() => ({ error: "No connection" }));
        if (out.error) return toast(out.error);
        sheet(`${sheetHead("Earlier versions")}${(out.history || []).length ? out.history.map((h) => `<div class="card small" style="box-shadow:none"><strong>${esc(medName(h))}</strong> · ${esc(h.dose)} · ${esc(h.route)} · ${h.prn ? "when required" : esc((h.times || []).join(", "))}<div class="tiny muted">Saved by ${esc(h.savedBy)} ${esc(dayLabel(h.savedAt).toLowerCase())} ${fmtTime(h.savedAt)} · from ${esc(medSourceLabel(h.source))}${h.changeReason ? " · " + esc(h.changeReason) : ""} · replaced by ${esc(h.replacedBy)} ${esc(dayLabel(h.replacedAt).toLowerCase())} ${fmtTime(h.replacedAt)}</div></div>`).join("") : '<div class="empty">No earlier versions.</div>'}`);
      }));
    } else if (tabNow === "chart") {
      body.innerHTML = `<div class="row" style="gap:8px"><button class="btn secondary" data-mmonth="0" style="flex:1">This month</button><button class="btn ghost" data-mmonth="-1" style="flex:1">Last month</button></div>
        <p class="small muted" style="margin:0">The monthly chart, like the paper one: each medicine and time down the side, days across, a code and initials in each box. Print it or save it as a PDF for the GP, pharmacist or an inspection.</p>`;
      body.querySelectorAll("[data-mmonth]").forEach((b) => (b.onclick = () => openMarChart(+b.dataset.mmonth)));
    } else {
      const uncheckedP = profileUnchecked();
      body.innerHTML = `${medsSignOffKnownNo() ? `<div class="warn small">${esc(medsSignOffText())} You can read these details; changing or checking them needs a sign-off from an administrator (Manage people).</div>` : ""}${uncheckedP ? `<div class="warn small">Changed by ${esc(p.updatedBy)} ${esc(dayLabel(p.updatedAt).toLowerCase())} ${fmtTime(p.updatedAt)}: ${profileSelfChecked() ? `double-checked by ${esc(p.selfCheck.by)}; the next carer checks them at handover.` : "not yet checked by a second person."}${p.mine && !profileSelfChecked() ? " Someone else should check it. If you're the only carer here, double-check it yourself." : ""}</div>${medsSignOffKnownNo() ? "" : p.mine ? (profileSelfChecked() ? "" : '<button class="btn primary block" id="mpSelfOk">Double-check it myself</button>') : '<button class="btn primary block" id="mpOk">I\'ve checked who gives the medicines and the allergies</button>'}` : ""}
        <form id="mdProf" style="display:grid;gap:12px">
        <label class="f">Who gives the medicines?<select id="mpMode"><option value="give" ${p.mode !== "prompt" && p.mode !== "self" ? "selected" : ""}>Carers give them</option><option value="prompt" ${p.mode === "prompt" ? "selected" : ""}>Carers remind or prompt only</option><option value="self" ${p.mode === "self" ? "selected" : ""}>${esc(S.client.name)} manages their own</option></select></label>
        <label class="check" id="mpSelfBox" ${p.mode === "self" ? "" : "hidden"}><input type="checkbox" id="mpSelf" ${p.selfLog ? "checked" : ""}><span>${esc(S.client.name)} would like carers to note their medicines anyway</span></label>
        <label class="f">Allergies<input type="text" id="mpAll" maxlength="300" value="${esc(p.allergies || "")}" placeholder="e.g. Penicillin, or None known"></label>
        <label class="f">Date of birth<input type="date" id="mpDob" value="${esc(p.dob || "")}"></label>
        <label class="f">${clientCountry() === "AU" ? "Medicare number (optional)" : "NHS number (optional)"}<input type="text" id="mpNhs" maxlength="20" value="${esc(p.nhs || "")}" autocomplete="off"></label>
        <label class="f">GP practice<input type="text" id="mpGp" maxlength="120" value="${esc(p.gpPractice || "")}"></label>
        <label class="f" id="mpWhyBox" hidden>Why are who gives the medicines or the allergies changing?<input type="text" id="mpWhy" maxlength="300" placeholder="e.g. Agreed with Peter (LPA) 11 Oct" autocomplete="off"></label>
        ${medsSignOffKnownNo() ? "" : '<button class="btn primary block">Save details</button>'}</form>
        <div class="card" style="box-shadow:none;display:grid;gap:8px"><h3 style="font-size:17px">Monthly check</h3>
          <p class="small" style="margin:0">${p.listCheckedAt ? `Last checked ${esc(dayLabel(p.listCheckedAt).toLowerCase())} by ${esc(p.listCheckedBy)}${p.listCheckNote ? `: ${esc(p.listCheckNote)}` : "."}` : "Not checked yet."} At the start of each month, when the new medicines arrive, check every box against the list. Don't copy last month's chart without checking it.</p>
          ${medsSignOffKnownNo() ? "" : `<label class="check"><input type="checkbox" class="mpTick"><span>Every medicine on the list has arrived</span></label>
          <label class="check"><input type="checkbox" class="mpTick"><span>The name, strength (mg) and dose on each box match the list</span></label>
          <label class="check"><input type="checkbox" class="mpTick"><span>I've looked for anything different from last month</span></label>
          <label class="f">Anything different or missing (optional)<input type="text" id="mpCheckNote" maxlength="300" placeholder="e.g. Amlodipine now 10 mg: list changed 2 Nov" autocomplete="off"></label>
          <button class="btn secondary" id="mpCheck">Monthly check done</button>`}</div>`;
      const safetyChanged = () => !!p.updatedAt && ($("#mpMode", s.root).value !== p.mode || $("#mpAll", s.root).value.trim() !== (p.allergies || "") || ($("#mpMode", s.root).value === "self" && $("#mpSelf", s.root).checked !== !!p.selfLog));
      const upd = () => { $("#mpSelfBox", s.root).hidden = $("#mpMode", s.root).value !== "self"; $("#mpWhyBox", s.root).hidden = !safetyChanged(); };
      ["#mpMode", "#mpAll", "#mpSelf"].forEach((q) => { $(q, s.root).oninput = upd; $(q, s.root).onchange = upd; });
      if ($("#mpSelfOk", s.root)) $("#mpSelfOk", s.root).onclick = async () => {
        const typedAllergies = window.prompt(`Check ${S.client.name}'s allergies again (with them, the family, or the GP or pharmacy record). Type them, or "None known":`);
        if (typedAllergies === null) return;
        const modes = { give: "Carers give them", prompt: "Carers remind or prompt only", self: `${S.client.name} manages their own` };
        const mode = ["prompt", "self"].includes(p.mode) ? p.mode : "give";
        if (!window.confirm(`Who gives the medicines: "${modes[mode]}". Have you checked this is right?`)) return;
        const out = await syncJSON("/plan/meds/profilecheck", { client: session.client.id, baseUpdatedAt: p.updatedAt, self: true, typedAllergies, typedMode: mode }).catch(() => ({ error: "No connection" }));
        if (out.error) return toast(out.error);
        medsState().profile = out.profile; saveLocal(); draw(); toast("Double-checked. The next carer checks them at handover.");
      };
      if ($("#mpOk", s.root)) $("#mpOk", s.root).onclick = (e) => confirmInline(e.currentTarget, async () => {
        const out = await syncJSON("/plan/meds/profilecheck", { client: session.client.id, baseUpdatedAt: p.updatedAt }).catch(() => ({ error: "No connection" }));
        if (out.error) return toast(out.error);
        medsState().profile = out.profile; saveLocal(); draw(); toast("Checked");
      }, "Tap again: they're right");
      $("#mdProf", s.root).onsubmit = async (e) => {
        e.preventDefault();
        const prof = { mode: $("#mpMode", s.root).value, selfLog: $("#mpMode", s.root).value === "self" && $("#mpSelf", s.root).checked, allergies: $("#mpAll", s.root).value.trim(), dob: $("#mpDob", s.root).value, nhs: $("#mpNhs", s.root).value, gpPractice: $("#mpGp", s.root).value };
        const reason = $("#mpWhy", s.root).value.trim();
        if (safetyChanged() && !reason) { upd(); return toast("Say why it's changing"); }
        const out = await syncJSON("/plan/meds/profile", { client: session.client.id, baseUpdatedAt: p.updatedAt || 0, profile: prof, reason }).catch(() => ({ error: "No connection" }));
        if (out.error) return toast(out.error);
        medsState().profile = out.profile; saveLocal(); draw(); toast(out.profile.checkedAt ? "Saved" : "Saved. Ask someone else to check it.");
      };
      if ($("#mpCheck", s.root)) $("#mpCheck", s.root).onclick = async () => {
        if ([...s.root.querySelectorAll(".mpTick")].some((c) => !c.checked)) return toast("Tick each check once you've done it");
        const out = await syncJSON("/plan/meds/listcheck", { client: session.client.id, note: $("#mpCheckNote", s.root).value.trim() }).catch(() => ({ error: "No connection. Try again when you have signal." }));
        if (out.error) return toast(out.error);
        medsState().profile = out.profile; saveLocal(); draw(); toast("Monthly check recorded");
      };
    }
  };
  s.root.querySelectorAll("[data-mtab]").forEach((b) => (b.onclick = () => { tabNow = b.dataset.mtab; draw(); }));
  draw();
  loadMeds(true).then((changed) => { if (changed && document.body.contains(body)) draw(); });
}
// Strict 24-hour times: "08:00", "8:00" or "0800". Bare numbers aren't guessed (an "8 15" would
// otherwise become two doses).
function parseMedTimes(text) {
  const out = [];
  for (const t of String(text || "").split(/[,;]+/).map((x) => x.trim()).filter(Boolean)) {
    const mm = t.match(/^(\d{1,2})[:.](\d{2})$/) || t.match(/^(\d{2})(\d{2})$/);
    if (!mm || +mm[1] > 23 || +mm[2] > 59) return null;
    out.push(`${mm[1].padStart(2, "0")}:${mm[2]}`);
  }
  return [...new Set(out)].sort();
}
// Add or change a medicine: where it came from is required every time (never carried over from the last
// version); a change also needs a reason.
// note: shown at the top (e.g. the differences a box check found), so the carer can correct the entry.
function openMedEdit(m, after, note = "", pend = null) {
  // pend: a change saved on this phone without signal, shown again to check and save.
  if (!pend && m) { pend = medPending().find((x) => x.medId === m.id) || null; if (pend) note = `${note ? note + "<br>" : ""}${pend.problem ? `<strong>Not sent:</strong> ${esc(pend.problem)} ` : ""}Your change saved on this phone (not on the chart yet) is shown.`; }
  const v = pend ? { route: "By mouth", times: [], ...(m || {}), ...pend.med } : m ? { ...m, source: "", sourceDetail: "", verbalFrom: "", verbalAt: "", readBack: false, verbalRepeatedTo: "" } : { times: [], route: "By mouth" };
  const s = sheet(`${sheetHead(m ? "Change " + esc(m.name) : "Add a medicine")}
    <p class="small muted" style="margin:0">Copy it exactly from the pharmacy label or prescription. ${m ? "The change" : "It"} shows as not yet checked until someone else confirms it against the label. If you're the only carer, double-check it yourself afterwards; the next carer checks it at handover. Pilot: made-up details only.</p>
    ${note ? `<div class="warn small">${note}</div>` : ""}
    <button class="btn secondary block" id="mePhoto" type="button">Fill in from a photo of the label or prescription</button>${photoInputHTML("mePhotoFile")}
    <div id="mePhotoMsg" style="display:grid;gap:8px" role="status"></div>
    <form id="meForm" style="display:grid;gap:12px">
      <label class="f">Medicine name<input type="text" id="meName" maxlength="80" value="${esc(v.name || "")}" placeholder="e.g. Amlodipine" autocomplete="off"></label>
      <div class="row" style="gap:8px"><label class="f" style="flex:1">Strength<input type="text" id="meStr" maxlength="60" value="${esc(v.strength || "")}" placeholder="e.g. 5 mg"></label><label class="f" style="flex:1">Form<input type="text" id="meForm2" maxlength="60" value="${esc(v.form || "")}" placeholder="e.g. tablets"></label></div>
      <label class="f">Dose<input type="text" id="meDose" maxlength="80" value="${esc(v.dose || "")}" placeholder="e.g. 1 tablet"></label>
      <label class="f">How it's taken<input type="text" id="meRoute" maxlength="40" value="${esc(v.route || "")}" placeholder="e.g. By mouth, patch, eye drops"></label>
      <label class="check"><input type="checkbox" id="mePrn" ${v.prn ? "checked" : ""}><span>When required (as needed), not at set times</span></label>
      <label class="f" id="meTimesBox">Times, 24-hour, separated by commas<input type="text" id="meTimes" value="${esc((v.times || []).join(", "))}" placeholder="e.g. 08:00, 18:00" autocomplete="off"><span class="tiny muted" id="meTimesSee"></span></label>
      <div id="mePrnBox" style="display:grid;gap:12px">
        <label class="f">What it's for<input type="text" id="mePrnFor" maxlength="120" value="${esc(v.prnFor || "")}" placeholder="e.g. Pain"></label>
        <div class="row" style="gap:8px"><label class="f" style="flex:1">Hours apart (at least)<input type="number" id="meMin" min="0" max="72" value="${esc(v.prnMinHours || "")}"></label><label class="f" style="flex:1">Most doses in 24 hours<input type="number" id="meMax" min="0" max="24" value="${esc(v.prnMax24 || "")}"></label></div>
        <p class="tiny muted" style="margin:-4px 0 0">Doses, not tablets: if the label says "no more than 8 tablets in 24 hours" and each dose is 2 tablets, that's 4 doses.</p></div>
      <label class="check"><input type="checkbox" id="meTs" ${v.timeSensitive ? "checked" : ""}><span>Time-sensitive: must be given on time (e.g. Parkinson's medicines)</span></label>
      <label class="f">Special instructions<input type="text" id="meIns" maxlength="300" value="${esc(v.instructions || "")}" placeholder="e.g. With food"></label>
      <label class="f">Prescriber<input type="text" id="mePre" maxlength="80" value="${esc(v.prescriber || "")}" placeholder="e.g. Dr Patel"></label>
      <div class="row" style="gap:8px"><label class="f" style="flex:1">Start<input type="date" id="meStart" value="${esc(v.startDate || "")}"></label><label class="f" style="flex:1">Stop (last day)<input type="date" id="meEnd" value="${esc(v.endDate || "")}"></label></div>
      <label class="f">Review date (optional)<input type="date" id="meRev" value="${esc(v.reviewDate || "")}"></label>
      <label class="f">Where ${m ? "this change" : "these details"} came from<select id="meSrc"><option value="">Choose…</option>${MED_SOURCES.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>
      <label class="f">Which one (optional)<input type="text" id="meSrcD" maxlength="200" placeholder="e.g. Boots label dated 3 October"></label>
      <div id="meVerbal" style="display:grid;gap:12px">
        <div class="warn small">A change by phone: write down who asked for it and when, read it back to them (spelling the medicine's name), ask them to repeat it to someone else if possible, and ask for it in writing. It's only checked once the written confirmation arrives.</div>
        <label class="f">Who asked for it<input type="text" id="meVFrom" maxlength="80" placeholder="e.g. Dr Patel, High Street Surgery"></label>
        <label class="f">When<input type="text" id="meVAt" maxlength="40" placeholder="e.g. 11 Oct 14:20"></label>
        <label class="f">Also repeated to (optional)<input type="text" id="meVRep" maxlength="80" placeholder="e.g. Peter (son)"></label>
        <label class="check"><input type="checkbox" id="meVRb"><span>I read it back to them and they confirmed it</span></label></div>
      ${m ? '<label class="f">Why is it changing?<input type="text" id="meWhy" maxlength="300" placeholder="e.g. GP increased the dose, letter 9 Oct"></label>' : ""}
      <label class="check" id="meAiOk" hidden><input type="checkbox" id="meAiChk"><span>I've checked every field against the label or prescription</span></label>
      <button class="btn primary block">${m ? "Save the change" : "Add to the list"}</button></form>`, { guard: () => true });
  const $s = (q) => $(q, s.root);
  const sync = () => {
    const prn = $s("#mePrn").checked; $s("#meTimesBox").hidden = prn; $s("#mePrnBox").hidden = !prn; $s("#meVerbal").hidden = $s("#meSrc").value !== "verbal";
    const t = parseMedTimes($s("#meTimes").value); $s("#meTimesSee").textContent = !$s("#meTimes").value.trim() ? "" : t ? `Doses at: ${t.join(", ")}` : "Type times like 08:00, 18:00";
  };
  $s("#mePrn").onchange = sync; $s("#meSrc").onchange = sync; $s("#meTimes").oninput = sync; sync();
  // Filled in from a photo: every field shown for checking; the ones the AI wasn't sure of are marked.
  let photoId = ""; // set only when this version is filled from a photo (a typed change isn't from the old photo)
  const FIELD_INPUT = { name: "#meName", strength: "#meStr", form: "#meForm2", dose: "#meDose", route: "#meRoute", times: "#meTimes", prnFor: "#mePrnFor", prnMinHours: "#meMin", prnMax24: "#meMax", instructions: "#meIns", prescriber: "#mePre", prn: "#mePrn" };
  const fill = (x, kind, docId) => {
    const set = (id, v) => { const el = $s(id); el.value = v; el.style.outline = "2px solid var(--follow, #d98a00)"; };
    const was = m ? norm2(m.name) + "|" + norm2(m.strength) : "", now = norm2(x.name) + "|" + norm2(x.strength);
    photoId = docId;
    set("#meName", x.name); set("#meStr", x.strength); set("#meForm2", x.form); set("#meDose", x.dose); set("#meRoute", x.route);
    $s("#mePrn").checked = !!x.prn; $s("#mePrn").closest("label").style.outline = "2px solid var(--follow, #d98a00)"; set("#meTimes", (x.times || []).join(", ")); set("#mePrnFor", x.prnFor || ""); set("#meMin", x.prnMinHours || ""); set("#meMax", x.prnMax24 || "");
    set("#meIns", x.instructions); set("#mePre", x.prescriber);
    for (const f of x.unsure || []) { const el = FIELD_INPUT[f] && $s(FIELD_INPUT[f]); if (el) { (el.type === "checkbox" ? el.closest("label") : el).style.outline = "3px solid var(--incident)"; el.closest("label").dataset.unsure = "1"; } }
    if (kind === "label" || kind === "prescription") $s("#meSrc").value = kind;
    if (!$s("#meSrcD").value) $s("#meSrcD").value = `Photo, ${fmtDay(Date.now())}`;
    $s("#meAiOk").hidden = false; $s("#meAiChk").checked = false; sync();
    const unsure = (x.unsure || []).map((f) => ({ name: "name", strength: "strength", form: "form", dose: "dose", route: "how it's taken", times: "times", prn: "when required", prnFor: "what it's for", prnMinHours: "hours apart", prnMax24: "most doses in 24 hours", instructions: "instructions", prescriber: "prescriber" })[f]).filter(Boolean);
    $s("#mePhotoMsg").innerHTML = `<div class="warn small"><strong>Filled in from the photo by AI.</strong> Check every field against the label before saving${unsure.length ? `; it wasn't sure about: <strong>${esc(unsure.join(", "))}</strong> (outlined in red)` : ""}. ${(x.times || []).length || x.prn ? "" : "Add the times it's given, as agreed with the pharmacist or GP: the label doesn't say."} ${x.prn && !x.prnMax24 ? "Add the most doses in 24 hours (doses, not tablets), as agreed with the pharmacist or GP." : ""} ${m && was !== now ? `<strong>This photo shows ${esc([x.name, x.strength].filter(Boolean).join(" "))}, not ${esc(medName(m))}.</strong> If it's a different medicine, close this and add it as a new one.` : ""} The other fields (time-sensitive, dates) aren't filled from the photo: check them too.</div>`;
  };
  $s("#mePhoto").onclick = () => $s("#mePhotoFile").click();
  $s("#mePhotoFile").onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const msg = $s("#mePhotoMsg"), b = $s("#mePhoto"); b.disabled = true;
    msg.innerHTML = '<p class="small" style="margin:0">Uploading and reading the photo… This can take a minute.</p>';
    try {
      const doc = await uploadMedPhoto(file, `Medicine label ${fmtDay(Date.now())}`);
      const r = await syncJSON("/plan/meds/read", { client: session.client.id, id: doc.id }, 180000);
      if (!msg.isConnected) return;
      const list = r.readable ? r.medicines || [] : [];
      if (!list.length) msg.innerHTML = `<div class="warn small">The photo couldn't be read as a medicine label or prescription. Try again in good light, with the label flat and in focus, or type it in.</div>`;
      else if (list.length === 1) fill(list[0], r.kind, doc.id);
      else {
        msg.innerHTML = `<p class="small" style="margin:0">This lists ${list.length} medicines. Choose the one to add now (add the others one at a time):</p>${list.map((x, i) => `<button class="btn secondary block" type="button" data-pick="${i}">${esc([x.name, x.strength].filter(Boolean).join(" ") || "Medicine " + (i + 1))}</button>`).join("")}`;
        msg.querySelectorAll("[data-pick]").forEach((p) => (p.onclick = () => fill(list[+p.dataset.pick], r.kind, doc.id)));
      }
    } catch (err) { if (msg.isConnected) msg.innerHTML = `<div class="warn small">${esc(err.message || "Couldn't read the photo. Try again, or type it in.")}</div>`; }
    b.disabled = false; e.target.value = "";
  };
  if (pend && $s("#meWhy")) $s("#meWhy").value = pend.med.changeReason || "";
  $s("#meForm").onsubmit = async (e) => {
    e.preventDefault();
    if (!$s("#meAiOk").hidden && !$s("#meAiChk").checked) { $s("#meAiChk").focus(); return toast("Check every field against the label, then tick the box"); }
    const prn = $s("#mePrn").checked, times = prn ? [] : parseMedTimes($s("#meTimes").value);
    if (!times) return toast("Times look wrong: type them like 08:00, 18:00");
    if (!$s("#meSrc").value) return toast("Choose where these details came from");
    const med = { name: $s("#meName").value, strength: $s("#meStr").value, form: $s("#meForm2").value, dose: $s("#meDose").value, route: $s("#meRoute").value, prn, times,
      prnFor: $s("#mePrnFor").value, prnMinHours: +$s("#meMin").value || 0, prnMax24: +$s("#meMax").value || 0, timeSensitive: $s("#meTs").checked,
      instructions: $s("#meIns").value, prescriber: $s("#mePre").value, startDate: $s("#meStart").value, endDate: $s("#meEnd").value, reviewDate: $s("#meRev").value,
      source: $s("#meSrc").value, sourceDetail: $s("#meSrcD").value, verbalFrom: $s("#meVFrom").value, verbalAt: $s("#meVAt").value, verbalRepeatedTo: $s("#meVRep").value, readBack: $s("#meVRb").checked,
      changeReason: m ? $s("#meWhy").value : "", photoId };
    const btn = e.submitter || $("#meForm button.primary", s.root); btn.disabled = true;
    const newId = pend && !pend.medId ? pend.newId : uid();
    // A change continued from one saved without signal keeps the version it was made from, so someone
    // else's newer change is never overwritten; after "Not sent", the carer has seen the chart as it is now.
    const base = m ? (pend && pend.medId && !pend.problem ? pend.baseUpdatedAt : m.updatedAt) : undefined;
    const out = await syncJSON("/plan/meds/save", { client: session.client.id, id: m ? m.id : undefined, baseUpdatedAt: base, newId: m ? undefined : newId, med }).catch((err) => (err.status ? { error: err.message } : { offline: true }));
    btn.disabled = false;
    if (out.offline) {
      // No signal: keep it on this phone (replacing an earlier unsent change to the same medicine).
      const keep = { id: pend ? pend.id : uid(), ts: Date.now(), medId: m ? m.id : "", baseUpdatedAt: base || 0, newId, med };
      S.medPending = [...medPending().filter((x) => x.id !== keep.id), keep]; saveLocal();
      s.close(); render(); return toast("No signal: saved on this phone. It goes on the chart when there's signal.");
    }
    if (out.error) return toast(out.error);
    if (pend) { S.medPending = medPending().filter((x) => x.id !== pend.id); saveLocal(); }
    medsState().at = 0; await loadMeds(true); s.close(); render(); toast(m ? "Changed. Ask someone else to check it against the label." : "Added. Ask someone else to check it against the label."); if (after) after();
  };
}
/* ---------- medicines from a photo (Sam, 2026-10-12) ----------
 * The AI copies what's printed on a label or prescription into the form, and compares a box with the
 * chart. It only reports what it read: the carer checks every field against the label and ticks that
 * they have, the medicine stays "not yet checked" until the usual check, and a box check never
 * replaces it. The photos are kept with the client's documents (kind "medicine").
 */
// Phone photos are made smaller (longest side 2000 px, JPEG) so they upload quickly and the AI can read them.
const BOX_FLAG = "Medicine box doesn't match the chart: ";
const norm2 = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9.]/g, "");
async function shrinkPhoto(file) {
  if (!/^image\//.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b || file), "image/jpeg", 0.85));
  } catch { return file; }
}
async function uploadMedPhoto(file, name) {
  const f = await shrinkPhoto(file), type = f.type || file.type;
  if (!/^(application\/pdf|image\/jpeg|image\/png)$/.test(type)) throw new Error("Use a photo (JPG or PNG) or a PDF");
  if (f.size > 10 * 1024 * 1024) throw new Error("That file is too big (over 10 MB)");
  const r = await syncFetch(`/plan/doc/put?client=${encodeURIComponent(session.client.id)}&kind=medicine&name=${encodeURIComponent(name.slice(0, 80))}`, { headers: { "Content-Type": type }, body: f, timeout: 120000 });
  const { doc } = await r.json(); S.plan = { ...plan(), docs: [doc, ...planDocs()] }; saveLocal();
  return doc;
}
const photoInputHTML = (id) => `<input type="file" id="${id}" accept="image/jpeg,image/png,application/pdf" capture="environment" hidden>`;
// Compare a photo of the box with the chart entry. A difference is added to Needs attention.
function openBoxCheck(m, after) {
  const s = sheet(`${sheetHead("Check the box: " + esc(medName(m)))}
    <p class="small" style="margin:0">Take a photo of the box or pharmacy label, showing the name, strength and directions. The AI compares it with the chart and lists any differences.</p>
    <div class="warn small">This helps you spot a mistake. It doesn't replace checking the label yourself, and it never counts as the check. Pilot: made-up medicines only.</div>
    <button class="btn primary block" id="bxGo">Take or choose a photo</button>${photoInputHTML("bxFile")}
    <div id="bxOut" style="display:grid;gap:10px" role="status"></div>`, { onClose: after });
  const out = $("#bxOut", s.root), go = $("#bxGo", s.root);
  go.onclick = () => $("#bxFile", s.root).click();
  $("#bxFile", s.root).onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    go.disabled = true; out.innerHTML = '<p class="small" style="margin:0">Uploading and comparing… This can take a minute.</p>';
    try {
      const doc = await uploadMedPhoto(file, `Box check: ${medName(m)} ${fmtDay(Date.now())}`);
      const cid = session.client.id, r = await syncJSON("/plan/meds/compare", { client: cid, id: doc.id, medId: m.id }, 180000);
      const diffs = r.differences || [], wrong = r.readable && (r.sameMedicine === "no" || diffs.length > 0);
      // Raised even if this sheet was closed meanwhile (same client); once while it's still open.
      let flagged = false;
      if (wrong && session && session.client && session.client.id === cid) {
        const title = `${BOX_FLAG}${medName(m)}`.slice(0, 190);
        if (!S.flags.some((x) => x.status === "open" && x.title === title)) {
          const detail = (r.sameMedicine === "no" ? "The box looks like a different medicine or strength. " : "") + diffs.map((d) => `${d.what}: box says "${d.box}", chart says "${d.chart}"`).join("; ");
          const f = { id: uid(), ts: Date.now(), kind: "follow_up", title, detail: (detail.slice(0, 1800) + ". Checked with a photo; check with the pharmacist or GP."), status: "open", noteId: null };
          touch(f); S.flags.push(f); save(); if (!out.isConnected) render();
        }
        flagged = true;
      }
      if (!out.isConnected) return;
      if (!r.readable) out.innerHTML = '<div class="warn small">The photo couldn\'t be read. Try again in good light, with the label flat and in focus.</div>';
      else {
        out.innerHTML = `${wrong ? `<div class="small" style="padding:10px 12px;border-radius:12px;background:var(--incident-soft);color:var(--incident);border:1px solid var(--incident)"><strong>${r.sameMedicine === "no" ? "This box looks like a different medicine or strength." : "The box and the chart don't match."}</strong> Don't give it from this box until it's been checked with the pharmacist or GP.</div>` : r.sameMedicine === "unsure" ? '<div class="warn small">The AI couldn\'t tell if this is the same medicine. Check the label yourself.</div>' : '<div class="small" style="padding:10px 12px;border-radius:12px;background:var(--done-soft, #e6f4ea)"><strong>No differences found.</strong> Still check the box yourself: the AI can miss things.</div>'}
          ${diffs.length ? `<div class="card" style="box-shadow:none;display:grid;gap:6px">${diffs.map((d) => `<div class="small"><strong>${esc(d.what)}</strong>: box says "${esc(d.box)}", chart says "${esc(d.chart)}"</div>`).join("")}</div>` : ""}
          ${(r.notOnBox || []).length ? `<p class="tiny muted" style="margin:0">Not on the box, so not compared: ${esc(r.notOnBox.join(", "))}.</p>` : ""}`;
        if (flagged) {
          out.insertAdjacentHTML("beforeend", '<p class="small" style="margin:0">Added to <strong>Needs attention</strong> on Today.</p>');
        }
      }
    } catch (err) { if (out.isConnected) out.innerHTML = `<div class="warn small">${esc(err.message || "Couldn't check the photo. Try again.")}</div>`; }
    go.disabled = false; go.textContent = "Take another photo"; e.target.value = "";
  };
}
// The monthly chart, laid out like the paper MAR, to read or print (Print → Save as PDF).
function openMarChart(monthOffset = 0) {
  const ms = medsState(), p = medsProfile(), first = new Date(); first.setDate(1); first.setHours(0, 0, 0, 0); first.setMonth(first.getMonth() + monthOffset);
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(), dk = (n) => dayKey(new Date(first.getFullYear(), first.getMonth(), n));
  const monthStart = dk(1), monthEnd = dk(daysIn);
  const inMonth = doses().filter((d) => d.day >= monthStart && d.day <= monthEnd);
  const meds = ms.list.filter((m) => inMonth.some((d) => d.medId === m.id) || ((!m.startDate || m.startDate <= monthEnd) && (!m.endDate || m.endDate >= monthStart) && (!m.stoppedAt || dayKey(new Date(m.stoppedAt)) >= monthStart)));
  // Rows: the medicine's times now, plus any time with entries this month (so a changed time keeps its history).
  const rows = meds.flatMap((m) => {
    const slots = m.prn ? ["prn"] : [...new Set([...(m.times || []), ...inMonth.filter((d) => d.medId === m.id && d.slot !== "prn").map((d) => d.slot)])].sort();
    return slots.map((slot, i) => ({ m, slot, first: i === 0, span: slots.length }));
  });
  const cell = (m, slot, n) => {
    const day = dk(n);
    if (slot === "prn") {
      const all = inMonth.filter((d) => d.medId === m.id && d.slot === "prn" && d.day === day), g = all.filter((d) => !all.some((x) => x.corrects === d.id) && d.code !== "V");
      return `<td title="${esc(g.map((d) => fmtTime(d.ts) + " " + doseLabel(d.code) + (d.amount ? " " + d.amount : "") + " " + doseBy(d)).join("; "))}">${g.map((d) => esc(d.code)).join(" ")}</td>`;
    }
    const st = doseState(m.id, day, slot), applies = (m.times || []).includes(slot) && medSlotApplies(m, day, slot);
    if (!st.last) return !applies ? '<td class="off"></td>' : slotTs(day, slot) < Date.now() - 60 * 60000 ? '<td class="miss" title="Not recorded">?</td>' : "<td></td>";
    if (st.twice) return `<td class="miss" title="Recorded as given twice: ${esc(st.given.map((d) => doseBy(d) + " " + fmtTime(d.ts)).join(", "))}">${esc(st.given[0].code)}×2</td>`;
    const r = st.last;
    return `<td class="c-${esc(r.code)}" title="${esc(doseLabel(r.code) + (r.amount ? " " + r.amount : "") + " · " + doseBy(r) + " " + fmtTime(r.ts) + (r.reason ? " · " + r.reason : "") + (r.med ? " · " + r.med : ""))}">${esc(r.code)}<span class="ini">${esc(initials.get(doseBy(r)) || initialsOf(doseBy(r)))}</span></td>`;
  };
  const people = [...new Set(inMonth.map((d) => doseBy(d)))].sort(), initials = new Map();
  for (const n of people) { let i = initialsOf(n), k = 2; while ([...initials.values()].includes(i)) i = initialsOf(n) + k++; initials.set(n, i); }
  const comments = inMonth.filter((d) => d.reason || d.note || d.corrects || d.amount || outcomeFor(d.id)).sort((a, b) => a.ts - b.ts);
  const root = $("#fullRoot");
  root.innerHTML = `<div class="full mar-print" role="dialog" aria-modal="true" aria-label="Medicines chart"><div class="wrap" style="max-width:none">
    <div class="row noprint" style="gap:8px;justify-content:space-between"><button class="btn ghost" id="mcClose">Close</button><button class="btn primary" id="mcPrint">Print or save as PDF</button></div>
    <h2 style="font-size:20px">Medication administration record (MAR) chart</h2>
    <div class="mar-head small"><div><strong>Patient:</strong> ${esc(S.client.name)}</div><div><strong>Date of birth:</strong> ${esc(p.dob || "")}</div><div><strong>${clientCountry() === "AU" ? "Medicare no." : "NHS no."}:</strong> ${esc(p.nhs || "")}</div>
      <div><strong>GP practice:</strong> ${esc(p.gpPractice || "")}</div><div><strong>Known allergies:</strong> ${esc(p.allergies || "None recorded")}</div><div><strong>Start:</strong> ${esc(monthStart)} <strong>End:</strong> ${esc(monthEnd)}</div></div>
    <div class="mar-wrap"><table class="mar"><thead><tr><th class="mn">Medication</th><th>Time</th>${Array.from({ length: daysIn }, (_, i) => `<th>${i + 1}</th>`).join("")}</tr></thead><tbody>
      ${rows.length ? rows.map((r) => `<tr>${r.first ? `<td class="mn" rowspan="${r.span}"><strong>${esc(medName(r.m))}</strong><br>${esc(r.m.dose)} · ${esc(r.m.route)}${r.m.prn ? `<br>When required${r.m.prnFor ? " for " + esc(r.m.prnFor) : ""}` : ""}${r.m.instructions ? "<br>" + esc(r.m.instructions) : ""}${r.m.stoppedAt ? "<br><em>Stopped " + esc(dayKey(new Date(r.m.stoppedAt))) + "</em>" : ""}</td>` : ""}<td>${r.slot === "prn" ? "PRN" : esc(r.slot)}${r.slot !== "prn" && !(r.m.times || []).includes(r.slot) ? "<br><em>(earlier time)</em>" : ""}</td>${Array.from({ length: daysIn }, (_, i) => cell(r.m, r.slot, i + 1)).join("")}</tr>`).join("") : `<tr><td colspan="${daysIn + 2}">No medicines on the list this month.</td></tr>`}
    </tbody></table></div>
    <p class="tiny">Codes: ${DOSE_CODES.filter(([c]) => c !== "V").map(([c, l]) => `${c} = ${l}`).join(" · ")}. ? = not recorded; ×2 = recorded as given twice. Small letters are the initials of who recorded it. The heading shows each medicine as it is now; earlier doses and strengths are in the comments and the medicine's earlier versions. Record at the time of administration.</p>
    ${comments.length ? `<h3 style="font-size:15px">Comments</h3><div class="tiny">${comments.map((d) => `<div>${esc(d.day)} ${d.slot === "prn" ? fmtTime(d.ts) : esc(d.slot)} ${esc(d.med || "")}: ${esc(doseLabel(d.code))}${d.amount ? " · " + esc(d.amount) : ""}${d.reason ? " · " + esc(d.reason) : ""}${d.prnFor ? " · for " + esc(d.prnFor) : ""}${d.note ? " · " + esc(d.note) : ""}${d.corrects ? " (correction)" : ""}${outcomeFor(d.id) ? " · outcome: " + esc(outcomeFor(d.id).outcome) : ""} · ${esc(doseBy(d))}</div>`).join("")}</div>` : ""}
    ${(() => { const sup = supplies().filter((x) => { const d = dayKey(new Date(x.ts)); return d >= monthStart && d <= monthEnd; }).sort((a, b) => a.ts - b.ts); return sup.length ? `<h3 style="font-size:15px">Supplies received</h3><div class="tiny">${sup.map((x) => `<div>${esc(dayKey(new Date(x.ts)))} ${esc(x.med || "")}: ${esc(x.qty)}${x.from ? " from " + esc(x.from) : ""} · label ${x.matches === "yes" ? "matched the list" : "DIDN'T MATCH: " + esc(x.mismatch || "")} · ${esc(doseBy(x))}</div>`).join("")}</div>` : ""; })()}
    <h3 style="font-size:15px">Careworker identification</h3>
    <table class="mar who"><thead><tr><th>Name</th><th>Initials</th></tr></thead><tbody>${people.length ? people.map((n) => `<tr><td>${esc(n)}</td><td>${esc(initials.get(n))}</td></tr>`).join("") : '<tr><td colspan="2">No entries yet.</td></tr>'}</tbody></table>
    <p class="tiny muted">Dignity Notes · printed ${esc(fmtDay(Date.now()))} ${fmtTime(Date.now())} · pilot, made-up data only</p></div></div>`;
  document.body.classList.add("printing-mar"); // only the chart prints while it's open
  $("#mcClose").onclick = () => { root.innerHTML = ""; document.body.classList.remove("printing-mar"); };
  $("#mcPrint").onclick = () => window.print();
}
// For the handover: every dose due this shift and what happened, any still not recorded, doses recorded
// twice, when-required doses, and changes not yet checked.
function medsForHandover() {
  const ms = medsState();
  if (!cloudOn() || !ms.list.length || medsSelf()) return [];
  const from = shiftStart(), now = Date.now(), out = [];
  for (const o of dosesDue(now - 24 * 36e5, now).filter((x) => x.ts >= from || !x.st.last || x.st.twice)) {
    const st = o.st, l = st.last;
    out.push(`${o.day !== dayKey(new Date()) ? dayLabel(o.ts) + " " : ""}${o.slot} ${medName(o.m)}: ${st.twice ? "RECORDED AS GIVEN TWICE - check" : l ? `${doseLabel(l.code)}${l.amount ? " (" + l.amount + ")" : ""}${l.reason ? " (" + l.reason + ")" : ""}, ${doseBy(l)}` : `NOT RECORDED${o.m.timeSensitive ? " (time-sensitive)" : ""}`}`);
  }
  for (const d of doses().filter((x) => x.slot === "prn" && x.ts >= from && x.code !== "V" && !doses().some((y) => y.corrects === x.id)).sort((a, b) => a.ts - b.ts)) out.push(`${fmtTime(d.ts)} ${d.med || "when-required medicine"} (when required${d.prnFor ? ", for " + d.prnFor : ""}): ${doseLabel(d.code)}${d.amount ? " (" + d.amount + ")" : ""}, ${doseBy(d)}${outcomeFor(d.id) ? "; outcome: " + outcomeFor(d.id).outcome : ""}`);
  const uc = medsUnchecked();
  if (uc.some((m) => !medSelfChecked(m))) out.push(`Not yet checked against the label: ${uc.filter((m) => !medSelfChecked(m)).map((m) => m.name).join(", ")}`);
  if (uc.some(medSelfChecked)) out.push(`Double-checked by the carer who changed them, not yet checked against the label by a second person: ${uc.filter(medSelfChecked).map((m) => `${m.name} (${m.selfCheck.by})`).join(", ")}`);
  if (profileUnchecked()) out.push(profileSelfChecked() ? `Medicines details (who gives them, allergies) double-checked by ${medsProfile().selfCheck.by}, not yet checked by a second person` : "Medicines details (who gives them, allergies) changed and not yet checked");
  if (medsListCheckDue()) out.push("Monthly medicines check is due (new month's medicines against the list)");
  return out;
}

// Am I signed off to support with medicines (NG67 1.11)? Worked out on the phone from the review date,
// so a sign-off that lapses while offline shows as lapsed. Unknown (not fetched yet) is not "no".
const medsMe = () => medsState().me || null;
const medsSignedOff = () => { const me = medsMe(); return !me || me.required === false || (typeof me.valid === "boolean" ? me.valid && (!me.reviewOn || me.reviewOn >= dayKey(new Date())) : !!me.competent && (!me.reviewOn || me.reviewOn >= dayKey(new Date()))); };
const medsSignOffKnownNo = () => !!medsMe() && !medsSignedOff();
/* ---------- medicines training certificates ----------
 * A carer uploads their certificate (or an administrator does it for them); another administrator
 * verifies it. A verified certificate for a course with a practical or observed assessment counts as
 * the medicines sign-off for a year (or to its expiry). A knowledge-only course still needs an observed
 * assessment recorded in Manage people. Only the person and administrators see a certificate.
 */
// required: whether this person needs a sign-off (agency carers). For private carers a certificate is a
// record: no expiry warnings, just a suggested refresher once it's over 3 years old.
const certStatus = (c, required = true) => !required
  ? `${c.verifiedAt ? `Checked by ${c.verifiedBy}` : "Kept on record"}${c.refresher ? ". Over 3 years old: a refresher course is recommended" : ""}`
  : !c.verifiedAt ? "Waiting for an administrator to verify it"
  : c.counts ? `Verified by ${c.verifiedBy}: counts as the medicines sign-off until ${c.reviewOn}`
  : !c.practical ? `Verified by ${c.verifiedBy}: a course without a practical assessment, so an observed assessment is still needed`
  : `Verified by ${c.verifiedBy}: over a year old or expired (${c.reviewOn}), so it needs renewing`;
const certRowHTML = (c, who, { admin = false, self = false, required = true } = {}) => `<div class="card" style="box-shadow:none;display:grid;gap:4px;padding:10px 12px">
  <div><strong>${esc(c.course)}</strong> <span class="muted small">· ${esc(c.issuer)} · ${esc(c.awardedOn)}${c.expiresOn && required ? " · expires " + esc(c.expiresOn) : ""}</span></div>
  <div class="small ${c.counts ? "" : "muted"}">${required && c.counts ? '<span class="chip accent">Counts</span> ' : ""}${!required && c.refresher ? '<span class="chip follow">Refresher</span> ' : ""}${esc(certStatus(c, required))}</div>
  <div class="tiny muted">Uploaded by ${esc(c.uploadedBy)} ${esc(dayLabel(c.uploadedAt).toLowerCase())}${c.practical ? " · includes a practical assessment" : " · knowledge only"}${c.verifyNote ? " · " + esc(c.verifyNote) : ""}</div>
  <div class="row" style="gap:8px"><button class="btn ghost" data-certview="${esc(who)}|${esc(c.id)}|${esc(c.type)}" style="flex:1">View</button>
    ${admin && !self ? `<button class="btn ${c.verifiedAt ? "ghost" : "primary"}" data-certverify="${esc(who)}|${esc(c.id)}" style="flex:1">${c.verifiedAt ? "Change check" : "Verify"}</button>` : ""}
    ${admin || !c.verifiedAt ? `<button class="btn ghost" data-certrm="${esc(who)}|${esc(c.id)}" style="flex:1">Remove</button>` : ""}</div></div>`;
// The app shows one sheet at a time, so each certificate sheet goes back to the screen it came from
// (Settings → Medicines training, or Manage people) when it closes, which also shows the change.
async function viewCert(who, id, type, back) {
  let url = "";
  const s = sheet(`${sheetHead("Certificate")}<div id="cvBody"><div class="recorder"><div class="spinner"></div></div></div>`, { onClose: () => { if (url) setTimeout(() => URL.revokeObjectURL(url), 60000); if (back) back(); } });
  try {
    const r = await syncFetch("/me/medscert/get", { body: JSON.stringify({ username: who, id }) }), blob = await r.blob();
    url = URL.createObjectURL(new Blob([blob], { type }));
    $("#cvBody", s.root).innerHTML = type.startsWith("image/") ? `<img src="${url}" alt="Certificate" style="width:100%;border-radius:10px;border:1px solid var(--line)">` : `<a class="btn primary block" href="${url}" target="_blank" rel="noopener">Open the PDF</a><button class="btn secondary block" data-sharepdf="${url}" data-name="certificate.pdf" style="margin-top:8px">Print or share</button>`;
  } catch (e) { if ($("#cvBody", s.root)) $("#cvBody", s.root).innerHTML = `<div class="warn">Couldn't open it: ${esc(e.message)}</div>`; }
}
function openCertUpload(who, back) {
  const s = sheet(`${sheetHead("Add a certificate")}
    <p class="small muted" style="margin:0">A photo or PDF of the medicines training certificate. An administrator checks it's genuine. Pilot: made-up details only.</p>
    <label class="f">Certificate (PDF, JPG or PNG, up to 10 MB)<input type="file" id="cuFile" accept="application/pdf,image/jpeg,image/png"></label>
    <label class="f">Course name<input type="text" id="cuCourse" maxlength="120" placeholder="e.g. Level 2 Certificate in Safe Handling and Administration of Medication"></label>
    <label class="f">Issued by<input type="text" id="cuIssuer" maxlength="80" placeholder="e.g. NQual, NCFE, or a registered training organisation"></label>
    <div class="row" style="gap:8px"><label class="f" style="flex:1">Date awarded<input type="date" id="cuDate" max="${dayKey(new Date())}"></label><label class="f" style="flex:1">Expires (if it says)<input type="date" id="cuExp"></label></div>
    <label class="check"><input type="checkbox" id="cuPrac"><span>The course included a practical or observed assessment of giving medicines</span></label>
    <button class="btn primary block" id="cuSave">Upload</button>`, { onClose: back, guard: () => !!$("#cuFile", document).files.length });
  const $s = (q) => $(q, s.root);
  $s("#cuSave").onclick = async () => {
    const f = $s("#cuFile").files[0];
    if (!f) return toast("Choose the certificate file");
    if (!/^(application\/pdf|image\/jpeg|image\/png)$/.test(f.type)) return toast("It must be a PDF, JPG or PNG");
    if (f.size > 10 * 1024 * 1024) return toast("Certificates can be up to 10 MB");
    const q = new URLSearchParams({ username: who || "", course: $s("#cuCourse").value.trim(), issuer: $s("#cuIssuer").value.trim(), awarded: $s("#cuDate").value, expires: $s("#cuExp").value, practical: $s("#cuPrac").checked ? "1" : "0" });
    $s("#cuSave").disabled = true;
    try { await syncFetch(`/me/medscert/put?${q}`, { headers: { "Content-Type": f.type }, body: f }); toast("Uploaded. An administrator will verify it."); if (medsState()) medsState().at = 0; s.close(); }
    catch (e) { toast(e.message); $s("#cuSave").disabled = false; }
  };
}
function openCertVerify(who, id, cert, back) {
  const s = sheet(`${sheetHead("Verify certificate")}
    <p class="small" style="margin:0"><strong>${esc(cert.course)}</strong> · ${esc(cert.issuer)} · ${esc(cert.awardedOn)}</p>
    <p class="small muted" style="margin:0">Open the certificate and check: it's this person's, it's genuine (check with the issuer if unsure), it's about giving medicines, and it's in date.</p>
    <p class="tiny muted" style="margin:0">${esc(cert.uploadedBy)} said it ${cert.practical ? "included" : "didn't include"} a practical assessment. Check the certificate or with the issuer yourself.</p>
    <label class="check"><input type="checkbox" id="cvPrac"><span>I've confirmed the course included a practical or observed assessment of giving medicines (then it counts as the sign-off)</span></label>
    <label class="f">Note (optional)<input type="text" id="cvNote" maxlength="200" placeholder="e.g. Checked with the awarding body" value="${esc(cert.verifyNote || "")}"></label>
    <div class="row" style="gap:8px"><button class="btn primary" id="cvYes" style="flex:1">It's genuine</button>${cert.verifiedAt ? '<button class="btn ghost" id="cvNo" style="flex:1">Not verified</button>' : ""}</div>`, { onClose: back });
  const send = async (verified) => {
    try { await relay("/me/medscert/verify", { username: who, id, verified, practical: $("#cvPrac", s.root).checked, note: $("#cvNote", s.root).value }); toast(verified ? "Verified" : "Marked not verified"); s.close(); }
    catch (e) { toast(e.message); }
  };
  $("#cvYes", s.root).onclick = () => send(true);
  if ($("#cvNo", s.root)) $("#cvNo", s.root).onclick = () => send(false);
}
function bindCerts(root, list, back, redraw) {
  root.querySelectorAll("[data-certview]").forEach((b) => (b.onclick = () => { const [w, id, type] = b.dataset.certview.split("|"); viewCert(w, id, type, back); }));
  root.querySelectorAll("[data-certverify]").forEach((b) => (b.onclick = () => { const [w, id] = b.dataset.certverify.split("|"); openCertVerify(w, id, list.find((c) => c.id === id), back); }));
  root.querySelectorAll("[data-certrm]").forEach((b) => (b.onclick = () => confirmInline(b, async () => {
    const [w, id] = b.dataset.certrm.split("|");
    try { await relay("/me/medscert/remove", { username: w, id }); toast("Removed"); if (medsState()) medsState().at = 0; redraw(); } catch (e) { toast(e.message); }
  }, "Tap again to remove")));
}
// Settings → Medicines training: your own sign-off and certificates.
async function openMyTraining() {
  const s = sheet(`${sheetHead("Medicines training")}<div id="mtBody" style="display:grid;gap:10px"><div class="recorder"><div class="spinner"></div></div></div>`, { onClose: openSettings });
  const draw = async () => {
    let me;
    try { me = (await syncJSON("/me/medscert/list", {})).meds || { certificates: [] }; }
    catch (e) { const b = $("#mtBody", s.root); if (b) b.innerHTML = `<div class="warn">Couldn't load your training: ${esc(e.message)}</div>`; return; }
    if (medsState()) medsState().me = me;
    const body = $("#mtBody", s.root); if (!body) return;
    const ok = me.valid || (me.competent && (!me.reviewOn || me.reviewOn >= dayKey(new Date())));
    body.innerHTML = `${me.required === false && !ok ? `<div class="card small" style="box-shadow:none"><strong>Private carer:</strong> you don't need a medicines training sign-off to use the medicines chart. Training is still a good idea, and you can keep your certificates here.</div>` : `<div class="${ok ? "card" : "warn"} small" style="${ok ? "box-shadow:none" : ""}">${ok ? `<strong>Signed off</strong> to support with medicines until ${esc(me.reviewOn)}${me.via === "certificate" ? " (from your verified certificate)" : me.assessor ? ` (assessed by ${esc(me.assessor)})` : ""}.` : "<strong>Not signed off yet.</strong> Upload your certificate; an administrator verifies it. A course without a practical assessment also needs someone to watch you give medicines, recorded by an administrator."}</div>`}
      ${(me.certificates || []).map((c) => certRowHTML(c, session.username, { admin: session.role === "admin", self: true, required: me.required !== false })).join("") || '<div class="empty">No certificates yet.</div>'}
      <button class="btn primary block" id="mtAdd">Add a certificate</button>`;
    bindCerts(body, me.certificates || [], openMyTraining, draw);
    $("#mtAdd", s.root).onclick = () => openCertUpload("", openMyTraining);
  };
  draw();
}

const medsSignOffText = () => { const me = medsMe() || {}; return me.competent ? `Your medicines sign-off was due for review on ${me.reviewOn}.` : "You're not signed off as trained to support with medicines."; };
// A dose given by someone not signed off is flagged for an administrator (whichever screen it came from).
function flagUnsignedGiven(m, when) {
  if (!medsSignOffKnownNo()) return;
  S.flags.push({ id: uid(), ts: Date.now(), kind: "follow_up", title: `Medicine given by a carer not signed off: ${m.name}`, detail: `${when}. ${medsSignOffText()} An administrator should check this and arrange training and assessment.`, status: "open", raisedBy: stampId() });
  save();
}
// A new supply arrives: what came, from where, and whether the label matches the list exactly.
const supplies = () => S.supplies || [];
const lastSupply = (medId) => supplies().filter((x) => x.medId === medId).sort((a, b) => b.ts - a.ts)[0];
const labelFlagTitle = (m) => `Label doesn't match the medicine list: ${m.name}`;
// Until its flag is resolved, a mismatched label shows wherever the medicine is given.
const labelMismatch = (m) => { const l = lastSupply(m.id); return l && l.matches === "no" && S.flags.some((f) => f.status === "open" && f.title === labelFlagTitle(m)) ? l : null; };
function openSupplySheet(m, after) {
  const s = sheet(`${sheetHead("New supply: " + esc(m.name))}
    <div class="small"><strong>On the list:</strong> ${esc(medName(m))} · ${esc(m.dose)} · ${esc(m.route)} · ${m.prn ? "when required" : esc((m.times || []).join(", "))}${m.instructions ? " · " + esc(m.instructions) : ""}</div>
    <label class="f">How much came<input type="text" id="suQty" maxlength="60" placeholder="e.g. 28 tablets, 1 box" autocomplete="off"></label>
    <label class="f">From<input type="text" id="suFrom" maxlength="80" placeholder="e.g. High Street Pharmacy" autocomplete="off"></label>
    <p class="small" style="margin:0">Check the pharmacy label against the list: name, strength, dose, how it's taken and when.</p>
    <div class="row" style="gap:8px"><button class="btn primary" id="suOk" style="flex:1">The label matches</button><button class="btn ghost" id="suNo" style="flex:1">Something's different</button></div>
    <label class="f" id="suDiffBox" hidden>What's different?<input type="text" id="suDiff" maxlength="300" placeholder="e.g. Label says 10 mg, the list says 5 mg" autocomplete="off"></label>
    <button class="btn danger block" id="suSaveNo" hidden>Save and flag it</button>`);
  const $s = (q) => $(q, s.root);
  const store = (matches) => { // not "save": that's the app's own save, used below
    const qty = $s("#suQty").value.trim(), from = $s("#suFrom").value.trim(), diff = $s("#suDiff").value.trim();
    if (!qty) return toast("Say how much came");
    if (matches === "no" && !diff) return toast("Say what's different");
    S.supplies = S.supplies || [];
    const rec = { id: uid(), ts: Date.now(), medId: m.id, med: `${medName(m)}, ${m.dose}`, qty, from, matches, mismatch: matches === "no" ? diff : undefined, by: stampId() };
    for (const k of Object.keys(rec)) if (rec[k] === undefined || rec[k] === "") delete rec[k];
    S.supplies.push(rec);
    // A label that doesn't match the list must reach the next carer and an administrator.
    if (matches === "no") S.flags.push({ id: uid(), ts: Date.now(), kind: "follow_up", title: labelFlagTitle(m), detail: `${diff}. Check with the pharmacy or GP before giving it; change the list only from the prescription or label. Resolve this flag once it's sorted.`, status: "open", raisedBy: stampId() });
    save(); s.close(); render(); if (after) after();
    toast(matches === "no" ? "Saved and flagged. Check with the pharmacy before giving it." : "Supply recorded");
  };
  $s("#suOk").onclick = () => store("yes");
  $s("#suNo").onclick = () => { $s("#suDiffBox").hidden = false; $s("#suSaveNo").hidden = false; $s("#suDiff").focus(); };
  $s("#suSaveNo").onclick = () => store("no");
}
// A time-sensitive dose not recorded an hour after its time is an incident (design section 8). Only from
// a phone with fresh data (signal, synced in the last 3 minutes, list fetched in the last 10), so a
// phone that's been offline doesn't raise it for a dose another carer recorded. The flag has a fixed id
// per dose, so phones raising it at the same time make one record, not two. The medicine's name is in
// the detail, not the title (family may see incident titles if incidents are shared with them).
function raiseMissedTimeSensitive() {
  if (!cloudOn() || medsSelf() || !navigator.onLine) return false;
  const now = Date.now(), ms = medsState();
  if (!syncState.last || now - syncState.last > 3 * 60000 || !ms.at || now - ms.at > 10 * 60000) return false;
  let added = false;
  for (const o of dosesDue(now - 24 * 36e5, now - 60 * 60000)) {
    if (!o.m.timeSensitive || o.st.last || !(o.m.times || []).includes(o.slot) || o.ts < (o.m.updatedAt || 0)) continue;
    const id = `tsmiss_${o.m.id}_${o.day}_${o.slot.replace(":", "")}`;
    if (S.flags.some((f) => f.id === id)) continue;
    S.flags.push({ id, ts: now, kind: "incident", title: "Time-sensitive medicine not recorded", detail: `${medName(o.m)}, ${o.m.dose}, due at ${o.slot} ${dayLabel(o.ts).toLowerCase()}, has no entry on the medicines chart an hour later. Check whether it was given; record it on the chart, and get advice (GP, pharmacist or ${clientCountry() === "AU" ? "healthdirect" : "111"}) if it was missed.`, status: "open", raisedBy: stampId() });
    added = true;
  }
  if (added) save();
  return added;
}
// From a saved note to the medicines chart. Deliberately cautious: a medicine counts only when the same
// sentence says it was given ("gave", "took", "had"...), and nothing in that sentence says it wasn't;
// a refusal is suggested as Refused. Only dose times up to 30 minutes after the note are offered, the
// latest unrecorded one first. Every suggestion opens the normal dose screen (with its checks and
// warnings): nothing goes on the chart without the carer confirming it there (design 4.3).
const NOTE_GIVEN = /(^|[^\p{L}])(gave|given|give|took|taken|take|had|has had|administered|swallowed|applied|put (?:on|in)|prompted|reminded|helped (?:her|him|them) (?:to )?take)([^\p{L}]|$)/iu;
const NOTE_REFUSED = /(^|[^\p{L}])(refus\w*|declin\w*|spat\w*|said no|wouldn'?t (?:take|have)|would not (?:take|have)|won'?t (?:take|have)|didn'?t (?:want|take)|did not (?:want|take))([^\p{L}]|$)/iu;
const NOTE_NOT = /(^|[^\p{L}])(no|not|never|didn'?t|did not|couldn'?t|could not|haven'?t|hasn'?t|run out|ran out|out of|reorder|missed|forgot|without|instead of)([^\p{L}]|$)/iu;
const NOTE_GENERIC = /(^|[^\p{L}])(tablets?|medication|medicines?|meds|capsules?|pills)([^\p{L}]|$)/iu;
// Every part of the name counts ("Vitamin D" needs the D), except units and the form.
const wordsOf = (name) => String(name || "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w && !/^(mg|mcg|ml|g|tablets?|capsules?|the|and|of)$/.test(w));
const hasWord = (text, w) => new RegExp(`(^|[^\\p{L}\\p{N}])${w}([^\\p{L}\\p{N}]|$)`, "iu").test(text);
function sentenceVerdict(sent) {
  if (NOTE_REFUSED.test(sent)) return "R";
  if (NOTE_NOT.test(sent)) return "";
  return NOTE_GIVEN.test(sent) ? "G" : "";
}
function medsFromNote(n) {
  const ms = medsState(), p = medsProfile();
  if (!cloudOn() || medsSelf() || !ms.list.some((m) => !m.stoppedAt)) return { items: [], unknown: [], stopped: [] };
  const sentences = String(n.note || "").split(/[.!?;\n]+/).map((x) => x.trim()).filter(Boolean), given = p.mode === "prompt" ? "P" : "T";
  const latestOpen = (m, back) => dosesDue(n.ts - back, n.ts + 30 * 60000).filter((o) => o.m.id === m.id && !o.st.last && (o.m.times || []).includes(o.slot)).sort((a, b) => b.ts - a.ts)[0];
  const items = [], seen = new Set(), stopped = [];
  for (const m of ms.list) {
    const ws = wordsOf(m.name); if (!ws.length) continue;
    const sent = sentences.find((x) => ws.every((w) => hasWord(x, w))); if (!sent) continue;
    const v = sentenceVerdict(sent); if (!v) continue;
    if (m.stoppedAt) { stopped.push(m); continue; }
    const code = v === "R" ? "R" : given;
    if (m.prn) { items.push({ m, prn: true, code }); seen.add(m.id); continue; }
    const o = latestOpen(m, 4 * 36e5); if (o) { items.push({ m, o, code }); seen.add(m.id); }
  }
  // "Gave her her morning tablets": doses due in the 2 hours before the note (or just after) not yet recorded.
  const gsent = sentences.find((x) => NOTE_GENERIC.test(x) && sentenceVerdict(x));
  if (gsent) {
    const code = sentenceVerdict(gsent) === "R" ? "R" : given;
    for (const m of ms.list.filter((x) => !x.stoppedAt && !x.prn && !seen.has(x.id))) { const o = latestOpen(m, 2 * 36e5); if (o) { items.push({ m, o, code }); seen.add(m.id); } }
  }
  // "Gave her aspirin" when aspirin isn't on the list: never added, only pointed out.
  const listed = ms.list.flatMap((m) => wordsOf(m.name)).filter((w) => w.length >= 3);
  const unknown = sentences.filter((x) => sentenceVerdict(x) === "G").flatMap((x) => [...x.matchAll(/\bgave (?:her|him|them) (?:some |her |his |their |a |an |the |two |one |\d+ )?([a-z]{5,})/gi)].map((y) => y[1].toLowerCase()))
    .filter((w) => !NOTE_GENERIC.test(w) && !listed.some((nm) => nm === w || nm.startsWith(w) || w.startsWith(nm)) && !/^(breakfast|lunch|dinner|supper|drink|water|coffee|juice|squash|soup|toast|porridge|biscuit|snack|bath|shower|wash|shave|haircut|massage|help|hand|lift|cuddle|morning|evening|night|medicine|medication|walk|change|clean|bed|blanket|dressing|cream|lotion|glass|cup|plate|bowl|kiss|call|lots|plenty|something|everything|another)/.test(w));
  return { items, unknown: [...new Set(unknown)], stopped };
}
function noteMedsHTML(n) {
  const { items, unknown, stopped } = medsFromNote(n);
  if (!items.length && !unknown.length && !stopped.length) return "";
  return `<div class="card" style="box-shadow:none;display:grid;gap:8px"><strong class="small">Medicines chart: from this note</strong>
    ${items.map((x, i) => `<div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span class="small">${x.prn ? "When required" : esc(x.o.slot)} <strong>${esc(medName(x.m))}</strong>: ${esc(doseLabel(x.code))}?</span>
      <button class="btn secondary" data-nmrec="${i}" style="min-height:44px;padding:6px 12px;flex:none">Check and record</button></div>`).join("")}
    ${stopped.length ? `<div class="warn small" style="background:var(--incident-soft)">The note mentions giving <strong>${stopped.map((m) => esc(m.name)).join(", ")}</strong>, which has been <strong>stopped</strong>. If it was given, record an incident and get advice (GP, pharmacist or ${clientCountry() === "AU" ? "healthdirect" : "111"}).</div>` : ""}
    ${unknown.length ? `<div class="warn small">Is this a medicine? <strong>${unknown.map(esc).join(", ")}</strong> isn't on ${esc(S.client.name)}'s medicine list, so it hasn't been added to the chart. If it is a medicine, tell an administrator and check with the GP or pharmacist.</div>` : ""}
    ${items.length ? '<p class="tiny muted" style="margin:0">Suggestions only. Each opens the dose screen to check and save; nothing is on the chart until you save it there.</p>' : ""}</div>`;
}
function bindNoteMeds(root, n, reopen) {
  const { items } = medsFromNote(n);
  root.querySelectorAll("[data-nmrec]").forEach((b) => (b.onclick = () => {
    const x = items[+b.dataset.nmrec]; if (!x) return;
    if (x.prn) return openPrnSheet(reopen, x.m.id);
    openDoseSheet(x.m.id, x.o.day, x.o.slot, reopen, x.code);
  }));
}
