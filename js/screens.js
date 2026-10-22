// Dignity Notes: Find, navigation, render, the incident checklist, storage safety.
// Loaded by index.html after app.js, in order; shares its global scope (one app split into files).
"use strict";

/* ---------- find ----------
 * One place to get to things quickly (Sam): the emergency care plan, care plan, documents and
 * contacts, plus a search across this client's notes, care plan, contacts, documents, flags,
 * appointments and handovers. Searches what's on this phone, so it works without signal.
 */
function findItems(q) {
  // Each word must start a word in the text ("tea" finds "tea" and "teatime", not "steady").
  const words = q.toLowerCase().split(/\s+/).filter(Boolean).map((w) => new RegExp("(^|[^\\p{L}\\p{N}])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"));
  const hit = (...parts) => { const t = parts.filter(Boolean).join(" ").toLowerCase(); return words.every((w) => w.test(t)); };
  const p = plan(), contacts = (S.contacts && S.contacts.list) || [];
  const byNew = (a, b) => b.ts - a.ts;
  return {
    contacts: contacts.filter((c) => hit(c.name, c.role, c.phone, c.phone2, c.email, c.address, c.notes)).slice(0, 10),
    meds: medsState().list.filter((m) => !m.stoppedAt && hit(m.name, m.strength, m.form, m.instructions, m.prnFor)).slice(0, 10),
    docs: planDocs().filter((d) => hit(d.name, DOC_KIND_LABEL[d.kind])).slice(0, 10),
    plan: p.sections.filter((x) => hit(x.title, x.text)).slice(0, 10),
    flags: S.flags.filter((f) => hit(f.title, f.detail, f.resolvedNote)).sort(byNew).slice(0, 10),
    events: S.schedule.filter((e) => hit(e.label, e.detail)).sort((a, b) => b.when - a.when).slice(0, 10),
    notes: S.notes.filter((n) => hit(n.note, n.transcript)).sort(byNew).slice(0, 30),
    handovers: S.handovers.filter((h) => hit(h.text)).sort(byNew).slice(0, 10),
    devMsgs: devMsgs.list.filter((m) => hit(m.text)).slice(0, 10),
  };
}
// Messages from the developer, kept after "Got it" so they can be found again (Sam, 2026-10-21).
const devMsgs = { list: [], at: 0 };
async function loadDevMsgs() {
  if (!session || session.local || !navigator.onLine || Date.now() - devMsgs.at < 60000) return false;
  try { const out = await relay("/feedback/messages", {}); devMsgs.list = out.messages || []; devMsgs.at = Date.now(); return true; } catch { return false; }
}
async function openDevMessages() {
  const s = sheet(`${sheetHead("Messages from the developer")}<input type="search" id="dmQ" placeholder="Search the messages" aria-label="Search the messages" autocomplete="off" style="width:100%"><div id="dmOut" style="display:grid;gap:8px"><div class="empty">Loading…</div></div>`);
  devMsgs.at = 0; await loadDevMsgs();
  const draw = () => {
    const q = $("#dmQ", s.root).value.trim().toLowerCase(), list = devMsgs.list.filter((m) => !q || q.split(/\s+/).every((w) => m.text.toLowerCase().includes(w)));
    $("#dmOut", s.root).innerHTML = list.length ? list.map((m) => `<div class="card" style="box-shadow:none;padding:10px 12px;display:grid;gap:4px"><span class="tiny muted">${esc(fmtDay(m.at))} ${fmtTime(m.at)}</span><p class="small" style="white-space:pre-line;margin:0">${ownLinks(m.text)}</p></div>`).join("")
      : `<div class="empty">${devMsgs.list.length ? "No message matches that." : navigator.onLine ? "No messages yet." : "Connect to the internet to see the messages."}</div>`;
  };
  $("#dmQ", s.root).oninput = draw; draw();
}
function openFind() {
  loadPlan();
  const r = respectDoc(), docs = planDocs();
  const s = sheet(`${sheetHead("Find")}
    <input type="search" id="fdQ" placeholder="Search notes, care plan, contacts…" aria-label="Search" autocomplete="off" enterkeyhint="search" style="width:100%">
    <div id="fdOut" style="display:grid;gap:12px"></div>`);
  const out = $("#fdOut", s.root);
  const head = (t, n) => `<h4 class="small muted" style="margin:6px 0 0">${t}${n ? ` (${n})` : ""}</h4>`;
  const when = (ts) => `${esc(dayLabel(ts))} ${fmtTime(ts)}`;
  const links = () => {
    out.innerHTML = `${emergForm() ? `<button class="btn ${emergHasForm(emergForm()) ? "primary" : "secondary"} block" data-go="emerg">${esc(emergText(emergForm()))}</button>` : ""}${r ? `<button class="btn primary block" data-opendoc="${esc(r.id)}">Emergency care plan</button>` : ""}
      <div class="list">
        <button class="btn secondary block fd-link" data-go="plan"><div class="body"><strong>Care plan</strong><div class="muted small">Needs, routines, risks and shift tasks</div></div></button>
        ${cloudOn() ? '<button class="btn secondary block fd-link" data-go="meds"><div class="body"><strong>Medicines chart</strong><div class="muted small">Doses, the medicine list and the monthly chart</div></div></button>' : ""}
        ${cloudOn() ? '<button class="btn secondary block fd-link" data-go="reports"><div class="body"><strong>Reports</strong><div class="muted small">Falls, fluids, food, bowels, urine, pain, sleep, behaviour and skin, made from the notes; incident reports</div></div></button>' : ""}
        <button class="btn secondary block fd-link" data-go="contacts"><div class="body"><strong>Contacts</strong><div class="muted small">GP, pharmacy, family and others</div></div></button>
        <button class="btn secondary block fd-link" data-go="log"><div class="body"><strong>Record log</strong><div class="muted small">Every note, flag and handover</div></div></button>
        <button class="btn secondary block fd-link" data-go="handover"><div class="body"><strong>Handover</strong><div class="muted small">The latest handover</div></div></button>
      </div>
      ${docs.length ? head("Documents") + `<div class="list">${docs.map((d) => `<button class="btn secondary block fd-link" data-opendoc="${esc(d.id)}"><div class="body"><strong>${esc(d.name)}</strong><div class="muted small">${esc(DOC_KIND_LABEL[d.kind] || "Document")}</div></div></button>`).join("")}</div>` : ""}
      <p class="tiny muted" style="margin:0">The medicines chart will be here too once it's built.</p>`;
  };
  const results = (q) => {
    const f = findItems(q), n = Object.values(f).reduce((a, x) => a + x.length, 0);
    if (!n) { out.innerHTML = `<div class="empty">Nothing found for "${esc(q)}".</div>`; return; }
    out.innerHTML = [
      f.contacts.length && head("Contacts", f.contacts.length) + f.contacts.map((c) => `<div class="card" style="box-shadow:none;padding:10px 12px;display:grid;gap:4px"><div><strong>${esc(c.name)}</strong>${c.role ? ` <span class="muted small">· ${esc(c.role)}</span>` : ""}</div>${c.phone ? `<a class="btn secondary" style="justify-self:start;min-height:38px" href="${esc(telHref(c.phone))}">Call ${esc(c.phone)}</a>` : ""}${c.email ? `<a class="small" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ""}</div>`).join(""),
      f.meds.length && head("Medicines", f.meds.length) + f.meds.map((m) => `<button class="btn secondary block fd-link" data-go="meds"><div class="body"><strong>${esc(medName(m))}</strong><div class="muted small">${esc(m.dose)} · ${esc(m.route)} · ${m.prn ? "when required" : esc((m.times || []).join(", "))}</div></div></button>`).join(""),
      f.docs.length && head("Documents", f.docs.length) + `<div class="list">${f.docs.map((d) => `<button class="btn secondary block fd-link" data-opendoc="${esc(d.id)}"><div class="body"><strong>${esc(d.name)}</strong><div class="muted small">${esc(DOC_KIND_LABEL[d.kind] || "Document")}</div></div></button>`).join("")}</div>`,
      f.plan.length && head("Care plan", f.plan.length) + f.plan.map((x) => `<details class="card" style="box-shadow:none;padding:10px 12px"><summary><strong>${esc(x.title)}</strong></summary><p class="small" style="white-space:pre-line;margin:8px 0 0">${esc(x.text || "")}</p></details>`).join(""),
      f.flags.length && head("Flags", f.flags.length) + f.flags.map((x) => `<details class="card" style="box-shadow:none;padding:10px 12px"><summary><strong>${esc(x.title)}</strong> <span class="tiny muted">${x.kind === "incident" ? "Incident" : "To note"} · ${when(x.ts)}${x.status === "resolved" ? " · resolved" : ""}</span></summary><p class="small" style="white-space:pre-line;margin:8px 0 0">${esc(x.detail || "")}${x.resolvedNote ? "\n\nResolved: " + esc(x.resolvedNote) : ""}</p></details>`).join(""),
      f.events.length && head("Appointments and plans", f.events.length) + f.events.map((e) => `<button class="link small" data-dday="${esc(dayKey(new Date(e.when)))}" style="justify-self:start;text-align:left;min-height:40px"><strong>${esc(e.label)}</strong> <span class="muted">· ${when(e.when)}${e.detail ? " · " + esc(e.detail) : ""}${e.cancelledTs ? " · cancelled" : e.when > Date.now() ? " · coming up" : ""}</span></button>`).join(""),
      f.devMsgs.length && head("Messages from the developer", f.devMsgs.length) + f.devMsgs.map((m) => `<details class="card" style="box-shadow:none;padding:10px 12px"><summary><span class="tiny muted">${when(m.at)}</span><div class="small">${esc(m.text.slice(0, 90))}${m.text.length > 90 ? "…" : ""}</div></summary><p class="small" style="white-space:pre-line;margin:8px 0 0">${ownLinks(m.text)}</p></details>`).join(""),
      f.notes.length && head("Notes", f.notes.length) + f.notes.map((x) => `<details class="card" style="box-shadow:none;padding:10px 12px"><summary><span class="tiny muted">${when(x.ts)} · ${esc(carer(x.carerId, x.carerName).name)}</span><div class="small">${esc(String(x.note || "").slice(0, 110))}${String(x.note || "").length > 110 ? "…" : ""}</div></summary><p class="small" style="white-space:pre-line;margin:8px 0 0">${esc(x.note || "")}</p></details>`).join(""),
      f.handovers.length && head("Handovers", f.handovers.length) + f.handovers.map((h) => `<details class="card" style="box-shadow:none;padding:10px 12px"><summary><span class="tiny muted">${when(h.ts)}${h.fromName ? " · from " + esc(h.fromName) : ""}</span></summary><p class="small" style="white-space:pre-line;margin:8px 0 0">${esc(h.text || "")}</p></details>`).join(""),
    ].filter(Boolean).join("");
  };
  const q = $("#fdQ", s.root);
  let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => (q.value.trim().length >= 2 ? results(q.value.trim()) : links()), 200); };
  q.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); q.blur(); } };
  loadDevMsgs().then((changed) => { if (changed && q.value.trim().length >= 2 && s.root.isConnected) results(q.value.trim()); });
  out.onclick = (e) => {
    const dd = e.target.closest("[data-dday]"); if (dd) { s.close(); logDay = dd.dataset.dday; go("log"); return; }
    const b = e.target.closest("[data-go]"); if (!b) return;
    s.close();
    ({ emerg: openEmergency, reports: openReports, plan: openPlan, contacts: openContacts, meds: () => openMeds("today"), log: () => go("log"), handover: () => go("handover") })[b.dataset.go]();
  };
  links();
}

/* ---------- navigation ---------- */
let tab = "today";
let rosterChecked = 0;
function go(name) {
  tab = name;
  // Opening Handover picks up carers added on another phone, so they're in "Handing over to".
  if (name === "handover" && Date.now() - rosterChecked > 30000) { rosterChecked = Date.now(); checkClient(); }
  document.querySelectorAll(".tab[data-tab]").forEach((b) => b.setAttribute("aria-current", b.dataset.tab === name ? "page" : "false"));
  ["today", "log", "handover", "family"].forEach((v) => ($("#view-" + v).hidden = v !== name));
  render(); window.scrollTo({ top: 0 });
}
document.querySelectorAll(".tab[data-tab]").forEach((b) => b.addEventListener("click", () => go(b.dataset.tab)));
$("#recTab").addEventListener("click", () => openRecorder());
$("#dutyBtn").addEventListener("click", () => openCarerSheet());
$("#settingsBtn").addEventListener("click", () => (isFamily() ? openFamilySettings() : openSettings()));
$("#brandBtn").addEventListener("click", () => { if (session && !appBusy() && !isSharedPhone()) showClients(true); }); // a shared phone only has its own client
$("#helpBtn").addEventListener("click", () => openHelp());
$("#findBtn").addEventListener("click", () => openFind());
$("#returnBtn").addEventListener("click", () => openReturnSheet());

/* ---------- render ---------- */
function render() {
  $("#clientName").textContent = S.client.name; $("#brandBtn").setAttribute("aria-label", `${S.client.name}. Switch client`);
  document.body.classList.toggle("family-mode", isFamily());
  $("#findBtn").hidden = !(session && session.client) || isFamily(); // Find is always in the top bar
  if (isFamily()) { if (tab !== "today") { tab = "today"; ["today", "log", "handover", "family"].forEach((x) => ($("#view-" + x).hidden = x !== "today")); } return renderFamilyHome(); }
  $("#dutyName").textContent = onDuty().name;
  $("#dutyAvatar").textContent = onDuty().name.charAt(0).toUpperCase();
  const n = openFlags().length; const badge = $("#flagBadge"); badge.hidden = !n; badge.textContent = n;
  const tr = activeTransfer();
  $("#outBanner").hidden = !tr;
  if (tr) {
    $("#outTitle").textContent = `${S.client.name} is out with ${tr.withWhom}`;
    $("#outSub").textContent = `Since ${fmtTime(tr.outTs)}${tr.purpose ? " · " + tr.purpose : ""}. Not in your care.`;
  }
  ({ today: renderToday, log: renderLog, handover: renderHandover, family: renderFamily })[tab]();
}

/* ---------- incident record checklist ----------
 * For an incident or a change in condition, a good record says when it happened, what was seen,
 * what was done and who was told (good practice for care records in the UK and Australia).
 * The AI lists which of these the carer didn't mention; the carer can add them or save as it is.
 */
const GAP_TEXT = {
  when: "When it happened, or when you noticed it",
  seen: "What you saw (where, how much, how they seemed)",
  done: "What you did about it",
  told: "Who you told (GP, 111, 999, family, the agency), or that you haven't told anyone yet",
};
function gapsHTML(draft) {
  const gaps = (Array.isArray(draft.record_gaps) ? draft.record_gaps : []).filter((g) => GAP_TEXT[g]);
  const serious = draft.flags.some((f) => f.kind === "incident");
  if (!gaps.length) return "";
  return `<div class="warn" style="display:grid;gap:8px">
    <span><strong>${serious ? "For a full incident record" : "For a full record of this change"}, ${draft.source === "basic" ? "check you've said" : "you haven't said"}:</strong></span>
    <ul style="margin:0;padding-left:20px">${gaps.map((g) => `<li>${esc(GAP_TEXT[g])}</li>`).join("")}</ul>
    <button class="btn secondary" id="rvGapAdd" style="justify-self:start;min-height:40px;padding:8px 14px;font-size:14px">Add details</button>
    <span class="tiny muted">Type or use the keyboard's microphone, then tap Rewrite. You can also save it as it is.</span></div>`;
}
// Who can agree to Dignity Notes being used, by the country the care is in (as the relay checks).
const CONSENT_ROLES = { UK: ["The client", "Lasting Power of Attorney (health and welfare)", "Other authorised family member"], AU: ["The client", "Enduring guardian", "Guardian appointed by a tribunal (e.g. SAT)", "Person responsible (family member)"] };
// Who to tell about an incident, for the client's country. Shown with every incident flag; information, not a decision.
const clientCountry = () => (session && session.client && session.client.country) || "UK";
const WHO_TO_TELL_AU = `<details class="small" style="margin-top:6px"><summary>Who to tell</summary>
  <ul style="margin:6px 0 0;padding-left:18px">
    <li><strong>Emergency</strong> (serious bleeding, can't breathe, unconscious, a serious fall): call <strong>000</strong>.</li>
    <li><strong>Urgent but not an emergency</strong>: call their GP, or <strong>healthdirect on 1800 022 222</strong> (a registered nurse, any time).</li>
    <li><strong>Suspected abuse or neglect</strong>: tell your agency, and call <strong>1800ELDERHelp (1800 353 374)</strong>, which connects to your state's elder abuse line. Concerns about an aged care service: <strong>OPAN on 1800 700 600</strong>. If someone is in danger, call 000.</li>
    <li>If the client gets government-funded aged care (for example Support at Home), tell the provider at once: they may have to report it as a serious incident.</li>
    <li>Tell the family member or guardian, and your agency, as agreed for this client.</li>
    <li>Then add who you told to the note, so the record is complete.</li>
  </ul></details>`;
const WHO_TO_TELL = `<details class="small" style="margin-top:6px"><summary>Who to tell</summary>
  <ul style="margin:6px 0 0;padding-left:18px">
    <li><strong>Emergency</strong> (serious bleeding, can't breathe, unconscious, a serious fall): call <strong>999</strong>.</li>
    <li><strong>Urgent but not an emergency</strong>: call their GP, or <strong>111</strong> out of hours.</li>
    <li><strong>Suspected abuse or neglect</strong>: tell your agency, and contact the local council's adult safeguarding team. If someone is in danger, call 999.</li>
    <li>Tell the family member or attorney, and your agency, as agreed for this client.</li>
    <li>Then add who you told to the note, so the record is complete.</li>
  </ul></details>`;
const whoToTell = () => {
  const w = clientCountry() === "AU" ? WHO_TO_TELL_AU : WHO_TO_TELL, e = emergForm();
  const line = e && e.form !== "unknown" ? `<p style="margin:6px 0 0"><strong>${esc(emergText(e))}</strong></p>` : "";
  const btn = respectDoc() ? `<button class="btn secondary" data-opendoc="${esc(respectDoc().id)}" style="margin-top:6px;min-height:38px;padding:6px 12px;font-size:14px">Open the emergency care plan</button>` : "";
  return line || btn ? w.replace("<ul", line + btn + "<ul") : w;
};
function flagHTML(f, actions = true) {
  return `<div class="flag ${f.kind === "incident" ? "incident" : ""}">
    <div class="body"><span class="tiny muted" style="font-weight:600">${f.kind === "incident" ? "Incident" : "To note"} · ${dayLabel(f.ts)} ${fmtTime(f.ts)}${f.raisedBy && roster().some((c) => c.id === f.raisedBy) ? " · " + esc(carer(f.raisedBy).name) : ""}</span>
    <strong>${esc(f.title)}</strong><span class="small">${esc(f.detail)}</span>${f.status === "resolved" ? `<span class="tiny muted">Resolved${f.resolvedBy ? " by " + esc(carer(f.resolvedBy).name) : ""}${f.resolvedTs ? " · " + esc(dayLabel(f.resolvedTs)) + " " + fmtTime(f.resolvedTs) : ""}</span>${f.resolvedNote ? `<span class="small"><strong>How it was resolved:</strong> ${esc(f.resolvedNote)}</span>` : ""}` : ""}${f.kind === "incident" ? whoToTell() : ""}</div>
    ${actions ? `<button class="link small" data-resolve="${esc(f.id)}">Mark resolved</button>` : ""}</div>`;
}
// Marking a flag resolved asks, optionally, how it was resolved (Sam, 2026-10-16): spoken or typed, so
// the next carer sees what worked. Shown on the flag, in the log and in the next handover.
function openResolve(id) {
  const f = S.flags.find((x) => x.id === id); if (!f) return;
  if (f.status !== "open") { render(); return toast("Already resolved"); }
  const s = sheet(`${sheetHead("Mark as resolved")}<p class="small" style="margin:0"><strong>${esc(f.title)}</strong></p>
    <label class="f">How was it resolved? (optional)<textarea id="rsWhat" rows="3" maxlength="1000" placeholder="e.g. Used the Zimmer frame and she got back to bed safely"></textarea></label>
    ${formsForFlag(id).map((r) => `<button type="button" class="btn ghost" data-rsform="${esc(`${r.type === "incident" ? "Incident report" : "Skin integrity form"} completed (${r.ref}).`)}">${r.type === "incident" ? "Incident report" : "Skin integrity form"} completed (${esc(r.ref)})</button>`).join("")}
    <div class="row"><button class="btn ghost" id="rsMic" style="flex:0 0 auto"></button></div><div class="small" id="rsMsg" role="status"></div>
    <button class="btn primary block" id="rsGo">Mark as resolved</button>`, { onClose: () => dict.cancel() });
  const dict = dictation($("#rsWhat", s.root), $("#rsMic", s.root), (t) => ($("#rsMsg", s.root).textContent = t), { hint: "Check the words, then tap Mark as resolved.", max: 1000 });
  s.root.querySelectorAll("[data-rsform]").forEach((b) => (b.onclick = () => { const t = $("#rsWhat", s.root); if (!t.value.includes(b.dataset.rsform)) t.value = (b.dataset.rsform + " " + t.value).trim().slice(0, 1000); }));
  $("#rsGo", s.root).onclick = async () => {
    if (dict.busy()) await dict.finish();
    const cur = S.flags.find((x) => x.id === id); if (!cur || cur.status !== "open") { s.close(); render(); return toast("Already resolved"); }
    const how = $("#rsWhat", s.root).value.trim().slice(0, 1000);
    Object.assign(cur, { status: "resolved", resolvedTs: Date.now(), resolvedBy: stampId(), ...(how ? { resolvedNote: how } : {}) }); touch(cur);
    save(); s.close(); render(); toast("Marked as resolved");
  };
}
function bindResolve(root) {
  root.querySelectorAll("[data-resolve]").forEach((b) => b.addEventListener("click", () => openResolve(b.dataset.resolve)));
}

/* ---------- storage safety ----------
 * Notes and recordings live only on this phone. Browsers can delete them: private tabs when
 * closed, Safari after 7 days without a visit (unless added to the Home Screen), any browser
 * when storage runs low. Ask for permanent storage, and warn when the data looks at risk.
 */
const storageState = { checked: false, persisted: false, installed: false, ios: false, privateLikely: false, quotaMB: null };
let installPrompt = null; // Android Chrome's "install app" offer, when available
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; if (tab === "today" && session && session.client) render(); });
async function checkStorage() {
  const st = storageState;
  st.installed = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  st.ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  try { if (navigator.storage && navigator.storage.persist) st.persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist()); } catch {}
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { quota } = await navigator.storage.estimate();
      st.quotaMB = quota ? Math.round(quota / 1048576) : null;
      // Private tabs get a small fixed allowance (around 100 MB or less); normal tabs get far more.
      st.privateLikely = !!quota && quota < 120 * 1048576;
    }
  } catch {}
  st.checked = true;
}
const hideKey = () => "dignitynotes.hidehomescreen";
function storageBanner() {
  const st = storageState; if (!st.checked) return "";
  if (st.privateLikely) return `<div class="flag incident" role="alert"><div class="body"><span class="eyebrow">Your notes may be deleted</span>
    <strong>This looks like a private browsing tab</strong><span class="small">Private tabs delete your notes and recordings when they close. You haven't done anything wrong: links open in Private if it was ever used before. To fix it once:
    ${st.ios ? `<br>1. Tap the Tabs button (two squares, bottom right)<br>2. At the bottom, tap the number of tabs next to <b>Private</b> (for example "2 Tabs")<br>3. Open the Dignity Notes link again there, then use Share → <b>Add to Home Screen</b><br>4. From now on, open Dignity Notes from the Home Screen icon`
      : `<br>1. Close this private (incognito) tab<br>2. Open the Dignity Notes link again in a normal tab<br>3. Tap <b>Install</b> when it's offered`}</span></div></div>`;
  if (st.installed || st.persisted) return "";
  let hidden = 0; try { hidden = +localStorage.getItem(hideKey()) || 0; } catch {}
  if (Date.now() < hidden) return "";
  if (st.ios) return `<div class="flag"><div class="body"><span class="eyebrow">Keep your notes safe</span>
    <strong>Add Dignity Notes to your Home Screen</strong><span class="small">Safari deletes a website's saved notes and recordings if it isn't opened for 7 days. Apps on the Home Screen are kept.
    <br>Opened from WhatsApp or a text message? First tap the compass button (bottom right) to open it in Safari.<br>1. In Safari, tap the Share button (square with an arrow)<br>2. Tap <b>Add to Home Screen</b><br>3. Open Dignity Notes from the new icon from now on.</span>
    <button class="link small" id="hideHome" style="justify-self:start">Hide for a week</button></div></div>`;
  if (installPrompt) return `<div class="flag"><div class="body"><span class="eyebrow">Keep your notes safe</span>
    <strong>Install Dignity Notes on this phone</strong><span class="small">Installed apps keep their notes and recordings safer from being cleared by the browser.</span>
    <div class="row" style="margin-top:6px"><button class="btn primary" id="doInstall" style="min-height:40px;padding:8px 14px;font-size:14px">Install</button><button class="link small" id="hideHome">Not now</button></div></div></div>`;
  return "";
}
function bindStorageBanner(root) {
  const h = $("#hideHome", root); if (h) h.onclick = () => { try { localStorage.setItem(hideKey(), String(Date.now() + 7 * 864e5)); } catch {} render(); };
  const i = $("#doInstall", root); if (i) i.onclick = async () => { try { installPrompt.prompt(); await installPrompt.userChoice; } catch {} installPrompt = null; await checkStorage(); render(); };
}
