// Dignity Notes: the emergency form, the current handover, contacts and the Today screen.
// Loaded by index.html after app.js, in order; shares its global scope (one app split into files).
"use strict";

/* ---------- emergency form ----------
 * A paramedic or doctor called to the home first asks whether there's a ReSPECT or DNR form (Sam,
 * 2026-10-12). Each client records which form there is and where the paper form is kept; shown on
 * Today, in Find, under Who to tell and on the handover. The paper form is the real one: the app only
 * says where to find it. Asked for when a client is added and after a hospital stay (a new ReSPECT
 * form comes with each discharge). Any carer on the client can update it; every version is kept.
 */
const EMERG_LABEL = { respect: "ReSPECT form", dnacpr: "DNACPR (DNR) form", acd: "Advance Care Directive", none: "No emergency form known", unknown: "Not known yet" };
const emergForm = () => (S.plan && S.plan.emergency) || null;
const emergHasForm = (e) => !!(e && ["respect", "dnacpr", "acd"].includes(e.form));
const emergText = (e) => (emergHasForm(e) ? `${EMERG_LABEL[e.form]}: kept ${e.where}` : EMERG_LABEL[e && e.form] || "Not recorded");
const emergChecked = (e) => (e ? `Checked ${fmtDay(e.at)}${e.by ? " by " + esc(e.by) : ""}` : "");
// The emergency form as a small tile in the shortcut row (Sam, 2026-10-16 and 18: the full-width banner
// took too much room; everyone knows the form, they just need to find where it's kept). Red when there
// is a form, amber when nobody has recorded it yet; the details are one tap away.
const EMERG_SHORT = { respect: "ReSPECT", dnacpr: "DNR form", acd: "Advance Care Directive" };
function emergTileHTML() {
  const e = emergForm(), r = respectDoc();
  if (emergHasForm(e)) return `<button class="tile emerg-tile" id="emBtn" aria-label="${esc(EMERG_LABEL[e.form])}: kept ${esc(e.where)}">${ICON.alert}${esc(EMERG_SHORT[e.form])}</button>`;
  if (e && e.form === "none") return `<button class="tile" id="emBtn" aria-label="No emergency form known">${ICON.alert}No form</button>`;
  if (r) return `<button class="tile emerg-tile" data-opendoc="${esc(r.id)}" aria-label="Emergency care plan">${ICON.alert}Emergency plan</button>`;
  return canEditPlan() && S.plan && Array.isArray(S.plan.sections) ? `<button class="tile emerg-ask" id="emBtn" aria-label="Record whether there's a ReSPECT or DNR form">${ICON.alert}ReSPECT?</button>` : "";
}
function openEmergency() {
  refreshContacts().catch(() => {}); // the cached list is shown now; the latest next time
  const e = emergForm(), r = respectDoc();
  const em = ((S.contacts && S.contacts.list) || []).filter((c) => c.group === "emergency" && c.phone);
  const s = sheet(`${sheetHead("Emergency form")}
    <div class="card" style="box-shadow:none;display:grid;gap:6px"><strong style="font-size:18px">${esc(EMERG_LABEL[e && e.form] || "Not recorded")}</strong>
      ${emergHasForm(e) ? `<div>Where the paper form is kept: <strong>${esc(e.where)}</strong></div>` : ""}
      ${e ? `<div class="tiny muted">${emergChecked(e)}</div>` : ""}</div>
    <p class="small muted" style="margin:0">The paper form is the real one: show it to the paramedic or doctor. This only says where to find it.</p>
    ${r ? `<button class="btn secondary block" data-opendoc="${esc(r.id)}">Open the copy in the care plan</button>` : ""}
    ${em.map((c) => `<a class="btn secondary block" href="${esc(telHref(c.phone))}">Call ${esc(c.name)}${c.role ? " (" + esc(c.role) + ")" : ""}</a>`).join("")}
    ${canEditPlan() ? `<button class="btn ${e ? "ghost" : "primary"} block" id="emEdit">${e ? "Change it" : "Record it"}</button>` : ""}`);
  if ($("#emEdit", s.root)) $("#emEdit", s.root).onclick = () => { s.close(); openEmergencyEdit(); };
}
// then: what to open next (after adding a client: the care plan set-up). why: a line explaining why it's asked.
function openEmergencyEdit({ then, why } = {}) {
  const e = emergForm() || {};
  const s = sheet(`${sheetHead("Emergency form")}
    ${why ? `<p class="small" style="margin:0">${why}</p>` : ""}
    <p class="small muted" style="margin:0">A paramedic or doctor will first ask if ${esc(S.client.name)} has ${clientCountry() === "AU" ? "an Advance Care Directive (in WA an Advance Health Directive; in Queensland a Statement of Choices) or a not-for-resuscitation order" : "a ReSPECT or DNR form"}. Record which form there is and where the paper form is kept. The paper form is the real one. Pilot: made-up details only.</p>
    <fieldset class="f" style="border:0;padding:0;margin:0;display:grid;gap:6px"><legend class="small" style="font-weight:700;margin-bottom:4px">Which form is there?</legend>
      ${Object.entries(EMERG_LABEL).map(([k, l]) => `<label class="small" style="display:flex;gap:8px;align-items:center;min-height:36px"><input type="radio" name="emF" value="${k}" ${e.form === k ? "checked" : ""}> ${l}</label>`).join("")}</fieldset>
    <label class="f" id="emWhereL">Where is the paper form kept?<input type="text" id="emWhere" maxlength="200" value="${esc(e.where || "")}" placeholder="e.g. on the fridge door, behind the front door" autocomplete="off"></label>
    <div class="small" id="emMsg" role="status"></div>
    <button class="btn primary block" id="emSave">Save</button>
    ${then ? '<button class="btn ghost block" id="emLater">Later</button>' : ""}`, { onClose: () => { if (then && !s.done) then(); } });
  const sync = () => { const f = (s.root.querySelector("[name=emF]:checked") || {}).value; $("#emWhereL", s.root).hidden = !emergHasForm({ form: f }); };
  s.root.querySelectorAll("[name=emF]").forEach((x) => (x.onchange = sync)); sync();
  if ($("#emLater", s.root)) $("#emLater", s.root).onclick = () => s.close();
  $("#emSave", s.root).onclick = async (ev) => {
    const form = (s.root.querySelector("[name=emF]:checked") || {}).value, where = $("#emWhere", s.root).value.trim();
    if (!form) return ($("#emMsg", s.root).textContent = "Choose which form there is.");
    if (emergHasForm({ form }) && !where) { $("#emWhere", s.root).focus(); return ($("#emMsg", s.root).textContent = "Say where the paper form is kept."); }
    if (!navigator.onLine) return ($("#emMsg", s.root).textContent = "Connect to the internet to save it, so every carer sees the same.");
    ev.currentTarget.disabled = true;
    try {
      const out = await syncJSON("/plan/emergency", { client: session.client.id, form, where: emergHasForm({ form }) ? where : "" });
      S.plan = { ...plan(), docs: planDocs(), emergency: out.emergency }; saveLocal(); s.done = true; s.close(); render(); toast("Emergency form saved");
      if (then) then();
    } catch (err) { $("#emMsg", s.root).textContent = err.message || "Couldn't save it. Try again."; const b = $("#emSave", s.root); if (b) b.disabled = false; }
  };
}
// Urgent and important care plan sections with no notes this shift (only once something has been noted).
function planGaps() {
  const titles = plan().sections.filter((x) => x.urgency === "urgent" || x.urgency === "important").map((x) => x.title); const notes = shiftNotes();
  // Only when every note this shift was checked against the care plan; otherwise "no notes" might be untrue.
  if (!titles.length || !notes.length || notes.some((n) => !Array.isArray(n.planSections))) return [];
  const covered = new Set(notes.flatMap((n) => n.planSections || []));
  return titles.filter((t) => !covered.has(t));
}

