// Dignity Notes: incident reports, skin integrity forms and MUST supporting information.
// Loaded by index.html after app.js, in order; shares its global scope (one app split into files).
"use strict";

/* ---------- incident reports and skin integrity forms ----------
 * Started from an incident or skin flag (Sam, 2026-10-20): a separate record linked to the note, with
 * what the note already says filled in and marked "from the note: check"; the carer completes the rest.
 * Every save is a new version (nothing is overwritten), so the history shows each amendment, who made
 * it and when. Agency clients get an administrator's review (is a statutory notification needed?).
 * It's an internal record, never a CQC or other statutory notification. Skin concerns are followed up
 * with a status and the next review date. UK rules researched in INCIDENT_SKIN_RULES.md.
 */
const INC_TYPES = { fall: "Fall", near_miss: "Near miss", injury: "Injury", aggression: "Aggression or challenging behaviour", medication: "Medication incident", accident: "Accident", other: "Other" };
const SKIN_KINDS = { redness: "Redness", bruising: "Bruising", dry_skin: "Dry skin", skin_tear: "Skin tear", broken_skin: "Broken skin", blister: "Blister", swelling: "Swelling", rash: "Rash", discolouration: "Discolouration", pressure_damage: "Suspected pressure damage", wound: "Existing wound", other: "Other" };
const BODY_AREAS = { head_face: "Head or face", neck: "Neck", shoulder: "Shoulder", upper_arm: "Upper arm", elbow: "Elbow", forearm: "Forearm", wrist_hand: "Wrist or hand", chest: "Chest", abdomen: "Tummy (abdomen)", upper_back: "Upper back", lower_back: "Lower back", sacrum: "Base of the spine (sacrum)", hip: "Hip", buttock: "Buttock", thigh: "Thigh", knee: "Knee", lower_leg: "Lower leg or shin", ankle: "Ankle", heel: "Heel", foot_toes: "Foot or toes", other: "Somewhere else" };
const SIDES = { left: "Left", right: "Right", both: "Both sides", middle: "Middle", unknown: "Not sure" };
const VIEWS = { front: "Front of the body", back: "Back of the body", unknown: "Not sure" };
const YNU = { yes: "Yes", no: "No", unknown: "Not known" };
const YN = { yes: "Yes", no: "No" };
// What the carer saw, in plain words (the pressure ulcer categories, NPIAP/EPUAP). Not a diagnosis.
const PU_CATEGORY = { none: "Not pressure damage", "1": "Category 1: red patch that doesn't fade when pressed, skin unbroken", "2": "Category 2: blister or shallow open skin", "3": "Category 3: deeper open wound", "4": "Category 4: very deep wound (muscle, tendon or bone may show)", unstageable: "Can't tell how deep (the base is covered)", deep: "Deep purple or maroon area, skin unbroken", unsure: "Not sure" };
const SKIN_STATUS = { improving: "Improving", unchanged: "Unchanged", deteriorating: "Getting worse", resolved: "Healed or resolved" };
const SKIN_REASONS = { routine: "Routine check", new: "New concern", follow_up: "Follow-up of a known concern", family: "Family asked", professional: "A health professional asked", other: "Other" };
const FORM_STATUS = { open: "Open", follow_up: "Follow-up needed", closed: "Closed" };
const SAFEGUARD = { yes: "Yes", no: "No", not_needed: "Not needed" };
const NOTIFY = { yes: "Yes", no: "No", unsure: "Not sure yet" };
const isAgency = () => !!(session && session.client && session.client.care === "agency");
const au999 = () => (clientCountry() === "AU" ? "000" : "999");
const nurseWord = () => (clientCountry() === "AU" ? "Community nurse" : "District nurse");
const tellOptions = (type) => type === "incident"
  ? { family: "Family or representative", gp: "GP", nurse: nurseWord(), manager: "Care manager", emergency: `Emergency services (${au999()})`, other: "Someone else" }
  : { manager: "Care manager", gp: "GP", nurse: nurseWord(), tvn: "Tissue viability nurse", family: "Family or representative", emergency: `Emergency services (${au999()})`, other: "Someone else" };
// The form's sections: [heading, [[key, label, input type, options]]]. "ro" is filled in, not typed.
// A professional's completed assessment (MUST, PAINAD and others), copied from what they wrote. Dignity
// Notes never calculates or checks the score (Sam's brief, 2026-10-19; scoring would make the app a
// medical device: DECISIONS.md).
const ASSESS_TOOLS = { must: "MUST (Malnutrition Universal Screening Tool)", painad: "PAINAD (Pain Assessment in Advanced Dementia)", waterlow: "Waterlow (pressure ulcer risk)", braden: "Braden (pressure ulcer risk)", falls: "Falls risk assessment", other: "Other assessment" };
const ASSESS_SHORT = { must: "MUST", painad: "PAINAD", waterlow: "Waterlow", braden: "Braden", falls: "Falls risk", other: "Assessment" };
const ASSESS_SECTIONS = [
  ["1. The assessment", [["client", "Client", "ro"], ["tool", "Which assessment", "sel", ASSESS_TOOLS], ["toolOther", "If other, which", "text"], ["date", "Date it was done", "date"], ["completedBy", "Who completed it (name)", "text"], ["role", "Their role (for example dietitian, district nurse, GP)", "text"]]],
  ["2. The result, as they wrote it", [["score", "Score, as written", "text"], ["result", "Result or risk level, as written (for example low risk)", "text"], ["details", "Anything else they recorded", "area"]]],
  ["3. What happens next", [["plan", "What they advised or planned", "area"], ["nextReview", "When it should be done again", "date"]]],
];
const formSections = (type) => type === "assessment" ? ASSESS_SECTIONS : type === "incident" ? [
  ["1. Client and incident details", [["client", "Client", "ro"], ["date", "Date it happened", "date"], ["time", "Time", "time"], ["where", "Where it happened", "text"], ["carer", "Carer involved", "text"]]],
  ["2. Type of incident", [["type", "Type", "sel", INC_TYPES], ["typeOther", "If other, what kind", "text"]]],
  ["3. What happened", [["what", "What happened (facts only: what you saw and heard)", "area"], ["witnessed", "Did anyone see it happen?", "sel", YNU], ["witnessWho", "Who saw it, and how to reach them", "text"]]],
  ["4. Injuries", [["injured", "Was anyone hurt?", "sel", YNU], ["injury", "What injury, and where on the body", "area"], ["medical", "Medical attention given or asked for", "area"]]],
  ["5. What was done straight away", [["action", "What you did", "area"], ["safe", "Was the person made safe?", "sel", YNU], ["emergency", `Were emergency services called (${au999()})?`, "sel", YN]]],
  ["6. Who was told", [["told", "", "tell"]]],
  ["7. Outcome and follow-up", [["after", "How the person was afterwards", "area"], ["monitoring", "Further monitoring needed", "area"], ["planReview", "Do the care plan or risk assessment need reviewing?", "sel", YNU], ["safeguarding", "Was a safeguarding concern raised (with the council or your manager)?", "sel", SAFEGUARD], ["safeguardingWhy", "Why, or who it was raised with", "text"], ["further", "Further action needed, and by whom", "area"]]],
] : [
  ["1. Details", [["client", "Client", "ro"], ["date", "Date of the check", "date"], ["time", "Time", "time"], ["carer", "Carer", "text"]]],
  ["2. Reason for the check", [["reason", "Reason", "sel", SKIN_REASONS], ["reasonOther", "If other, why", "text"]]],
  ["3. Skin condition", [["concern", "Is there a skin concern?", "sel", YN], ["concerns", "", "concerns"]]],
  ["4. What was done straight away", [["carePlan", "Was the care plan followed (for example repositioning, creams, pressure cushion)?", "sel", YNU], ["action", "What you did", "area"], ["medical", "Medical attention given or asked for", "area"]]],
  ["5. Who was told", [["told", "", "tell"]]],
  ["6. Monitoring", [["status", "How is it now?", "sel", SKIN_STATUS], ["nextReview", "Next check due", "date"]]],
  ["7. Further action", [["further", "Further action needed, and by whom", "area"], ["safeguarding", "Was a safeguarding concern raised (with the council or your manager)?", "sel", SAFEGUARD], ["safeguardingWhy", "Why, or who it was raised with", "text"]]],
];
const formLabels = (type) => Object.fromEntries(formSections(type).flatMap(([, fs]) => fs.map(([k, l]) => [k, l || ({ told: "Who was told", concerns: "Skin concerns" })[k]])));
const formOptions = (type) => Object.fromEntries(formSections(type).flatMap(([, fs]) => fs.filter((f) => f[3]).map((f) => [f[0], f[3]])));
const formTitle = (type) => (type === "incident" ? "Incident report" : type === "assessment" ? "Professional assessment" : "Skin integrity form");
const SKIN_RE = /\b(skin|bruis\w*|graze\w*|tear|redness|sore\w*|blister\w*|rash\w*|wound\w*|pressure|cut|bleed\w*|swell\w*|swollen|scratch\w*|ulcer\w*)\b/i;
const isSkinFlag = (f) => SKIN_RE.test(`${f.title} ${f.detail || ""}`) || observations().some((o) => o.topic === "skin" && o.noteId && o.noteId === f.noteId);