/* ---------- Today: the handover that's current ----------
 * The last handover is "current" only if nobody has recorded anything since. When notes were recorded
 * after it (the outgoing carer didn't hand over), the old handover is folded away and a summary of
 * those notes is shown instead, clearly marked as written by AI and not a carer's handover.
 */
const notesSinceHandover = (ho) => S.notes.filter((n) => !isExample(n) && Math.max(n.ts, n.approvedTs || 0) > (ho ? ho.ts : 0) && n.ts <= Date.now() && n.carerId !== stampId())
  .sort((a, b) => a.ts - b.ts).slice(-60);
let catchUpBusy = false;
function handoverCardHTML(ho) {
  const since = notesSinceHandover(ho);
  const hoHead = ho ? `${esc(carer(ho.fromId, ho.fromName).name)} · ${dayLabel(ho.ts)} ${fmtTime(ho.ts)}` : "";
  if (!since.length) return `<div class="card"><div class="card-h"><h3>Previous handover</h3>${ho ? `<span class="muted small">${hoHead}</span>` : ""}</div>
      ${ho ? `<p class="note-text clamp" style="white-space:pre-line">${esc(ho.text)}</p><button class="link small" data-unclamp aria-expanded="false" style="min-height:44px">Read all</button>` : '<div class="empty">No handover yet.</div>'}</div>`;
  const key = since.map((n) => n.id).join(",") + "|" + (ho ? ho.id : "");
  const c = S.catchUp && S.catchUp.key === key ? S.catchUp : null;
  if (!catchUpFresh(key)) setTimeout(() => makeCatchUp(ho, since, key), 0);
  const who = [...new Set(since.map((n) => carer(n.carerId, n.carerName).name))].join(", ");
  return `<div class="card"><div class="card-h"><h3>Since the last handover</h3><span class="muted small">${since.length} note${since.length > 1 ? "s" : ""} · ${esc(who)}</span></div>
      <div class="warn small" style="margin-bottom:10px">No handover was done after these notes. This is a summary of them${c && c.source === "ai" ? ", written by AI" : ""}, not a carer's handover. Check the Record log for the full notes.</div>
      ${c ? `<p class="note-text clamp" style="white-space:pre-line">${esc(c.text)}</p><button class="link small" data-unclamp aria-expanded="false" style="min-height:44px">Read all</button>` : '<p class="muted small">Summarising the notes…</p>'}
      ${ho ? `<details style="margin-top:10px"><summary class="small">Last handover: ${hoHead}</summary><p class="note-text" style="white-space:pre-line">${esc(ho.text)}</p></details>` : ""}</div>`;
}
// An AI summary is kept until new notes arrive; an offline one is retried at most every 10 minutes.
const catchUpFresh = (key) => !!(S.catchUp && S.catchUp.key === key && (S.catchUp.source === "ai" || Date.now() - (S.catchUp.at || 0) < 10 * 60000));
async function makeCatchUp(ho, since, key) {
  if (catchUpBusy || catchUpFresh(key)) return;
  catchUpBusy = true;
  const p = summaryPayload("handover", "");
  p.fromCarer = [...new Set(since.map((n) => carer(n.carerId, n.carerName).name))].join(", ");
  p.toCarer = onDuty().name; p.planGaps = [];
  p.notes = since.map((n) => ({ time: `${dayLabel(n.ts)} ${fmtTime(n.ts)}`, carer: carer(n.carerId, n.carerName).name, note: n.note }));
  let out;
  try {
    if (session && session.local) throw new Error("offline");
    const r = await relay("/summarise", p);
    if (!r || typeof r.text !== "string" || !r.text.trim()) throw new Error("Unexpected reply");
    out = { text: r.text, source: "ai" };
  } catch { out = { text: basicSummary(p), source: "basic" }; }
  catchUpBusy = false;
  S.catchUp = { key, text: out.text, source: out.source, at: Date.now() };
  saveLocal();
  if (tab === "today" && !appBusy() && !userIsReading()) render();
  else syncState.redraw = true; // shown when nothing is open (see the idle loop)
}