const forms = () => (S.forms || []).filter((x) => !isExample(x));
const formVersions = (formId) => forms().filter((x) => x.formId === formId).sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1));
const formLatest = (formId) => { const v = formVersions(formId); return v[v.length - 1]; };
const latestForms = (type) => [...new Set(forms().filter((x) => !type || x.type === type).map((x) => x.formId))].map(formLatest).filter(Boolean);
const formsForFlag = (flagId) => latestForms().filter((r) => r.flagId === flagId);
// A form's answers, made safe to show: lists are lists of objects, everything else plain text.
function formData(r) {
  let d; try { d = JSON.parse(r.data); } catch { d = null; }
  if (!d || typeof d !== "object" || Array.isArray(d)) return {};
  const obj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const strs = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v.filter((x) => typeof x === "string") : typeof v === "number" ? v : typeof v === "string" ? v : ""]));
  const out = strs(d);
  for (const k of ["told", "concerns", "followups"]) out[k] = Array.isArray(d[k]) ? d[k].filter(obj).map(strs) : [];
  out.concerns = out.concerns.map((c) => ({ ...c, kinds: Array.isArray(c.kinds) ? c.kinds : [] }));
  out.followups = out.followups.map((f) => ({ ...f, ts: Number(f.ts) || 0 }));
  if (!Array.isArray(out.suggested)) out.suggested = [];
  return out;
}
// An option's label, only for the form's own options (never "constructor" and the like from another phone).
const opt = (o, k) => (typeof k === "string" && Object.hasOwn(o, k) ? o[k] : "");
const formReview = (formId) => (S.reviews || []).filter((r) => r.formId === formId).sort((a, b) => b.ts - a.ts)[0];
const formRef = (type, id, ts) => `${type === "incident" ? "IR" : type === "assessment" ? "AS" : "SK"}-${dayKey(new Date(ts)).slice(2).replace(/-/g, "")}-${id.slice(0, 3).toUpperCase()}`;
const concernLabel = (c) => [(c.kinds || []).map((k) => opt(SKIN_KINDS, k)).filter(Boolean).join(", ") || "Skin concern", [c.side !== "unknown" ? opt(SIDES, c.side).toLowerCase() : "", opt(BODY_AREAS, c.area).toLowerCase()].filter(Boolean).join(" ")].filter(Boolean).join(", ");
const skinWhere = (d) => ((d.concerns || [])[0] ? concernLabel(d.concerns[0]) : "skin check") + ((d.concerns || []).length > 1 ? ` and ${d.concerns.length - 1} more` : "");
const formLine = (r) => { const d = formData(r); if (r.type === "assessment") return `${opt(ASSESS_SHORT, d.tool) || "Assessment"}${d.result ? ": " + d.result : d.score ? ": " + d.score : ""}${d.completedBy ? ", by " + d.completedBy : ""}`; return r.type === "incident" ? `${opt(INC_TYPES, d.type) || "Incident"}${d.where ? " · " + d.where : ""}` : skinWhere(d); };
// Forms that need someone: open incident reports, an agency client's reports awaiting review (for
// administrators), and skin concerns whose next check is due.
function formAttn() {
  const today = dayKey(new Date()), out = [];
  for (const r of latestForms()) {
    const d = formData(r);
    if (r.type === "incident" && isAgency() && isAdminHere() && !formReview(r.formId)) out.push({ r, label: `Incident report ${r.ref}: needs your review` });
    else if (r.type === "incident" && r.status !== "closed") out.push({ r, label: `Incident report ${r.ref}: ${FORM_STATUS[r.status].toLowerCase()}` });
    if (r.type === "assessment" && d.nextReview && d.nextReview <= today && !latestForms("assessment").some((x) => x !== r && formData(x).tool === d.tool && (formData(x).date || "") > (d.date || ""))) out.push({ r, label: `${opt(ASSESS_SHORT, d.tool) || "Assessment"} due to be done again (last ${fmtDay(new Date(d.date + "T12:00:00").getTime())})` });
    if (r.type === "skin" && r.status !== "closed" && d.nextReview && d.nextReview <= today) out.push({ r, label: `Skin check due: ${skinWhere(d)}` });
  }
  return out;
}
const formAttnRowHTML = (x) => `<button class="attn-row" data-openform="${esc(x.r.formId)}"><span class="sdot ${x.r.type === "incident" ? "incident" : ""}"></span>
  <span class="body"><strong>${esc(x.label)}</strong><span class="tiny muted">${formTitle(x.r.type)} · ${esc(dayLabel(x.r.ts))} ${fmtTime(x.r.ts)}</span></span>${ICON.chev}</button>`;
document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-openform]"); if (b) openForm(b.dataset.openform); });
const internalNoteHTML = () => clientCountry() === "AU"
  ? `<strong>Internal care record.</strong> It isn't a report to the Aged Care Quality and Safety Commission (the Serious Incident Response Scheme) or anyone else: a registered provider still reports through the proper channels. Someone in danger: call 000.`
  : `<strong>Internal care record.</strong> It isn't a notification to the CQC, the HSE (RIDDOR), the police or the council: a registered care provider still notifies through the proper channels. Someone in danger: call 999. Urgent medical advice: NHS 111. Abuse or neglect: the council's adult social care team.`;

// The note a form starts from, with any additions, for "from the note".
const noteWithAdditions = (noteId) => { const n = S.notes.find((x) => x.id === noteId); if (!n) return ""; return [n, ...S.notes.filter((x) => x.amends === n.id).sort((a, b) => a.ts - b.ts)].map((x) => x.note).join("\n"); };
function blankForm(type, flag, preset = {}) {
  const ts = flag ? flag.ts : Date.now(), d = new Date(ts);
  if (type === "assessment") return { client: S.client.name, tool: "", toolOther: "", date: dayKey(d), completedBy: "", role: "", score: "", result: "", details: "", plan: "", nextReview: "", told: [], suggested: [], ...preset };
  const note = flag && S.notes.find((n) => n.id === flag.noteId);
  const base = { client: S.client.name, carer: note ? carer(note.carerId, note.carerName).name : (session.name || onDuty().name), date: dayKey(d), time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`, told: [], suggested: [] };
  if (type === "incident") return { ...base, where: "", type: "", typeOther: "", what: note ? note.note.slice(0, 2000) : "", witnessed: "", witnessWho: "", injured: "", injury: "", medical: "", action: "", safe: "", emergency: "", after: "", monitoring: "", planReview: "", safeguarding: "", safeguardingWhy: "", further: "", ...(note ? { suggested: ["what"] } : {}) };
  return { ...base, reason: flag ? "new" : "routine", reasonOther: "", concern: flag ? "yes" : "", concerns: flag ? [{ kinds: [], area: "", side: "", view: "", first: "", description: "", size: "", pain: "", category: "" }] : [], carePlan: "", action: "", medical: "", status: "", nextReview: "", further: "", safeguarding: "", safeguardingWhy: "", followups: [] };
}
const sugTag = (sug, k) => (sug.includes(k) ? ` <span class="chip follow" data-sug="${k}" style="font-size:12px">from the note: check</span>` : "");
function fieldEditHTML(d, [k, label, t, opts], sug) {
  const v = d[k] == null ? "" : String(d[k]), tag = sugTag(sug, k);
  if (t === "ro") return `<div class="small"><strong>${esc(label)}:</strong> ${esc(v)}</div>`;
  if (t === "tell") return tellEditHTML(d, sug);
  if (t === "concerns") return concernsEditHTML(d, sug);
  if (t === "area") return `<label class="f">${esc(label)}${tag}<textarea data-k="${k}" rows="3" maxlength="2000">${esc(v)}</textarea></label>`;
  if (t === "sel") return `<label class="f">${esc(label)}${tag}<select data-k="${k}"><option value="">Choose…</option>${Object.entries(opts).map(([o, l]) => `<option value="${esc(o)}" ${v === o ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
  return `<label class="f">${esc(label)}${tag}<input type="${t === "date" ? "date" : t === "time" ? "time" : "text"}" data-k="${k}" value="${esc(v)}" maxlength="300" autocomplete="off"></label>`;
}
let formType = "incident"; // the form being edited (for the Who was told list)
function tellEditHTML(d, sug) {
  const by = new Map((d.told || []).map((t) => [t.who, t]));
  return `<div style="display:grid;gap:8px">${sug.includes("told") ? `<span class="chip follow" data-sug="told" style="justify-self:start;font-size:12px">from the note: check</span>` : ""}${Object.entries(tellOptions(formType)).map(([k, l]) => { const t = by.get(k) || {}; return `<div class="card" style="box-shadow:none;padding:8px 10px;display:grid;gap:6px">
    <label class="check"><input type="checkbox" data-tell="${k}" ${by.has(k) ? "checked" : ""}><span>${esc(l)}</span></label>
    <div data-tellrow="${k}" style="display:grid;gap:6px" ${by.has(k) ? "" : "hidden"}><label class="f">When they were told<input type="datetime-local" data-tellwhen="${k}" value="${esc(t.when || "")}"></label>
    <label class="f">${k === "other" ? "Who, and what was said" : "What was said or advised"}<input type="text" data-telldetail="${k}" value="${esc(t.detail || "")}" maxlength="300" autocomplete="off"></label></div></div>`; }).join("")}</div>`;
}
function concernsEditHTML(d, sug) {
  const cs = d.concerns || [];
  return `<div style="display:grid;gap:10px">${sug.includes("concerns") ? `<span class="chip follow" data-sug="concerns" style="justify-self:start;font-size:12px">from the note: check</span>` : ""}
    ${cs.map((c, i) => `<div class="card" style="box-shadow:none;padding:10px 12px;display:grid;gap:8px"><strong class="small">Concern ${i + 1}</strong>
      <fieldset style="border:0;padding:0;margin:0;display:grid;gap:4px"><legend class="small" style="font-weight:600;margin-bottom:4px">What you see (tick all that apply)</legend>${Object.entries(SKIN_KINDS).map(([k, l]) => `<label class="check"><input type="checkbox" data-ckind="${i}:${k}" ${(c.kinds || []).includes(k) ? "checked" : ""}><span>${esc(l)}</span></label>`).join("")}</fieldset>
      ${[["area", "Where on the body", BODY_AREAS], ["side", "Which side", SIDES], ["view", "Front or back", VIEWS]].map(([k, l, o]) => `<label class="f">${l}<select data-ck="${i}:${k}"><option value="">Choose…</option>${Object.entries(o).map(([v, t]) => `<option value="${v}" ${c[k] === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`).join("")}
      <label class="f">When it was first noticed<input type="text" data-ck="${i}:first" value="${esc(c.first || "")}" maxlength="100" placeholder="e.g. this morning when washing" autocomplete="off"></label>
      <label class="f">Describe it (colour, warmth, any broken skin, discharge)<textarea data-ck="${i}:description" rows="2" maxlength="1000">${esc(c.description || "")}</textarea></label>
      <label class="f">Size, if measured<input type="text" data-ck="${i}:size" value="${esc(c.size || "")}" maxlength="60" placeholder="e.g. 3 cm by 2 cm" autocomplete="off"></label>
      <label class="f">Does it hurt?<select data-ck="${i}:pain"><option value="">Choose…</option>${Object.entries(YNU).map(([v, t]) => `<option value="${v}" ${c.pain === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label class="f">If it may be pressure damage, what it looks like<select data-ck="${i}:category"><option value="">Choose…</option>${Object.entries(PU_CATEGORY).map(([v, t]) => `<option value="${v}" ${c.category === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>
      <span class="tiny muted" style="margin-top:-4px">What you saw, not a diagnosis. Ask a ${nurseWord().toLowerCase()} or GP to look at broken or discoloured skin.</span>
      <button type="button" class="link small" data-crm="${i}" style="justify-self:start;min-height:40px">Remove this concern</button></div>`).join("")}
    <button type="button" class="btn secondary" id="fmAddConcern">Add ${cs.length ? "another" : "a"} concern</button></div>`;
}
// Everything typed on the form, on top of what it held.
function readForm(root, d) {
  const out = JSON.parse(JSON.stringify(d));
  root.querySelectorAll("[data-k]").forEach((el) => (out[el.dataset.k] = el.value.trim()));
  out.told = [...root.querySelectorAll("[data-tell]")].filter((c) => c.checked).map((c) => ({ who: c.dataset.tell, when: $(`[data-tellwhen="${c.dataset.tell}"]`, root).value, detail: $(`[data-telldetail="${c.dataset.tell}"]`, root).value.trim() }));
  if (Array.isArray(out.concerns)) out.concerns = out.concerns.map((c, i) => ({ ...c, kinds: [...root.querySelectorAll(`[data-ckind^="${i}:"]`)].filter((x) => x.checked).map((x) => x.dataset.ckind.split(":")[1]), ...Object.fromEntries([...root.querySelectorAll(`[data-ck^="${i}:"]`)].map((x) => [x.dataset.ck.split(":")[1], x.value.trim()])) }));
  return out;
}
function saveFormVersion(type, formId, d, status, meta) {
  const id = uid(), fid = formId || id, prev = formId ? formLatest(formId) : null;
  const now = Math.max(Date.now(), prev ? prev.ts + 1 : 0); // after the version it amends, even if this phone's clock is behind
  const data = JSON.stringify(d);
  if (prev && prev.data === data && prev.status === status) { toast("Nothing changed"); return null; }
  if (data.length > 19000) { toast("This form is too long. Shorten the longest answers."); return null; }
  const rec = { id, ts: now, formId: fid, type, ref: prev ? prev.ref : formRef(type, fid, now), data, status, by: stampId(), byName: session.name || onDuty().name, ...(prev ? { prevId: prev.id } : {}), ...(meta.noteId ? { noteId: meta.noteId } : {}), ...(meta.flagId ? { flagId: meta.flagId } : {}) };
  touch(rec); (S.forms = S.forms || []).push(rec); save(); return rec;
}
// Start (no formId) or amend a form. flag: the flag it starts from (its note fills it in).
function openFormEdit(type, { formId = null, flag = null, after, preset } = {}) {
  formType = type;
  const prev = formId ? formLatest(formId) : null;
  let d = prev ? formData(prev) : blankForm(type, flag, preset), st = prev ? prev.status : "open", dirty = false;
  if (!Array.isArray(d.suggested)) d.suggested = [];
  if (type === "skin" && !Array.isArray(d.concerns)) d.concerns = [];
  const meta = { noteId: prev ? prev.noteId : flag ? flag.noteId : undefined, flagId: prev ? prev.flagId : flag ? flag.id : undefined };
  const s = sheet(`${sheetHead(prev ? `${formTitle(type)} ${esc(prev.ref)}` : formTitle(type))}<div id="fmBody" style="display:grid;gap:12px"></div>`, { guard: () => dirty });
  const body = $("#fmBody", s.root);
  const draw = () => {
    body.innerHTML = `<div class="small" style="padding:10px 12px;border-radius:12px;background:var(--surface-2, #f3eff7)">${internalNoteHTML()}</div>
      ${prev ? `<p class="small" style="margin:0">Your changes are saved as a new version: the earlier one stays in the history, with who changed it and when.</p>` : ""}
      <div class="small" id="fmAI" role="status"></div>
      ${formSections(type).map(([h, fs]) => `<section style="display:grid;gap:10px"><h3 style="font-size:17px;margin:4px 0 0">${esc(h)}</h3>${fs.map((f) => fieldEditHTML(d, f, d.suggested)).join("")}${h.startsWith("7.") && type === "skin" ? `<p class="tiny muted" style="margin:0">Deeper pressure damage (category 3 or 4, or can't tell how deep), or several sore areas, may need a safeguarding referral: talk to the ${nurseWord().toLowerCase()} and your manager, or the council's adult social care team.</p>` : ""}</section>`).join("")}
      ${type === "incident" ? `<section style="display:grid;gap:10px"><h3 style="font-size:17px;margin:4px 0 0">8. Completion</h3><p class="small" style="margin:0">Completed by <strong>${esc(session.name || onDuty().name)}</strong> when you save (each version keeps who saved it and when).${isAgency() ? " An administrator reviews it afterwards." : ""}</p>
        <label class="f">Status<select id="fmStatus">${Object.entries(FORM_STATUS).map(([k, l]) => `<option value="${k}" ${st === k ? "selected" : ""}>${l}</option>`).join("")}</select></label></section>` : ""}
      <button class="btn primary block" id="fmSave">Save the ${type === "incident" ? "report" : "form"}</button>`;
    if ($("#fmAddConcern", body)) $("#fmAddConcern", body).onclick = () => { d = readForm(body, d); d.concerns.push({ kinds: [], area: "", side: "", view: "", first: "", description: "", size: "", pain: "", category: "" }); d.concern = "yes"; dirty = true; draw(); };
    body.querySelectorAll("[data-crm]").forEach((b) => (b.onclick = () => { d = readForm(body, d); d.concerns.splice(+b.dataset.crm, 1); dirty = true; draw(); }));
    $("#fmSave", body).onclick = (e) => {
      d = readForm(body, d);
      if (!d.date) return toast("Add the date");
      if (type === "incident" && !d.what) return toast("Say what happened");
      if (type === "assessment" && (!d.tool || !d.completedBy)) return toast("Choose the assessment and say who completed it");
      if (type === "skin" && d.concern === "yes" && !d.concerns.some((c) => (c.kinds || []).length || c.description)) return toast("Describe the skin concern, or choose No");
      if (type === "skin" && d.concern === "yes" && d.status !== "resolved" && !d.nextReview) return toast("Choose when it should be checked next");
      if (type === "skin" && d.concern !== "yes") d.concerns = d.concerns.filter((c) => (c.kinds || []).length || c.description);
      const go = () => {
        const status = type === "incident" ? $("#fmStatus", body).value : type === "assessment" ? (d.nextReview ? "open" : "closed") : d.status === "resolved" || d.concern !== "yes" ? "closed" : "open";
        const rec = saveFormVersion(type, formId, d, status, meta); if (!rec) return;
        dirty = false; s.close(); render(); toast(prev ? "Saved: the change is in the history" : `${formTitle(type)} ${rec.ref} saved`);
        if (after) after(rec); else openForm(rec.formId);
      };
      if (d.suggested.length) return confirmInline(e.currentTarget, go, "Tap again: the answers from the note are right");
      go();
    };
  };
  // Changing an answer marks it as checked by the carer; any change means closing asks first.
  const keyOf = (el) => el.dataset.k || (el.dataset.tell || el.dataset.tellwhen || el.dataset.telldetail ? "told" : el.dataset.ck || el.dataset.ckind ? "concerns" : "");
  const changed = (e) => { dirty = true; const k = keyOf(e.target); if (k && d.suggested.includes(k)) { d.suggested = d.suggested.filter((x) => x !== k); const c = $(`[data-sug="${k}"]`, body); if (c) c.remove(); } if (e.target.dataset.tell) $(`[data-tellrow="${e.target.dataset.tell}"]`, body).hidden = !e.target.checked; };
  body.addEventListener("input", changed); body.addEventListener("change", changed);
  draw();
  // A new form from a note: the AI suggests answers from what the note says (never guesses).
  const words = !prev && meta.noteId ? noteWithAdditions(meta.noteId) : "";
  if (words && cloudOn() && navigator.onLine) {
    $("#fmAI", body).textContent = "Filling in what the note says…";
    syncJSON("/plan/formfill", { client: session.client.id, clientName: S.client.name, form: type, note: words }, 60000).then((out) => {
      if (!body.isConnected) return;
      d = readForm(body, d);
      const set = (k, v) => { if (v && v !== "unknown" && (!d[k] || d.suggested.includes(k))) { d[k] = v; if (!d.suggested.includes(k)) d.suggested.push(k); } };
      if (type === "incident") { set("type", out.type); for (const k of ["where", "what", "witnessed", "injured", "injury", "medical", "action", "safe"]) set(k, String(out[k] || "").slice(0, 2000)); }
      else {
        set("action", String(out.action || "").slice(0, 2000)); set("medical", String(out.medical || "").slice(0, 2000));
        const cs = (out.concerns || []).slice(0, 8).map((c) => ({ kinds: opt(SKIN_KINDS, c.kind) ? [c.kind] : [], area: opt(BODY_AREAS, c.area) ? c.area : "", side: opt(SIDES, c.side) ? c.side : "", view: opt(VIEWS, c.view) ? c.view : "", first: "", description: String(c.description || "").slice(0, 1000), size: "", pain: opt(YNU, c.pain) ? c.pain : "", category: "" }));
        if (cs.length && !d.concerns.some((c) => (c.kinds || []).length || c.description)) { d.concerns = cs; d.concern = "yes"; if (!d.suggested.includes("concerns")) d.suggested.push("concerns"); }
      }
      const tell = (out.told || []).filter((w) => tellOptions(type)[w]);
      if (tell.length && !d.told.length) { d.told = tell.map((who) => ({ who, when: "", detail: "" })); d.suggested.push("told"); }
      draw();
      $("#fmAI", body).textContent = d.suggested.length ? "Answers marked \"from the note\" were filled in from the note: check each one and fill in the rest." : "The note didn't say more than this: fill in the rest.";
    }).catch(() => { if (body.isConnected) $("#fmAI", body).textContent = "Couldn't fill it in from the note just now: fill it in yourself."; });
  } else if (words) $("#fmAI", body).textContent = "What happened was copied from the note: check it and fill in the rest.";
}

// A form's answers, read only (also printed, and shown to family when they see incidents).
function formViewHTML(type, d) {
  const val = (k, t, opts) => { const v = d[k]; if (v == null || v === "") return ""; return opts ? (opt(opts, v) || String(v)) : String(v); };
  const from = (k) => ((d.suggested || []).includes(k) ? ` <span class="tiny muted">(from the note)</span>` : "");
  const tellOpts = { ...tellOptions("incident"), ...tellOptions("skin") };
  const rows = (fs) => fs.map(([k, label, t, opts]) => {
    if (t === "tell") return (d.told || []).length ? `<div class="small" style="display:grid;gap:2px">${from("told")}${d.told.map((x) => `<div>• <strong>${esc(opt(tellOpts, x.who) || x.who)}</strong>${x.when && !isNaN(new Date(x.when)) ? `, ${esc(fmtDay(new Date(x.when).getTime()))} ${esc(String(x.when).slice(11, 16))}` : ""}${x.detail ? `: ${esc(x.detail)}` : ""}</div>`).join("")}</div>` : `<div class="small muted">Nobody recorded.</div>`;
    if (t === "concerns") return (d.concerns || []).map((c, i) => `<div class="small" style="display:grid;gap:2px;break-inside:avoid"><strong>Concern ${i + 1}: ${esc(concernLabel(c))}</strong>${from("concerns")}
      ${opt(VIEWS, c.view) && c.view !== "unknown" ? `<div>${esc(opt(VIEWS, c.view))}</div>` : ""}${c.first ? `<div>First noticed: ${esc(c.first)}</div>` : ""}${c.description ? `<div>${esc(c.description)}</div>` : ""}${c.size ? `<div>Size: ${esc(c.size)}</div>` : ""}${opt(YNU, c.pain) ? `<div>Hurts: ${opt(YNU, c.pain)}</div>` : ""}${opt(PU_CATEGORY, c.category) ? `<div>Looks like: ${esc(opt(PU_CATEGORY, c.category))} <span class="tiny muted">(what the carer saw, not a diagnosis)</span></div>` : ""}</div>`).join("") || "";
    const v = k === "date" && d.date ? fmtDay(new Date(d.date + "T12:00:00").getTime()) : k === "nextReview" && d.nextReview ? fmtDay(new Date(d.nextReview + "T12:00:00").getTime()) : val(k, t, opts);
    return v ? `<div class="small"><strong>${esc(label)}${/\?$/.test(label) ? "" : ":"}</strong> <span style="white-space:pre-line">${esc(v)}</span>${from(k)}</div>` : "";
  }).join("");
  return formSections(type).map(([h, fs]) => { const r = rows(fs); return r.trim() ? `<section style="display:grid;gap:4px;break-inside:avoid"><h3 style="font-size:16px;margin:6px 0 2px">${esc(h)}</h3>${r}</section>` : ""; }).join("")
    + ((d.followups || []).length ? `<section style="display:grid;gap:4px"><h3 style="font-size:16px;margin:6px 0 2px">Follow-up checks</h3>${d.followups.map((f) => `<div class="small">• <strong>${esc(dayLabel(f.ts))} ${fmtTime(f.ts)}, ${esc(f.byName || "")}:</strong> ${esc(opt(SKIN_STATUS, f.status))}${f.note ? `. ${esc(f.note)}` : ""}${f.nextReview ? ` Next check ${esc(fmtDay(new Date(f.nextReview + "T12:00:00").getTime()))}.` : ""}</div>`).join("")}</section>` : "");
}
// What changed between two versions, in words, for the history.
function formChanges(a, b, type) {
  const da = formData(a), db = formData(b), labels = formLabels(type), opts = formOptions(type), out = [];
  const show = (k, v) => { const o = opts[k]; const s = o && o[v] ? o[v] : String(v || ""); return s.length > 80 ? s.slice(0, 80) + "…" : s; };
  for (const k of Object.keys(labels)) {
    if (k === "told" || k === "concerns") { if (JSON.stringify(da[k] || []) !== JSON.stringify(db[k] || [])) out.push(`${labels[k]} changed`); continue; }
    if ((da[k] || "") !== (db[k] || "")) out.push(`${labels[k]}: "${show(k, da[k]) || "blank"}" to "${show(k, db[k]) || "blank"}"`);
  }
  if ((db.followups || []).length > (da.followups || []).length) out.push("Follow-up check added");
  if (a.status !== b.status) out.push(`Status: ${FORM_STATUS[a.status]} to ${FORM_STATUS[b.status]}`);
  return out.length ? out : ["No change to the answers"];
}
function openForm(formId) {
  const r = formLatest(formId); if (!r) return toast("This form isn't on this phone yet");
  const type = r.type, d = formData(r), vs = formVersions(formId), rv = formReview(formId);
  const canWrite = !isFamily(), skin = type === "skin";
  const reviewHTML = type !== "incident" || !isAgency() ? "" : `<section class="card" style="box-shadow:none;display:grid;gap:4px;break-inside:avoid"><h3 style="font-size:16px;margin:0">Manager review</h3>
    ${rv ? `<div class="small">Reviewed by <strong>${esc(rv.byName || "")}</strong>, ${esc(dayLabel(rv.ts))} ${fmtTime(rv.ts)}</div>
      <div class="small"><strong>Statutory notification needed:</strong> ${esc(NOTIFY[rv.notify] || "")}${rv.why ? `. ${esc(rv.why)}` : ""}</div>
      ${rv.candour ? `<div class="small"><strong>Duty of candour applies:</strong> ${esc(NOTIFY[rv.candour] || "")}</div>` : ""}${rv.safeguarding ? `<div class="small"><strong>Safeguarding referral needed:</strong> ${esc(NOTIFY[rv.safeguarding] || "")}</div>` : ""}${rv.lessons ? `<div class="small"><strong>Lessons learned:</strong> ${esc(rv.lessons)}</div>` : ""}`
      : `<div class="small">Waiting for an administrator to review it.</div>`}
    ${isAdminHere() && cloudOn() ? `<button class="btn secondary noprint" id="fvReview">${rv ? "Review again" : "Review this report"}</button>` : ""}</section>`;
  const s = sheet(`${sheetHead(`${formTitle(type)} ${esc(r.ref)}`)}
    <div class="row" style="gap:6px;flex-wrap:wrap"><span class="chip ${r.status === "closed" ? "" : type === "incident" ? "incident" : "follow"}">${type === "assessment" ? (d.nextReview ? `Next due ${esc(fmtDay(new Date(d.nextReview + "T12:00:00").getTime()))}` : "Recorded") : skin ? (r.status === "closed" ? "Closed: healed or resolved" : `Being followed up${d.nextReview ? ", next check " + esc(fmtDay(new Date(d.nextReview + "T12:00:00").getTime())) : ""}`) : esc(FORM_STATUS[r.status])}</span></div>
    ${r.noteId && S.notes.some((n) => n.id === r.noteId) ? `<button class="link small" id="fvNote" style="justify-self:start;min-height:40px">Open the note it came from</button>` : ""}
    ${formConflict(formId) ? `<div class="warn small">This was changed on two phones at about the same time. The newest version is shown; check the History for the other change.</div>` : ""}
    ${formViewHTML(type, { ...d, followups: skin ? allFollowups(formId) : d.followups })}
    ${reviewHTML}
    <details><summary class="small">History (${vs.length} version${vs.length === 1 ? "" : "s"})</summary><div style="display:grid;gap:6px;margin-top:6px">${vs.map((v, i) => `<div class="small"><strong>${esc(dayLabel(v.ts))} ${fmtTime(v.ts)}, ${esc(v.byName || carer(v.by).name)}:</strong> ${i ? esc(formChanges(vs[i - 1], v, type).join("; ")) : "started"}</div>`).join("")}</div></details>
    <div class="tiny muted">${type === "assessment" ? ASSESS_NOTE : internalNoteHTML()}</div>
    ${canWrite ? `${skin && r.status !== "closed" ? `<button class="btn primary block" id="fvFollow">Add a follow-up check</button>` : ""}<button class="btn ${skin && r.status !== "closed" ? "secondary" : "primary"} block" id="fvEdit">${skin || type === "assessment" ? "Change the form" : "Amend the report"}</button>` : ""}
    <button class="btn ghost block" id="fvPrint">Print or save as PDF</button>`);
  if ($("#fvNote", s.root)) $("#fvNote", s.root).onclick = () => { s.close(); openSavedNote(r.noteId); };
  if ($("#fvEdit", s.root)) $("#fvEdit", s.root).onclick = () => { s.close(); openFormEdit(type, { formId }); };
  if ($("#fvFollow", s.root)) $("#fvFollow", s.root).onclick = () => { s.close(); openSkinFollowUp(formId); };
  if ($("#fvReview", s.root)) $("#fvReview", s.root).onclick = () => { s.close(); openFormReview(formId); };
  $("#fvPrint", s.root).onclick = () => printForm(formId);
}
// Print what's in #printRoot on its own (over a report too, which keeps its own screen), then clear it.
function printAlone() {
  const p = $("#printRoot");
  document.body.classList.add("printing-form");
  const done = () => { document.body.classList.remove("printing-form"); p.innerHTML = ""; window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  window.print();
  setTimeout(done, 30000); // some phones never send "afterprint"
}
// Print one form on its own (works over a report, which keeps its own screen).
function printForm(formId) {
  const r = formLatest(formId); if (!r) return;
  const d = formData(r), vs = formVersions(formId), rv = formReview(formId), p = $("#printRoot");
  p.innerHTML = `<div style="display:grid;gap:8px;color:#000;font-family:inherit"><h2 style="margin:0">${formTitle(r.type)} ${esc(r.ref)}</h2>
    <div class="small"><strong>${esc(S.client.name)}</strong> · status: ${esc(FORM_STATUS[r.status])} · printed ${esc(fmtDay(Date.now()))} ${fmtTime(Date.now())}</div>
    ${formViewHTML(r.type, d)}
    ${rv ? `<section><h3 style="font-size:16px;margin:6px 0 2px">Manager review</h3><div class="small">${esc(rv.byName || "")}, ${esc(dayLabel(rv.ts))} ${fmtTime(rv.ts)}. Statutory notification needed: ${esc(NOTIFY[rv.notify] || "")}${rv.why ? `. ${esc(rv.why)}` : ""}${rv.candour ? `. Duty of candour: ${esc(NOTIFY[rv.candour])}` : ""}${rv.safeguarding ? `. Safeguarding referral: ${esc(NOTIFY[rv.safeguarding])}` : ""}${rv.lessons ? `. Lessons learned: ${esc(rv.lessons)}` : ""}</div></section>` : ""}
    <section><h3 style="font-size:16px;margin:6px 0 2px">History</h3>${vs.map((v, i) => `<div class="small">${esc(dayLabel(v.ts))} ${fmtTime(v.ts)}, ${esc(v.byName || "")}: ${i ? esc(formChanges(vs[i - 1], v, r.type).join("; ")) : "started"}</div>`).join("")}</section>
    <div class="tiny">${internalNoteHTML()}</div><div class="tiny">Dignity Notes · pilot, made-up data only</div></div>`;
  printAlone();
}
function openSkinFollowUp(formId) {
  const r = formLatest(formId); if (!r) return;
  const d = formData(r);
  const s = sheet(`${sheetHead("Follow-up check")}<p class="small" style="margin:0"><strong>${esc(skinWhere(d))}</strong> · ${esc(r.ref)}</p>
    <label class="f">How is it now?<select id="fuStatus"><option value="">Choose…</option>${Object.entries(SKIN_STATUS).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>
    <label class="f">What you saw (optional)<textarea id="fuNote" rows="3" maxlength="1000" placeholder="e.g. Bruise fading, now yellow; no pain"></textarea></label>
    <div class="row"><button class="btn ghost" id="fuMic" style="flex:0 0 auto"></button></div><div class="small" id="fuMsg" role="status"></div>
    <label class="f">Next check due<input type="date" id="fuNext" min="${esc(dayKey(new Date()))}"></label>
    <button class="btn primary block" id="fuSave">Save the check</button>`, { onClose: () => dict.cancel() });
  const dict = dictation($("#fuNote", s.root), $("#fuMic", s.root), (t) => ($("#fuMsg", s.root).textContent = t), { hint: "Check the words, then tap Save the check.", max: 1000 });
  $("#fuStatus", s.root).onchange = (e) => { $("#fuNext", s.root).closest("label").hidden = e.target.value === "resolved"; };
  $("#fuSave", s.root).onclick = async (e) => {
    const btn = e.currentTarget; if (btn.disabled) return; btn.disabled = true;
    if (dict.busy()) await dict.finish();
    btn.disabled = false;
    const status = $("#fuStatus", s.root).value, next = $("#fuNext", s.root).value;
    if (!status) return toast("Choose how it is now");
    if (status !== "resolved" && !next) return toast("Choose when it should be checked next");
    const nd = { ...d, status, nextReview: status === "resolved" ? "" : next, followups: [...allFollowups(formId), { ts: Date.now(), byName: session.name || onDuty().name, status, note: $("#fuNote", s.root).value.trim().slice(0, 1000), nextReview: status === "resolved" ? "" : next }] };
    const rec = saveFormVersion("skin", formId, nd, status === "resolved" ? "closed" : "open", { noteId: r.noteId, flagId: r.flagId }); if (!rec) return;
    s.close(); render(); toast(status === "resolved" ? "Recorded as healed or resolved" : "Follow-up check saved");
  };
}
function openFormReview(formId) {
  const r = formLatest(formId), rv = formReview(formId); if (!r) return;
  const au = clientCountry() === "AU";
  const sel = (id, label, v) => `<label class="f">${label}<select id="${id}"><option value="">Choose…</option>${Object.entries(NOTIFY).map(([k, l]) => `<option value="${k}" ${v === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
  const s = sheet(`${sheetHead("Review the incident report")}<p class="small" style="margin:0"><strong>${esc(r.ref)}</strong> · ${esc(formLine(r))}</p>
    <p class="small" style="margin:0">${au ? "Decide whether this must be reported under the Serious Incident Response Scheme to the Aged Care Quality and Safety Commission (Priority 1 within 24 hours)." : "Decide whether this needs a statutory notification: for example to the CQC without delay for a serious injury, abuse or an allegation of abuse, or an incident reported to or investigated by the police (Regulation 18), or a death (Regulation 16); or to the HSE under RIDDOR."} The app doesn't send anything: notify through the proper channels.</p>
    ${sel("rvNotify", "Is a statutory notification needed?", rv && rv.notify)}
    <label class="f">Why (and, if notified, when and the reference)<textarea id="rvWhy" rows="3" maxlength="1000">${esc((rv && rv.why) || "")}</textarea></label>
    ${au ? "" : sel("rvCandour", "Does the duty of candour apply (moderate or severe harm, or death)?", rv && rv.candour)}
    ${sel("rvSafe", "Is a safeguarding referral needed?", rv && rv.safeguarding)}
    <label class="f">Lessons learned, and changes to the care plan or risk assessment<textarea id="rvLessons" rows="3" maxlength="1000">${esc((rv && rv.lessons) || "")}</textarea></label>
    <button class="btn primary block" id="rvSave">Save the review</button>`);
  $("#rvSave", s.root).onclick = () => {
    const notify = $("#rvNotify", s.root).value; if (!notify) return toast("Choose whether a notification is needed");
    const why = $("#rvWhy", s.root).value.trim(); if (!why) return toast("Say why");
    const now = Date.now(), rec = { id: uid(), ts: now, formId, notify, why: why.slice(0, 1000), lessons: $("#rvLessons", s.root).value.trim().slice(0, 1000), by: stampId(), byName: session.name || onDuty().name };
    const c = $("#rvCandour", s.root) && $("#rvCandour", s.root).value, g = $("#rvSafe", s.root).value;
    if (c) rec.candour = c; if (g) rec.safeguarding = g;
    touch(rec); (S.reviews = S.reviews || []).push(rec); save(); s.close(); render(); toast("Review saved"); openForm(formId);
  };
}
// All incident reports, newest first (Reports, and the record log's Incidents filter).
function openFormList(type) {
  const list = latestForms(type).sort((a, b) => b.ts - a.ts);
  const s = sheet(`${sheetHead(type === "incident" ? "Incident reports" : type === "assessment" ? "Professional assessments" : "Skin integrity forms")}
    <p class="small muted" style="margin:0">${type === "incident" ? "Started from an incident flag (open the flag, then Create incident report)." : type === "assessment" ? "Copy in an assessment a trained professional has completed (such as MUST or PAINAD), with their result as they wrote it. Upload their form to the care plan too, if you have it." : "Started from a skin flag, or below."}</p>
    ${type !== "incident" && !isFamily() ? `<button class="btn primary block" id="flNew">${type === "assessment" ? "Record a completed assessment" : "New skin check"}</button>` : ""}
    ${list.length ? list.map((r) => `<button class="btn secondary block fd-link" data-openform="${esc(r.formId)}"><div class="body"><strong>${esc(r.ref)} · ${esc(formLine(r))}</strong><div class="muted small">${esc(dayLabel(formVersions(r.formId)[0].ts))} · ${esc(type === "skin" && r.status === "open" ? "Being followed up" : FORM_STATUS[r.status])}${type === "incident" && isAgency() ? (formReview(r.formId) ? " · reviewed" : " · not reviewed yet") : ""}</div></div></button>`).join("") : `<div class="empty">None yet.</div>`}`);
  if ($("#flNew", s.root)) $("#flNew", s.root).onclick = () => { s.close(); openFormEdit(type); };
}

/* ---------- MUST: the supporting information (Sam, 2026-10-19) ----------
 * MUST (BAPEN) is completed by a trained person. The food report gathers what they'll need from the
 * notes: weights and dates for the last 6 months, height, BMI worked out from those measurements, weight
 * change, meals refused, and what's missing. It never gives a MUST score or a risk level: a score from
 * the app could be relied on as a clinical result (software as a medical device), and missing
 * information can't safely count as zero. A completed MUST is recorded as a professional assessment.
 */
const ASSESS_NOTE = "Copied from a professional's completed assessment. Dignity Notes doesn't calculate or check scores; follow the professional's advice and the care plan.";
function assessListHTML(tool, title) {
  const list = latestForms("assessment").filter((r) => formData(r).tool === tool).sort((a, b) => (formData(b).date || "").localeCompare(formData(a).date || ""));
  return `<div><h3 style="font-size:17px;margin:0 0 6px">${esc(title)}</h3>${list.length ? `<div style="display:grid;gap:6px">${list.slice(0, 5).map((r) => { const d = formData(r); return `<button class="link small" data-openform="${esc(r.formId)}" style="justify-self:start;text-align:left;min-height:40px">${d.date ? esc(fmtDay(new Date(d.date + "T12:00:00").getTime())) : ""}: ${esc(formLine(r))}${d.nextReview ? ` · next due ${esc(fmtDay(new Date(d.nextReview + "T12:00:00").getTime()))}` : ""}</button>`; }).join("")}</div>` : `<p class="small" style="margin:0">None recorded.</p>`}
    ${isFamily() ? "" : `<button class="btn secondary noprint" data-assessnew="${esc(tool)}" style="margin-top:6px">Record a completed ${esc(ASSESS_SHORT[tool])} assessment</button>`}</div>`;
}
function mustInfoHTML(weights, height, foodObs) {
  // One weight a day (the last one written that day).
  const perDay = [...new Map(weights.map((o) => [dayKey(new Date(o.ts)), o])).values()];
  const since = Date.now() - 183 * 864e5, w6 = perDay.filter((o) => o.ts >= since), last = weights[weights.length - 1];
  const day = (ts) => esc(fmtDay(ts)), li = [], missing = [];
  if (w6.length) li.push(`Weights in the last 6 months${w6.length > 8 ? ` (the latest 8 of ${w6.length})` : ""}: ${w6.slice(-8).map((o) => `${o.kg} kg (${day(o.ts)})`).join(", ")}.`);
  else { li.push(last ? `No weight in the last 6 months; the last was ${last.kg} kg on ${day(last.ts)}.` : "No weight has been recorded."); missing.push("a recent weight"); }
  if (height) li.push(`Height: ${height.cm} cm (${day(height.ts)}).`); else missing.push("height (or a measurement a professional can use instead)");
  if (last && height && height.cm > 50 && last.ts >= since) { const bmi = Math.round((last.kg / (height.cm / 100) ** 2) * 10) / 10; li.push(`BMI worked out from these measurements: ${bmi} kg/m² (weight ${last.kg} kg on ${day(last.ts)} ÷ height ${height.cm / 100} m squared, measured ${day(height.ts)}). Check the measurements before using it.`); }
  if (w6.length >= 2) { const a = w6[0], b = w6[w6.length - 1], dk = Math.round((b.kg - a.kg) * 10) / 10, pc = Math.round((dk / a.kg) * 1000) / 10; li.push(`Weight change: ${dk > 0 ? "+" : ""}${dk} kg (${pc > 0 ? "+" : ""}${pc}%) between ${day(a.ts)} and ${day(b.ts)}.`); }
  else missing.push("two or more weights over the last 3 to 6 months");
  const lossNotes = observations().filter((o) => o.topic === "weight" && /unplanned|unintentional|not trying|planned|on purpose|diet/i.test(o.words || ""));
  li.push(lossNotes.length ? `Notes about whether weight change was planned: ${lossNotes.map((o) => `"${esc(o.words)}" (${day(o.ts)})`).join("; ")}.` : "Whether any weight loss was planned or unplanned isn't written in the notes.");
  const refused = foodObs.filter((o) => o.portion === "none" || o.outcome === "refused"), little = foodObs.filter((o) => o.portion === "little");
  li.push(`In this period: ${refused.length} meal${refused.length === 1 ? "" : "s"} refused or nothing eaten, ${little.length} with only a little eaten.`);
  li.push("Illness affecting eating, or days with little or nothing to eat, aren't worked out by the app: check the notes and incidents.");
  return `<div class="card" style="box-shadow:none;display:grid;gap:6px;break-inside:avoid"><h3 style="font-size:17px;margin:0">MUST: supporting information</h3>
    <p class="small" style="margin:0">For whoever completes the <strong>Malnutrition Universal Screening Tool</strong> (MUST): someone trained to use it, as the care provider's policy says (often a nurse, dietitian or trained care worker). <strong>Dignity Notes doesn't give a MUST score or risk level.</strong></p>
    <ul class="small" style="margin:0;padding-left:18px;display:grid;gap:3px">${li.map((x) => `<li>${x}</li>`).join("")}</ul>
    ${missing.length ? `<p class="small" style="margin:0"><strong>Missing:</strong> ${esc(missing.join("; "))}. Missing information is never counted as nothing wrong.</p>` : ""}
    ${assessListHTML("must", "Completed MUST assessments")}</div>`;
}