/* ---------- contacts ----------
 * Each client's important numbers (GP, pharmacy, family, attorney...), kept in the cloud and shared by
 * every carer on the client. Anyone on the client can add or change them; every change is kept with
 * who made it. The last list seen is kept on the phone, so it opens without signal.
 */
const CONTACT_GROUPS = [["emergency", "Emergency"], ["health", "Health (GP, pharmacy, nurses)"], ["family", "Family and attorney"], ["services", "Services and agency"], ["other", "Other"]];
const telHref = (n) => "tel:" + String(n).replace(/[^0-9+]/g, "");
async function refreshContacts() {
  if (!cloudOn() || !navigator.onLine) return false;
  const out = await syncJSON("/plan/contacts/list", { client: session.client.id });
  S.contacts = { list: out.contacts || [], at: Date.now() }; saveLocal();
  return true;
}
function openContacts() {
  const s = sheet(`${sheetHead("Contacts for " + esc(S.client.name))}
    <p class="small muted" style="margin:0">Important numbers for ${esc(S.client.name)}. Everyone who cares for ${esc(S.client.name)} sees the same list and can add or change it. Pilot: made-up details only.</p>
    <div id="ctList"></div><div class="small" id="ctMsg" role="status"></div>
    <button class="btn primary block" id="ctAdd">Add a contact</button>`);
  const draw = () => {
    const list = (S.contacts && S.contacts.list) || [];
    $("#ctList", s.root).innerHTML = list.length ? CONTACT_GROUPS.map(([g, label]) => {
      const inG = list.filter((c) => (c.group || "other") === g);
      return inG.length ? `<h4 class="small muted" style="margin:14px 0 6px">${esc(label)}</h4>` + inG.map((c) => `<div class="card" style="display:grid;gap:4px;padding:12px 14px">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><div><strong>${esc(c.name)}</strong>${c.role ? ` <span class="muted small">· ${esc(c.role)}</span>` : ""}</div>
          <button class="link" data-edit="${esc(c.id)}">Change</button></div>
        ${c.phone ? `<a class="btn secondary" style="justify-self:start" href="${esc(telHref(c.phone))}">Call ${esc(c.phone)}</a>` : ""}
        ${c.phone2 ? `<a class="btn ghost" style="justify-self:start" href="${esc(telHref(c.phone2))}">Call ${esc(c.phone2)}</a>` : ""}
        ${c.email ? `<a class="small" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ""}
        ${c.address ? `<div class="small" style="white-space:pre-line">${esc(c.address)}</div>` : ""}
        ${c.notes ? `<div class="small muted">${esc(c.notes)}</div>` : ""}
        <div class="tiny muted">Last changed by ${esc(c.updatedBy || "")} · ${esc(dayLabel(c.updatedAt))} ${esc(fmtTime(c.updatedAt))}</div></div>`).join("") : "";
    }).join("") : '<div class="empty">No contacts yet. Add the GP, pharmacy, family and anyone else carers may need to call.</div>';
    s.root.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => editContact(list.find((c) => c.id === b.dataset.edit), openContacts)));
    const offline = !cloudOn() || !navigator.onLine;
    $("#ctAdd", s.root).disabled = offline;
    if (offline) $("#ctMsg", s.root).textContent = S.contacts && S.contacts.at ? `No signal: this is the list from ${dayLabel(S.contacts.at)} ${fmtTime(S.contacts.at)}. Changes need signal.` : "No signal. Contacts need signal the first time.";
  };
  const reload = async () => { try { if (await refreshContacts()) { $("#ctMsg", s.root).textContent = ""; } } catch (e) { $("#ctMsg", s.root).textContent = "Couldn't update the list: " + e.message; } if ($("#ctList", s.root)) draw(); };
  $("#ctAdd", s.root).onclick = () => editContact(null, openContacts);
  draw(); reload();
}
function editContact(c, done) {
  const v = c || { group: "health" };
  const s = sheet(`${sheetHead(c ? "Change contact" : "Add a contact")}
    <label class="f">Name<input type="text" id="ceName" maxlength="80" value="${esc(v.name || "")}" placeholder="e.g. Dr Patel, Oak Street Surgery" autocomplete="off"></label>
    <label class="f">Who they are<input type="text" id="ceRole" maxlength="60" value="${esc(v.role || "")}" placeholder="e.g. GP, daughter, pharmacy" autocomplete="off"></label>
    <label class="f">Group<select id="ceGroup">${CONTACT_GROUPS.map(([g, l]) => `<option value="${g}" ${v.group === g ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
    <label class="f">Phone<input type="tel" id="cePhone" maxlength="40" value="${esc(v.phone || "")}" autocomplete="off"></label>
    <label class="f">Other phone (optional)<input type="tel" id="cePhone2" maxlength="40" value="${esc(v.phone2 || "")}" autocomplete="off"></label>
    <label class="f">Email (optional)<input type="email" id="ceEmail" maxlength="254" value="${esc(v.email || "")}" autocomplete="off"></label>
    <label class="f">Address (optional)<textarea id="ceAddress" class="grow" maxlength="200" rows="2">${esc(v.address || "")}</textarea></label>
    <label class="f">Notes (optional)<input type="text" id="ceNotes" maxlength="300" value="${esc(v.notes || "")}" placeholder="e.g. Out of hours: call 111" autocomplete="off"></label>
    <div class="small" id="ceMsg" role="status"></div>
    <button class="btn primary block" id="ceSave">Save</button>
    ${c ? '<button class="btn ghost block" id="ceRemove">Remove this contact</button>' : ""}`,
    // Saving, removing or closing goes back to the list (which reloads it).
    { guard: () => !saved && !!($("#ceName") && $("#ceName").value.trim()) && ($("#ceName").value.trim() !== (v.name || "")), onClose: () => setTimeout(() => done && done(), 0) });
  let saved = false;
  autoGrow($("#ceAddress", s.root));
  const msg = $("#ceMsg", s.root), bad = (t) => { msg.style.color = "var(--incident)"; msg.textContent = t; };
  const send = async (path, extra) => {
    try { await syncJSON(path, { client: session.client.id, ...(c ? { id: c.id, baseUpdatedAt: c.updatedAt } : {}), ...extra }); saved = true; s.close(); toast(path.endsWith("remove") ? "Contact removed" : "Contact saved"); }
    catch (e) { bad(e.message); $("#ceSave", s.root).disabled = false; }
  };
  $("#ceSave", s.root).onclick = () => {
    const contact = { name: $("#ceName", s.root).value.trim(), role: $("#ceRole", s.root).value.trim(), group: $("#ceGroup", s.root).value,
      phone: $("#cePhone", s.root).value.trim(), phone2: $("#cePhone2", s.root).value.trim(), email: $("#ceEmail", s.root).value.trim(),
      address: $("#ceAddress", s.root).value.trim(), notes: $("#ceNotes", s.root).value.trim() };
    if (!contact.name) return bad("Add a name.");
    if (!(contact.phone || contact.phone2 || contact.email || contact.address)) return bad("Add a phone number, email or address.");
    if (contact.email && !/^[^\s@]+@[^\s@]+$/.test(contact.email)) return bad("That email address doesn't look right.");
    $("#ceSave", s.root).disabled = true; send("/plan/contacts/save", { contact });
  };
  if (c) $("#ceRemove", s.root).onclick = (e) => confirmInline(e.currentTarget, () => send("/plan/contacts/remove", {}), "Tap again to remove");
}

// Yesterday's and today's notes on the opening screen (Sam): the newest in full, the rest as a line each.
function recentNotesHTML(latest) {
  if (!latest) return "";
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 1);
  const recent = S.notes.filter((n) => !isExample(n) && n.ts >= since.getTime() && n.id !== latest.id && !isNested(n)).sort((a, b) => b.ts - a.ts);
  const first = (t) => { const m = String(t || "").match(/^[^.!?]+[.!?]?/); return m ? m[0] : ""; };
  return `<div class="card"><div class="card-h"><h3>Latest note</h3><span class="muted small">${esc(carer(latest.carerId, latest.carerName).name)}${latest.extra ? " · extra assistance" : ""} · ${esc(dayLabel(latest.ts))} ${fmtTime(latest.ts)}</span></div><p class="note-text">${esc(latest.note)}</p>
    ${recent.length ? `<details style="margin-top:10px"><summary class="small"><strong>Yesterday and today: ${recent.length} more note${recent.length > 1 ? "s" : ""}</strong></summary>
      ${recent.slice(0, 15).map((n) => `<div style="border-top:1px solid var(--line);padding-top:8px;margin-top:8px"><div class="tiny muted">${esc(dayLabel(n.ts))} ${fmtTime(n.ts)} · ${esc(carer(n.carerId, n.carerName).name)}</div><p class="small" style="margin:4px 0 0">${esc(first(n.note))}</p></div>`).join("")}
      <button class="link small" id="recentLog" style="margin-top:8px">Earlier days, one at a time</button></details>` : ""}</div>`;
}

// Questions from the developer about feedback this person sent (worker/tools/feedback.mjs ask). Fetched
// when Today opens (at most every 5 minutes) and answered right here.
let fbQuestions = { list: [], at: 0, busy: false, drafts: {} }; // drafts: half-typed answers survive a refresh of Today
async function loadFbQuestions(force) {
  if (!session || session.local || !navigator.onLine || fbQuestions.busy || (!force && Date.now() - fbQuestions.at < 5 * 60000)) return false;
  fbQuestions.busy = true;
  try { const out = await relay("/feedback/questions", {}); const before = JSON.stringify(fbQuestions.list); fbQuestions.list = out.questions || []; fbQuestions.at = Date.now(); return before !== JSON.stringify(fbQuestions.list); }
  catch { return false; } finally { fbQuestions.busy = false; }
}
// Links to this app's own site in a developer message can be tapped (a document to download, say).
const ownLinks = (t) => esc(t).replace(/https:\/\/dignitynotes\.app\/[A-Za-z0-9._\/-]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>${/\.pdf$/i.test(u) ? ` <button class="link small" data-sharepdf="${u}" style="min-height:40px">Print or share</button>` : ""}`);
// Print a PDF (Sam, 2026-10-22): a PDF opened inside the installed app on an iPhone shows with no Share
// button, so there's no way to print. This hands the PDF to the phone's share sheet (Print, Save to Files,
// Mail, AirDrop); where a phone can't share files, it opens the PDF instead.
// An iPhone only shares straight after a tap, so if fetching the PDF took too long the button asks for one
// more tap (the PDF is ready by then).
const pdfFiles = new Map();
async function sharePdf(btn) {
  const url = btn.dataset.sharepdf, ready = pdfFiles.get(url);
  const share = async (file) => { try { await navigator.share({ files: [file] }); } catch (e) { if (e && e.name === "NotAllowedError" && !ready) { btn.textContent = "Ready: tap again to print or share"; return; } if (!e || e.name !== "AbortError") window.open(url, "_blank", "noopener"); } };
  if (ready) return share(ready);
  try {
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], btn.dataset.name || decodeURIComponent(url.split("/").pop()) || "document.pdf", { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { pdfFiles.set(url, file); return share(file); }
  } catch {}
  window.open(url, "_blank", "noopener"); // can't share files here: open it instead
}
document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-sharepdf]"); if (b) sharePdf(b); });
const fbQuestionsHTML = () => fbQuestions.list.map((q) => q.info ? `<div class="card" style="border-left:4px solid var(--accent)"><div class="card-h"><h3>A message from the developer</h3></div>
  <p style="margin:0 0 10px;white-space:pre-line">${ownLinks(q.q)}</p>
  <button class="btn secondary block" data-fbqseen="${esc(q.id)}|${esc(q.qid)}">Got it</button></div>` : `<div class="card" style="border-left:4px solid var(--accent)"><div class="card-h"><h3>A question about your ${q.kind === "bug" ? "problem report" : "idea"}</h3></div>
  ${q.summary ? `<p class="tiny muted" style="margin:0 0 6px">${esc(q.summary)}</p>` : ""}
  <p style="margin:0 0 10px;white-space:pre-line"><strong>${esc(q.q)}</strong></p>
  <textarea class="grow" data-fbqa="${esc(q.id)}|${esc(q.qid)}" maxlength="2000" rows="3" placeholder="Your answer" aria-label="Your answer" style="width:100%">${esc(fbQuestions.drafts[q.id + "|" + q.qid] || "")}</textarea>
  <button class="btn primary block" data-fbqsend="${esc(q.id)}|${esc(q.qid)}" style="margin-top:8px">Send answer</button></div>`).join("");
function bindFbQuestions(v) {
  v.querySelectorAll("[data-fbqa]").forEach((ta) => (ta.oninput = () => { fbQuestions.drafts[ta.dataset.fbqa] = ta.value; }));
  v.querySelectorAll("[data-fbqseen]").forEach((b) => (b.onclick = async () => {
    const [id, qid] = b.dataset.fbqseen.split("|"); b.disabled = true;
    try { await relay("/feedback/answer", { id, qid, seen: true }); fbQuestions.list = fbQuestions.list.filter((x) => !(x.id === id && x.qid === qid)); render(); }
    catch (e) { toast(e.message); b.disabled = false; }
  }));
  v.querySelectorAll("[data-fbqsend]").forEach((b) => (b.onclick = async () => {
    const [id, qid] = b.dataset.fbqsend.split("|"), ta = v.querySelector(`[data-fbqa="${CSS.escape(b.dataset.fbqsend)}"]`);
    const answer = (ta ? ta.value : "").trim(); if (!answer) return toast("Write your answer first");
    b.disabled = true;
    try { await relay("/feedback/answer", { id, qid, answer }); fbQuestions.list = fbQuestions.list.filter((x) => !(x.id === id && x.qid === qid)); delete fbQuestions.drafts[b.dataset.fbqsend]; toast("Thanks, your answer was sent"); render(); }
    catch (e) { toast(e.message); b.disabled = false; }
  }));
}
function renderToday() {
  const v = $("#view-today"); const now = new Date(); const h = now.getHours();
  const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  // Real entries first: the example day's times can be later than a carer's first real note.
  const real = (arr) => { const r = arr.filter((x) => x.source !== "example" && !DEMO_IDS.has(x.id)); return r.length ? r : arr; };
  const ho = [...real(S.handovers)].filter((h) => h.ts <= Date.now() + 10 * 60 * 1000).sort((a, b) => b.ts - a.ts)[0];
  const latest = [...real(S.notes)].sort((a, b) => b.ts - a.ts)[0];
  const sched = S.schedule.filter((s) => s.when > Date.now() - 6 * 36e5 && !s.cancelledTs).sort((a, b) => a.when - b.when);
  const flags = openFlags().sort((a, b) => (a.kind === "incident" ? -1 : 1) - (b.kind === "incident" ? -1 : 1) || b.ts - a.ts);
  const attn = [...formAttn().map(formAttnRowHTML), ...flags.map(attnRowHTML)];
  v.innerHTML = `
    <div class="hello"><h2>${greet}, ${esc(onDuty().name)}</h2><p>${fmtDay(Date.now())}${onDuty().shift ? " · " + esc(onDuty().shift) : ""}</p></div>
    ${storageBanner()}
    ${attendHTML()}
    ${catchupHTML()}
    <button class="cta" id="ctaRec">${ICON.mic}Record a note</button>
    ${isSharedPhone() ? `<p class="small" style="margin:-4px 0 0;text-align:center">Recording as <strong>${esc(session.name)}</strong> · <button class="link small" id="shSwitch" style="min-height:40px">Not you? Switch carer</button></p>` : ""}
    <div class="tiles">
      ${emergTileHTML() || `<button class="tile" id="qFind">${ICON.search}Find</button>`}
      <button class="tile" id="qContacts">${ICON.people}Contacts</button>
      <button class="tile" id="qPlan">${ICON.plan}Care plan</button>
      ${activeTransfer() ? `<button class="tile on" id="ctaBack">${ICON.out}Back in care</button>` : `<button class="tile" id="ctaOut">${ICON.out}Out with someone</button>`}
    </div>
    ${fbQuestionsHTML()}
    ${voiceCardHTML()}
    ${planProgressHTML()}
    ${familyReadyHTML()}
    <div class="card"><div class="card-h"><h3>Needs attention</h3><span class="count ${attn.length ? "" : "calm"}">${attn.length}</span></div>
      ${attn.length ? `<div class="attn">${(attnAll ? attn : attn.slice(0, 3)).join("")}</div>
        ${attn.length > 3 ? `<button class="link small" id="attnMore" style="margin-top:2px;min-height:44px">${attnAll ? "Show fewer" : `See all ${attn.length}`}</button>` : ""}`
        : '<div class="empty">Nothing outstanding. Flags from your notes appear here.</div>'}</div>
    ${tasksCardHTML()}
    ${medPendingHTML()}
    ${medsCardHTML()}
    ${handoverCardHTML(ho)}
    <div class="card"><div class="card-h"><h3>Coming up</h3></div>
      <div class="list">${sched.length ? sched.map((s) => `<div class="item ${s.when < Date.now() ? "past" : ""}" data-appt="${esc(s.id)}" role="button" tabindex="0" style="cursor:pointer"><div class="when">${fmtTime(s.when)}</div><div class="body"><div><strong>${esc(s.label)}</strong></div><div class="muted small">${dayLabel(s.when)}${s.detail ? " · " + esc(s.detail) : ""}</div></div></div>`).join("") : '<div class="empty">Nothing scheduled.</div>'}</div>
      <div style="margin-top:10px;display:flex;gap:16px;flex-wrap:wrap"><button class="link" id="evCal">Calendar</button></div></div>
    ${recentNotesHTML(latest)}`;
  $("#ctaRec").onclick = () => openRecorder();
  if ($("#shSwitch")) $("#shSwitch").onclick = () => switchCarer();
  $("#qContacts").onclick = () => openContacts();
  if ($("#qFind")) $("#qFind").onclick = () => openFind();
  bindTasks($("#view-today")); bindMeds(v); bindFbQuestions(v);
  v.querySelectorAll("[data-gofamily]").forEach((b) => (b.onclick = () => go("family")));
  autoFamilyUpdate().then((made) => { if (made && tab === "today" && !appBusy() && !userIsReading()) render(); }).catch(() => {});
  loadFbQuestions(false).then((changed) => { if (changed && tab === "today" && !appBusy() && !userIsReading()) render(); });
  loadMeds(false).then((changed) => { if (changed && tab === "today" && !appBusy() && !userIsReading()) render(); });
  if (raiseMissedTimeSensitive()) setTimeout(() => { if (tab === "today" && !appBusy()) render(); }, 0);
  if ($("#recentLog")) $("#recentLog").onclick = () => { const y = new Date(); y.setDate(y.getDate() - 1); logDay = dayKey(y); go("log"); }; // the diary, from yesterday
  $("#qPlan").onclick = () => openPlan();
  if ($("#plGuideGo")) $("#plGuideGo").onclick = () => openPlanGuide();
  if ($("#emBtn")) $("#emBtn").onclick = () => (emergForm() ? openEmergency() : openEmergencyEdit());
  bindStorageBanner(v); bindCatchup(v); bindVoiceCard(v);
  $("#evCal").onclick = () => openCalendar();
  if ($("#ctaOut")) $("#ctaOut").onclick = () => openTransferSheet();
  if ($("#atIn")) $("#atIn").onclick = () => openAttendTime("in");
  if ($("#atOut")) $("#atOut").onclick = () => openAttendTime("out");
  if ($("#atList")) $("#atList").onclick = () => openAttendance();
  if ($("#ctaBack")) $("#ctaBack").onclick = () => openReturnSheet();
  bindResolve(v);
  v.querySelectorAll("[data-unclamp]").forEach((b) => { const t = b.previousElementSibling; if (t && t.scrollHeight <= t.clientHeight + 2) { t.classList.remove("clamp"); b.hidden = true; } });
  if ($("#attnMore")) $("#attnMore").onclick = () => { attnAll = !attnAll; render(); };
}
// Needs attention on Today: a short row per flag; tap for the whole flag, Who to tell and Resolved.
let attnAll = false;
const attnRowHTML = (f) => `<button class="attn-row" data-flag="${esc(f.id)}"><span class="sdot ${f.status === "resolved" ? "done" : f.kind === "incident" ? "incident" : ""}"></span>
  <span class="body"><strong>${esc(f.title)}</strong><span class="tiny muted">${f.kind === "incident" ? "Incident" : "To note"} · ${esc(dayLabel(f.ts))} ${fmtTime(f.ts)}${f.status === "resolved" ? " · resolved" : ""}</span></span>${ICON.chev}</button>`;
// On an incident flag: Create incident report (or open it); on a skin flag: the skin integrity form.
function flagFormsHTML(f) {
  if (isFamily() || isExample(f)) return "";
  const have = formsForFlag(f.id), inc = have.find((r) => r.type === "incident"), skin = have.find((r) => r.type === "skin");
  return [f.kind === "incident" ? (inc ? `<button class="btn secondary block" data-openform="${esc(inc.formId)}">Open incident report ${esc(inc.ref)}</button>` : `<button class="btn secondary block" id="flIncident">Create incident report</button>`) : "",
    isSkinFlag(f) ? (skin ? `<button class="btn secondary block" data-openform="${esc(skin.formId)}">Open skin integrity form ${esc(skin.ref)}</button>` : `<button class="btn secondary block" id="flSkin">Complete skin integrity form</button>`) : ""].join("");
}
function openFlag(id) {
  const f = S.flags.find((x) => x.id === id); if (!f) return;
  // A box check that didn't match: the medicine it was about, so the chart can be corrected from here.
  const boxMed = f.title.startsWith(BOX_FLAG) && cloudOn() ? medsState().list.find((m) => !m.stoppedAt && f.title === `${BOX_FLAG}${medName(m)}`.slice(0, 190)) : null;
  const s = sheet(`${sheetHead(f.kind === "incident" ? "Incident" : "To note")}${flagHTML(f, false)}
    ${boxMed && f.status === "open" ? `<button class="btn primary block" id="flMedFix">Correct the medicine on the chart</button><p class="tiny muted" style="margin:-4px 0 0">Check the box or prescription first: correct the chart only if the chart is wrong. If the box is wrong, keep it aside and ask the pharmacist or GP.</p>` : ""}
    ${flagFormsHTML(f)}
    ${f.status === "open" ? `<button class="btn ${boxMed ? "secondary" : "primary"} block" id="flResolve">Mark as resolved</button>` : ""}`);
  if ($("#flIncident", s.root)) $("#flIncident", s.root).onclick = () => { s.close(); openFormEdit("incident", { flag: f }); };
  if ($("#flSkin", s.root)) $("#flSkin", s.root).onclick = () => { s.close(); openFormEdit("skin", { flag: f }); };
  if ($("#flMedFix", s.root)) $("#flMedFix", s.root).onclick = () => {
    if (!medsSignedOff()) { s.close(); return openMeds("list"); } // the list explains a missing sign-off
    s.close();
    openMedEdit(boxMed, () => {
      // Corrected: the flag is resolved with a reason; the earlier version stays in the medicine's history.
      const cur = S.flags.find((x) => x.id === id);
      if (cur && cur.status === "open") { Object.assign(cur, { status: "resolved", resolvedTs: Date.now(), resolvedBy: stampId(), resolvedNote: "Chart corrected to match the box" }); touch(cur); save(); render(); }
    }, `<strong>The box check found:</strong> ${esc(f.detail || "")} Change what's wrong, then say why (for example "Corrected to match the box: typed 500gm instead of 500mg").`);
  };
  if ($("#flResolve", s.root)) $("#flResolve", s.root).onclick = () => { s.close(); if (!S.flags.some((x) => x.id === id)) return toast("This flag is no longer on this phone"); openResolve(id); };
}
