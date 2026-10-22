// Dignity Notes: observations for the reports and the specialist reports.
// Loaded by index.html after app.js, in order; shares its global scope (one app split into files).
"use strict";

/* ---------- observations for the reports ----------
 * Each saved note also records what it says about drinks, meals, bowels, urine, pain, sleep, behaviour,
 * skin, mobility and weight, as separate records the reports count from (record once). The carer can
 * correct or remove one on the Saved screen; the note itself never changes. Amounts are only what was
 * said, or worked out from this client's cup sizes; an unclear amount stays "not known".
 */
const OBS_TOPIC = { fluids: "Drink", food: "Food", bowels: "Bowels", urinary: "Urine", pain: "Pain or discomfort", sleep: "Sleep", behaviour: "Behaviour", skin: "Skin", mobility: "Mobility", weight: "Weight or height" };
const OBS_OUTCOME = { taken: "Taken", partly: "Partly taken", refused: "Refused", opened: "Bowels opened", not_opened: "Bowels not opened (said so)", accident: "Bowel accident", passed: "Passed urine", incontinent: "Incontinent of urine", pad_wet: "Pad wet", pad_dry: "Pad dry", catheter: "Catheter", slept: "Slept well", woke: "Woke in the night", restless: "Restless or unsettled", napped: "Slept in the day", awake_night: "Awake most of the night" };
const OBS_PORTION = { all: "All", most: "Most", half: "Half", little: "A little", none: "None", unknown: "Amount not known" };
const observations = () => (S.observations || []).filter((o) => !o.removed);
const CUPS = () => ({ cup: 200, mug: 300, glass: 250, ...(S.cups || {}) });
// One AI item → one record, keeping only what was actually given (-1, "" and "na" mean not said).
function obsFromDraft(o, note) {
  const num = (v, lo, hi) => (Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v * 10) / 10 : undefined);
  const r = { id: uid(), ts: note.ts, noteId: note.id, carerId: note.carerId, topic: o.topic, words: String(o.words || "").slice(0, 300) };
  if (o.drink) r.drink = String(o.drink).slice(0, 60);
  if (num(o.offered_ml, 0, 3000) !== undefined) r.offeredMl = num(o.offered_ml, 0, 3000);
  if (num(o.drank_ml, 0, 3000) !== undefined) r.drankMl = num(o.drank_ml, 0, 3000);
  if (OBS_PORTION[o.portion]) r.portion = o.portion;
  if (OBS_OUTCOME[o.outcome]) r.outcome = o.outcome;
  if (num(o.bristol, 1, 7) !== undefined) r.bristol = Math.round(o.bristol);
  if (num(o.pain_score, 0, 10) !== undefined) r.painScore = Math.round(o.pain_score);
  if (o.where) r.where = String(o.where).slice(0, 80);
  if (num(o.kg, 20, 300) !== undefined) r.kg = num(o.kg, 20, 300);
  if (num(o.cm, 80, 230) !== undefined) r.cm = num(o.cm, 80, 230);
  if (r.topic === "behaviour") { if (o.before) r.before = String(o.before).slice(0, 300); if (o.after) r.after = String(o.after).slice(0, 300); }
  if (r.outcome && ["slept", "woke", "restless", "napped", "awake_night"].includes(r.outcome) !== (r.topic === "sleep")) delete r.outcome; // sleep outcomes only for sleep
  return OBS_TOPIC[r.topic] ? r : null;
}
const obsLine = (o) => {
  if (o.topic === "fluids") return `${o.drink || "Drink"}: ${o.outcome === "refused" ? `offered${o.offeredMl ? " " + o.offeredMl + " ml" : ""}, refused` : o.drankMl != null ? `${o.drankMl} ml drunk${o.offeredMl && o.offeredMl !== o.drankMl ? ` of ${o.offeredMl} ml` : ""}` : "amount drunk not known"}`;
  if (o.topic === "food") return `${OBS_PORTION[o.portion] || OBS_OUTCOME[o.outcome] || "Food"}: ${o.words}`;
  if (o.topic === "bowels" || o.topic === "urinary") return `${OBS_OUTCOME[o.outcome] || OBS_TOPIC[o.topic]}${o.bristol ? ` · Bristol type ${o.bristol}` : ""}: ${o.words}`;
  if (o.topic === "pain") return `${o.painScore != null ? `Score ${o.painScore}/10 · ` : ""}${o.where ? o.where + " · " : ""}${o.words}`;
  if (o.topic === "sleep") return `${OBS_OUTCOME[o.outcome] ? OBS_OUTCOME[o.outcome] + ": " : ""}${o.words}`;
  if (o.topic === "behaviour") return `${o.words}${o.before ? ` · Before: ${o.before}` : ""}${o.after ? ` · After: ${o.after}` : ""}`;
  if (o.topic === "weight") return `${o.kg ? o.kg + " kg" : ""}${o.kg && o.cm ? " · " : ""}${o.cm ? o.cm + " cm" : ""}${o.kg || o.cm ? "" : o.words}`;
  return o.words;
};
function noteObsHTML(n) {
  const list = observations().filter((o) => o.noteId === n.id);
  if (!list.length) return "";
  return `<details><summary class="small">For the reports (${list.length})</summary><div style="display:grid;gap:6px;margin-top:6px">${list.map((o) => `<div style="display:flex;gap:8px;align-items:flex-start;justify-content:space-between"><span class="small" style="flex:1;min-width:0"><strong>${esc(OBS_TOPIC[o.topic])}</strong> · ${esc(obsLine(o))}${o.fixedBy ? ` <span class="tiny muted">(corrected by ${esc(o.fixedBy)})</span>` : ""}</span><button class="link small" data-obsfix="${esc(o.id)}" style="flex:0 0 auto">Change</button></div>`).join("")}
    <p class="tiny muted" style="margin:0">Taken from this note by AI for the reports. Check the amounts; the note itself doesn't change.</p></div></details>`;
}
function openObsFix(id, after) {
  const o = (S.observations || []).find((x) => x.id === id); if (!o) return;
  const f = o.topic;
  const s = sheet(`${sheetHead("Change: " + esc(OBS_TOPIC[f]))}<p class="small muted" style="margin:0">From the note: "${esc(o.words)}"</p>
    ${f === "fluids" ? `<label class="f">Drink<input type="text" id="ofDrink" maxlength="60" value="${esc(o.drink || "")}"></label>
      <div class="row" style="gap:8px"><label class="f" style="flex:1">Offered (ml)<input type="number" id="ofOff" min="0" max="3000" value="${o.offeredMl ?? ""}"></label><label class="f" style="flex:1">Drunk (ml, blank if not known)<input type="number" id="ofDrank" min="0" max="3000" value="${o.drankMl ?? ""}"></label></div>
      <p class="tiny muted" style="margin:-4px 0 0">This client: cup ${CUPS().cup} ml, mug ${CUPS().mug} ml, glass ${CUPS().glass} ml.</p>` : ""}
    ${["fluids", "food", "bowels", "urinary", "sleep"].includes(f) ? `<label class="f">What happened<select id="ofOut"><option value="">Not said</option>${Object.entries(OBS_OUTCOME).filter(([k]) => ({ sleep: ["slept", "woke", "restless", "napped", "awake_night"], fluids: ["taken", "partly", "refused"], food: ["taken", "partly", "refused"], bowels: ["opened", "not_opened", "accident"], urinary: ["passed", "incontinent", "pad_wet", "pad_dry", "catheter"] })[f].includes(k)).map(([k, l]) => `<option value="${k}" ${o.outcome === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>` : ""}
    ${f === "food" ? `<label class="f">How much was eaten<select id="ofPor"><option value="">Not said</option>${Object.entries(OBS_PORTION).map(([k, l]) => `<option value="${k}" ${o.portion === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>` : ""}
    ${f === "bowels" ? `<label class="f">Bristol stool type (only if known)<select id="ofBr"><option value="">Not said</option>${[1, 2, 3, 4, 5, 6, 7].map((k) => `<option ${o.bristol === k ? "selected" : ""}>${k}</option>`).join("")}</select></label>` : ""}
    ${f === "behaviour" ? `<label class="f">Before (what was happening just before)<input type="text" id="ofBefore" maxlength="300" value="${esc(o.before || "")}"></label><label class="f">After (what you did, and how they responded)<input type="text" id="ofAfter" maxlength="300" value="${esc(o.after || "")}"></label>` : ""}
    ${f === "pain" ? `<div class="row" style="gap:8px"><label class="f" style="flex:1">Score 0 to 10 (only if given)<input type="number" id="ofSc" min="0" max="10" value="${o.painScore ?? ""}"></label><label class="f" style="flex:1">Where<input type="text" id="ofWh" maxlength="80" value="${esc(o.where || "")}"></label></div>` : ""}
    ${f === "weight" ? `<div class="row" style="gap:8px"><label class="f" style="flex:1">Weight (kg)<input type="number" id="ofKg" step="0.1" min="20" max="300" value="${o.kg ?? ""}"></label><label class="f" style="flex:1">Height (cm)<input type="number" id="ofCm" min="80" max="230" value="${o.cm ?? ""}"></label></div>` : ""}
    <button class="btn primary block" id="ofSave">Save</button><button class="btn ghost block" id="ofDel">Not right: remove it from the reports</button>`);
  const val = (sel) => { const el = $(sel, s.root); return el ? el.value.trim() : undefined; };
  const numOr = (v, lo, hi) => (v === undefined ? "keep" : v === "" ? undefined : Number(v) >= lo && Number(v) <= hi ? Number(v) : NaN);
  const done = () => { o.fixedBy = session.name || session.username; o.fixedAt = Date.now(); touch(o); save(); s.close(); toast("Changed for the reports"); if (after) after(); };
  $("#ofSave", s.root).onclick = () => {
    const set = { before: val("#ofBefore"), after: val("#ofAfter"), drink: val("#ofDrink"), offeredMl: numOr(val("#ofOff"), 0, 3000), drankMl: numOr(val("#ofDrank"), 0, 3000), outcome: val("#ofOut"), portion: val("#ofPor"), bristol: numOr(val("#ofBr"), 1, 7), painScore: numOr(val("#ofSc"), 0, 10), where: val("#ofWh"), kg: numOr(val("#ofKg"), 20, 300), cm: numOr(val("#ofCm"), 80, 230) };
    if (Object.values(set).some((v) => Number.isNaN(v))) return toast("A number is outside the allowed range");
    for (const [k, v] of Object.entries(set)) { if (v === "keep") continue; if (v === undefined || v === "") delete o[k]; else o[k] = v; }
    done();
  };
  $("#ofDel", s.root).onclick = (e) => confirmInline(e.currentTarget, () => { o.removed = Date.now(); done(); }, "Tap again to remove");
}
async function loadCups() { if (!cloudOn()) return; try { const out = await syncJSON("/plan/cups", { client: session.client.id }); if (out.cups) { S.cups = out.cups; saveLocal(); } } catch {} }
function openCups(after) {
  const c = CUPS();
  const s = sheet(`${sheetHead("Cup sizes and fluid target")}
    <p class="small muted" style="margin:0">The usual sizes of ${esc(S.client.name)}'s cup, mug and glass, so "a cup of tea" is counted correctly. Measure them if you can (fill with water and pour into a jug).</p>
    <div class="row" style="gap:8px"><label class="f" style="flex:1">Cup (ml)<input type="number" id="cuCup" min="50" max="1000" value="${c.cup}"></label><label class="f" style="flex:1">Mug (ml)<input type="number" id="cuMug" min="50" max="1000" value="${c.mug}"></label><label class="f" style="flex:1">Glass (ml)<input type="number" id="cuGlass" min="50" max="1000" value="${c.glass}"></label></div>
    <label class="f">Daily fluid target (ml), only if the care plan or GP gives one<input type="number" id="cuTarget" min="100" max="5000" value="${c.target || ""}" placeholder="Leave blank if none"></label>
    <p class="tiny muted" style="margin:-4px 0 0">The target is shown beside the daily totals for reference. The app doesn't raise alerts: follow the care plan.</p>
    <button class="btn primary block" id="cuSave">Save</button>`);
  $("#cuSave", s.root).onclick = async (e) => {
    if (!navigator.onLine) return toast("Connect to the internet to save, so every carer sees the same");
    e.currentTarget.disabled = true;
    try { const out = await syncJSON("/plan/cups", { client: session.client.id, set: { cup: $("#cuCup", s.root).value, mug: $("#cuMug", s.root).value, glass: $("#cuGlass", s.root).value, target: $("#cuTarget", s.root).value } }); S.cups = out.cups; saveLocal(); s.close(); toast("Cup sizes saved"); if (after) after(); }
    catch (err) { toast(err.message || "Couldn't save"); const b = $("#cuSave", s.root); if (b) b.disabled = false; }
  };
}
/* ---------- specialist reports ----------
 * Record once: reports are made from carers' ordinary notes and incidents, only when someone opens one,
 * for a chosen period. Every point links to the notes it came from; days with no notes are shown as
 * "no notes", never as "no problems". Falls and mobility is the first (Sam's briefs, 2026-10-19);
 * fluids, food, bowels, urinary, pain, sleep, behaviour and skin follow the same pattern.
 */
const aboutHTML = (what, why, who, when, link, extra = "") => `<h3>What is it?</h3><p>${what}</p><h3>Why is it used?</h3><p>${why}</p><h3>Who might ask for it?</h3><p>${who}</p><h3>When is it useful?</h3><p>${when}</p>
  <h3>Who completes it?</h3><p>Nobody: Dignity Notes counts it from carers' ordinary notes. When a note is saved, the drinks, meals and other details in it are picked out (by AI) and can be checked and corrected on the Saved screen. ${extra}</p>
  <p><strong>Days with no notes</strong> aren't evidence of anything, only that nothing was written.</p><h3>Further information</h3><p>${link}</p>
  <p><strong>Something urgent?</strong> Follow the care plan and get help straight away; don't wait for a report.</p>`;
const ext = (url, text) => `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
const REPORTS = {
  falls: {
    title: "Falls and mobility",
    pick: (n) => (n.categories || []).includes("Mobility") || /\b(fall\w*|fell|floor|ground|slip\w*|trip\w*|tumbl\w*|unsteady|balance|wobbl\w*|walk(ed|ing)?|frame|zimmer|stick|wheelchair|hoist|transfer\w*|stand(ing)?|stood|weak(ness)?|legs?)\b/i.test(n.note || ""),
    pickFlag: (f) => f.kind === "incident" && /\b(fall\w*|fell|floor|ground|slip\w*|trip\w*|tumbl\w*|found down)\b/i.test(`${f.title} ${f.detail}`),
    groups: [["Fall", ["fall"], "var(--incident)"], ["Near fall", ["near_fall"], "#d98a00"], ["Harder than usual", ["unsteady", "standing", "transfer", "more_help", "weakness"], "#b5651d"], ["Better", ["improvement", "less_help"], "#2e7d32"], ["Other", ["walking_aid", "other"], "#7a7085"]],
    labels: { fall: "Fall", near_fall: "Near fall", unsteady: "Unsteady or loss of balance", standing: "Standing up or sitting down", transfer: "Transfers", more_help: "More help needed", less_help: "Less help needed", walking_aid: "Walking aid", weakness: "Weakness", improvement: "Improvement", other: "Other" },
    about: (au) => `<h3>What is it?</h3><p>A record of what carers wrote about ${au ? "mobility" : "mobility"}, balance and falls over a period: falls and near falls, unsteadiness, getting up and sitting down, moving between bed, chair and toilet, how much help was needed, walking aids, and any improvement. It's made from the ordinary notes and incident records, so nobody fills in anything extra.</p>
      <h3>Why is it used?</h3><p>Changes in mobility often build up slowly over days or weeks and are easy to miss from one shift to the next. The report puts them in date order, with each point linked to the note it came from.</p>
      <h3>Who might ask for it?</h3><p>A GP, ${au ? "community nurse" : "district nurse"}, physiotherapist or occupational therapist, the falls service, the family or an agency, for example after a fall or when someone seems less steady.</p>
      <h3>When is it useful?</h3><p>When asked "has their walking changed this month?", before a GP or therapist visit, after a fall, or when a new carer starts.</p>
      <h3>Who completes it?</h3><p>Nobody: Dignity Notes writes it from carers' notes when it's opened, using AI. Check it against the notes before sharing it. <strong>It is not a falls risk assessment</strong>, which is done by a trained professional. If a professional has done one, upload it to the care plan as a risk assessment and it's listed at the end of the report.</p>
      <p><strong>Days with no notes</strong> aren't evidence that all was well, only that nothing was written.</p>
      <h3>Further information</h3><p>${au ? `<a href="https://www.safetyandquality.gov.au/our-work/comprehensive-care/related-topics/falls-prevention" target="_blank" rel="noopener">Australian Commission on Safety and Quality in Health Care: falls prevention</a>` : `<a href="https://www.nice.org.uk/guidance/ng249" target="_blank" rel="noopener">NICE guideline NG249: falls in older people</a>`}</p>
      <p><strong>Something urgent?</strong> Follow the care plan and get help straight away; don't wait for a report.</p>`,
  },
  fluids: {
    title: "Fluid intake", topic: "fluids", words: /\b(drink|drank|drunk|tea|coffee|water|juice|squash|milk|cup|mug|glass|sip|fluid)/i,
    about: (au) => aboutHTML("A daily record of the drinks carers wrote down: what, how much was drunk, and drinks that were offered but refused, with an estimated total for each day.",
      "It shows changes in drinking over days or weeks, such as drinking less or refusing more, without anyone filling in a separate fluid chart.",
      `A GP, ${au ? "community nurse" : "district nurse"}, dietitian, the family or an agency, for example when someone seems drowsy, confused or has a urine infection.`,
      "When someone is asked \"how much have they been drinking?\", or a new carer starts.",
      au ? ext("https://www.healthdirect.gov.au/dehydration", "healthdirect: dehydration") : ext("https://www.nhs.uk/conditions/dehydration/", "NHS: dehydration"),
      "Amounts are estimates, using this client's cup, mug and glass sizes (Care plan, then Cup sizes). Drinks with an unclear amount aren't counted; refused drinks count as nothing. <strong>Totals include only drinks that were written down</strong>, so the real amount may be higher. If the care plan sets fluid monitoring, follow it: this report doesn't replace it."),
  },
  food: {
    title: "Food and nutrition", topic: "food", words: /\b(ate|eat|eaten|breakfast|lunch|dinner|supper|meal|snack|food|appetite|toast|porridge|soup)/i,
    about: (au) => aboutHTML("A record of meals and snacks carers wrote about: how much was eaten, meals refused, appetite, chewing or swallowing, supplements, and any weights measured.",
      "It shows changes in eating and weight over time, such as eating less or refusing more meals.",
      `A GP, ${au ? "community nurse" : "district nurse"}, dietitian or speech and language therapist, the family or an agency.`,
      "When there are worries about appetite, weight or swallowing, or before a GP or dietitian visit.",
      au ? ext("https://www.healthdirect.gov.au/malnutrition", "healthdirect: malnutrition") : ext("https://www.bapen.org.uk/", "BAPEN (British Association for Parenteral and Enteral Nutrition)"),
      "It isn't a nutrition assessment or a malnutrition screening (such as MUST), which a trained professional does. Difficulty swallowing or coughing when eating needs reporting straight away."),
  },
  bowels: {
    title: "Bowels and continence", topic: "bowels", words: /\b(bowel|stool|poo|constipat|diarrh|soiled|motion)/i,
    about: (au) => aboutHTML("A record of bowel movements carers wrote about: when, what was said about them, any Bristol stool type the carer gave, accidents, and help needed.",
      "It shows the person's usual pattern and any change, so a carer starting a shift can see what has been happening without reading weeks of notes.",
      `A GP, ${au ? "community or continence nurse" : "district or continence nurse"}, the family or an agency.`,
      "When a new carer arrives, or there are worries about constipation, diarrhoea or accidents. The <strong>Bristol Stool Chart</strong> describes stools as types 1 (hard lumps) to 7 (watery); the report shows a type only when the carer gave one.",
      au ? ext("https://www.continence.org.au/", "Continence Foundation of Australia") : ext("https://www.nhs.uk/conditions/constipation/", "NHS: constipation"),
      "<strong>\"Nothing recorded\" is not the same as \"not opened\"</strong>: only a carer saying so counts as not opened. Laxatives given as when-required doses for the bowels are shown from the medicines chart; the report never says a medicine caused anything."),
  },
  urinary: {
    title: "Urinary and bladder", topic: "urinary", words: /\b(urine|wee|pad|wet|catheter|toilet|bladder|incontinen)/i,
    about: (au) => aboutHTML("A record of passing urine carers wrote about: incontinence (day or night), pads wet or dry, catheter care, and anything noticed about colour, smell or discomfort, in the carer's words.",
      "It shows changes in urinary habits over time, separately from the bowel record.",
      `A GP, ${au ? "community or continence nurse" : "district or continence nurse"}, the family or an agency.`,
      "When someone is going more or less often, is wet more at night, or seems uncomfortable.",
      au ? ext("https://www.continence.org.au/", "Continence Foundation of Australia") : ext("https://www.nhs.uk/conditions/urinary-incontinence/", "NHS: urinary incontinence"),
      "<strong>\"Nothing recorded\" is not the same as \"didn't pass urine\".</strong> Changes in colour, smell or frequency have many causes; the report never suggests one. Drinks from the fluid report are shown for context."),
  },
  sleep: {
    title: "Sleep and rest", topic: "sleep", words: /\b(sleep|slept|woke|awake|nap|napped|restless|unsettled|settled|bed ?time)/i,
    about: (au) => aboutHTML("A record of what carers wrote about sleep and rest: sleeping well, waking in the night, restlessness, being awake most of the night, and sleeping in the day, with pain written about at night and any when-required medicines for sleep from the chart.",
      "Changes in sleep often show something else is changing (pain, a urine infection, low mood, a new medicine). Seeing each night side by side shows patterns a single shift can't.",
      `A GP, ${au ? "community nurse" : "district nurse"}, memory or mental health team, the family or an agency.`,
      "When someone seems more tired or unsettled, before a GP visit, or when a new night carer starts.",
      au ? ext("https://www.healthdirect.gov.au/sleep", "healthdirect: sleep") : ext("https://www.nhs.uk/live-well/sleep-and-tiredness/", "NHS: sleep and tiredness"),
      "Each entry counts towards the night it belongs to (before midday counts as the night before). <strong>A night with nothing written isn't a night slept well.</strong> The report never says why sleep changed."),
  },
  behaviour: {
    title: "Behaviour (ABC)", topic: "behaviour", words: /\b(agitat|distress|shout|upset|angry|aggress|refus|wander|anxious|confus|crying|cried|scream|hit|kick|calm|settled)/i,
    about: (au) => aboutHTML("An ABC chart made from carers' notes: for each behaviour written about, what was happening just before (A, the antecedent), what the person did or said (B, the behaviour), and what happened after, including what the carer did and how the person responded (C, the consequence).",
      "Behaviour is often a way of communicating a need (pain, fear, needing the toilet, too much noise, a change of routine). An ABC chart shows patterns, such as a time of day or a trigger, without anyone filling in a separate chart.",
      `A GP, memory or mental health team, ${au ? "Dementia Support Australia" : "a dementia specialist nurse"}, the family or an agency, for example when a care plan for distressed behaviour is being written.`,
      "When distress or refusals happen more often, before a review, or when a new carer starts. Saying in your note what happened before and what helped makes the chart more useful.",
      au ? ext("https://www.dementia.com.au/", "Dementia Support Australia") : ext("https://www.nice.org.uk/guidance/ng97", "NICE guideline NG97: dementia"),
      "Before and after come only from what the note says. <strong>The report never says why a behaviour happened</strong> or labels anyone as aggressive. Distress that puts someone at risk needs reporting straight away, and an injury is an incident."),
  },
  skin: {
    title: "Skin integrity", topic: "skin", words: /\b(skin|bruis|graze|tear|redness|sore|blister|rash|wound|pressure|cream|itch)/i,
    about: (au) => aboutHTML("A record of what carers wrote about the skin (redness, bruises, skin tears, sore or broken skin, creams), the skin integrity forms completed, their follow-up checks, and the \"I've checked the skin\" ticks from carers catching up.",
      "Skin damage, especially pressure damage, can develop in hours and is easier to prevent than to heal. Seeing every entry in date order shows whether a concern is new, repeating, healing or getting worse.",
      `A GP, ${au ? "community nurse" : "district nurse"} or tissue viability nurse, the family or an agency, for example when a sore area doesn't heal.`,
      "Before a nurse or GP visit, when a red or sore area is found, or when a new carer starts. Pressure damage is described in categories 1 to 4 (from a red patch that doesn't fade when pressed, to a very deep wound); the form records what the carer saw, never a diagnosis.",
      au ? ext("https://www.healthdirect.gov.au/pressure-sores", "healthdirect: pressure sores") : ext("https://www.nhs.uk/conditions/pressure-sores/", "NHS: pressure ulcers (pressure sores)"),
      "Skin integrity forms are completed by carers from a skin flag, or from this report. Deeper pressure damage (category 3 or 4, or can't tell how deep) or several sore areas may need a safeguarding referral: ask the nurse and your manager."),
  },
  pain: {
    title: "Pain and discomfort", topic: "pain", words: /\b(pain|hurt|ache|sore|grimac|discomfort|wince)/i,
    about: (au) => aboutHTML("A record of pain or discomfort carers wrote about: what the person said, where, any score out of 10 they gave, and signs carers noticed such as grimacing or holding a body part, in the carer's words.",
      "People living with dementia may not be able to say they're in pain. Bringing together what carers noticed helps show whether something is new, repeating or changing.",
      `A GP, ${au ? "community nurse" : "district nurse"}, physiotherapist or palliative care team, the family or an agency.`,
      "Before a GP visit, when complaints seem more frequent, or when a new carer starts. Recognised tools such as <strong>PAINAD</strong> (Pain Assessment in Advanced Dementia) are used by trained staff; this report doesn't score them.",
      au ? ext("https://www.dementia.org.au/", "Dementia Australia") : ext("https://www.alzheimers.org.uk/", "Alzheimer's Society"),
      "Signs such as restlessness are shown as written: the report never decides they mean pain. When-required pain relief from the medicines chart is shown alongside; the report never says it worked or caused anything. New, severe or worrying pain needs reporting straight away."),
  },
};
function openReports() {
  const s = sheet(`${sheetHead("Reports · " + esc(S.client.name))}
    <p class="small muted" style="margin:0">Made from the notes carers already write, for any period. Nothing extra to fill in.</p>
    ${Object.entries(REPORTS).map(([k, r]) => `<button class="btn secondary block fd-link" data-report="${k}"><div class="body"><strong>${esc(r.title)}</strong><div class="muted small">Last 7, 14 or 30 days, or choose dates</div></div></button>`).join("")}
    <button class="btn secondary block fd-link" id="rpInc"><div class="body"><strong>Incident reports</strong><div class="muted small">Every incident report, with its history${isAgency() ? " and review" : ""}</div></div></button>
    <button class="btn secondary block fd-link" id="rpAssess"><div class="body"><strong>Professional assessments</strong><div class="muted small">MUST, PAINAD and others completed by a professional</div></div></button>
    <button class="btn secondary block fd-link" id="rpSkinForms"><div class="body"><strong>Skin integrity forms</strong><div class="muted small">Each skin concern and its follow-up checks</div></div></button>
    ${canEditPlan() ? '<button class="link small" id="rpCups" style="justify-self:start;min-height:40px">Cup sizes and fluid target</button>' : ""}`);
  $("#rpInc", s.root).onclick = () => openFormList("incident");
  $("#rpSkinForms", s.root).onclick = () => openFormList("skin");
  $("#rpAssess", s.root).onclick = () => openFormList("assessment");
  if ($("#rpCups", s.root)) $("#rpCups", s.root).onclick = () => { s.close(); openCups(openReports); };
  s.root.querySelectorAll("[data-report]").forEach((b) => (b.onclick = () => { s.close(); openReport(b.dataset.report); }));
}
const reportRange = (days, from, to) => { if (from && to) { const a = new Date(from + "T00:00:00"), b = new Date(to + "T23:59:59"); return { from: a.getTime(), to: b.getTime(), label: `${fmtDay(a.getTime())} to ${fmtDay(b.getTime())}` }; } const t = new Date(); t.setHours(23, 59, 59, 999); const f = new Date(t); f.setDate(f.getDate() - days + 1); f.setHours(0, 0, 0, 0); return { from: f.getTime(), to: t.getTime(), label: `Last ${days} days (${fmtDay(f.getTime())} to ${fmtDay(t.getTime())})` }; };
// Reports counted from the observations saved with each note (no AI when the report is opened).
function openObsReport(kind, R, range, opts) {
  const inRange = (ts) => ts >= range.from && ts <= range.to;
  const all = observations().filter((o) => o.topic === R.topic && inRange(o.ts)).sort((a, b) => a.ts - b.ts);
  const ds = []; for (const d = new Date(range.from); d.getTime() <= range.to && ds.length < 92; d.setDate(d.getDate() + 1)) ds.push(dayKey(d));
  const day = (o) => dayKey(new Date(o.ts));
  const notesDays = new Set(S.notes.filter((n) => !isExample(n) && inRange(n.ts)).map((n) => dayKey(new Date(n.ts))));
  const recDays = new Set(all.map(day)), first = (S.observations || []).reduce((m, o) => Math.min(m, o.ts), Infinity);
  const startNote = first === Infinity ? `These reports count from notes saved since this update; earlier notes aren't included.` : first > range.from ? `Recording for these reports started ${fmtDay(first)}; notes before then aren't included.` : "";
  const dLabel = (k) => fmtDay(new Date(k + "T12:00:00").getTime());
  const when = (ts) => `${esc(dayLabel(ts))} ${fmtTime(ts)}`;
  const byNote = (o) => S.notes.find((n) => n.id === o.noteId);
  const who = (o) => { const n = byNote(o); return n ? carer(n.carerId, n.carerName).name : ""; };
  const prnFor = (re) => { const all = doses().filter((d) => d.slot === "prn"); return all.filter((d) => inRange(d.ts) && GIVEN.has(d.code) && !all.some((x) => x.corrects === d.id) && re.test(((medsState().list.find((m) => m.id === d.medId) || {}).prnFor) || "")); }; // corrected entries left out, as on the chart
  let summary = [], graphRows = [], extraHTML = "", timeline = all.map((o) => ({ ts: o.ts, html: `<strong class="small">${esc(OBS_TOPIC[o.topic])}</strong><div class="small">${esc(obsLine(o))}</div>`, o }));
  const n = (x, one, many) => `${x} ${x === 1 ? one : many}`;
  if (R.topic === "fluids") {
    const c = CUPS(), byDay = new Map(ds.map((d) => [d, { ml: 0, known: 0, unknown: 0, refused: 0 }]));
    for (const o of all) { const t = byDay.get(day(o)); if (!t) continue; if (o.outcome === "refused" || o.drankMl === 0) t.refused++; else if (o.drankMl != null) { t.ml += o.drankMl; t.known++; } else t.unknown++; }
    const withDrinks = ds.filter((d) => { const t = byDay.get(d); return t.known || t.refused || t.unknown; });
    const counted = ds.filter((d) => byDay.get(d).known || byDay.get(d).refused); // a day of refusals is a 0 ml day, not a missing one
    const totals = counted.map((d) => byDay.get(d).ml);
    const refused = [...byDay.values()].reduce((a, t) => a + t.refused, 0), unknown = [...byDay.values()].reduce((a, t) => a + t.unknown, 0);
    summary.push(`Drinks were written down on ${withDrinks.length} of the ${ds.length} days.`);
    if (counted.length) {
      const lo = counted.reduce((a, d) => (byDay.get(d).ml < byDay.get(a).ml ? d : a)), hi = counted.reduce((a, d) => (byDay.get(d).ml > byDay.get(a).ml ? d : a));
      summary.push(counted.length === 1 ? `Recorded total: ${byDay.get(lo).ml} ml on ${dLabel(lo)}.` : `On the ${counted.length} days with drinks counted, the recorded total was between ${byDay.get(lo).ml} ml (${dLabel(lo)}) and ${byDay.get(hi).ml} ml (${dLabel(hi)}), ${Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)} ml a day on average.`);
      if (c.target) summary.push(`Daily target (from the care plan or GP): ${c.target} ml. The recorded total reached it on ${counted.filter((d) => byDay.get(d).ml >= c.target).length} of ${n(counted.length, "day", "days")} with drinks counted.`);
      const half = Math.floor(counted.length / 2);
      if (counted.length >= 6) { const avg = (xs) => Math.round(xs.reduce((a, d) => a + byDay.get(d).ml, 0) / xs.length); summary.push(`Average recorded total: ${avg(counted.slice(0, half))} ml a day in the first half of these days, ${avg(counted.slice(half))} ml in the second half.`); }
    }
    if (refused) summary.push(`${n(refused, "drink was", "drinks were")} offered and refused.`);
    if (unknown) summary.push(`${n(unknown, "drink", "drinks")} had an amount that wasn't clear, so ${unknown === 1 ? "it isn't" : "they aren't"} counted.`);
    summary.push(`Totals include only drinks that were written down and are estimates (cup ${c.cup} ml, mug ${c.mug} ml, glass ${c.glass} ml).`);
    const max = Math.max(c.target || 0, ...ds.map((d) => byDay.get(d).ml), 1);
    extraHTML = `<div><h3 style="font-size:17px;margin:0 0 6px">Each day</h3><div style="display:grid;gap:4px">${ds.map((d) => { const t = byDay.get(d); return `<div class="small" style="display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid var(--line, #eee);padding:4px 0"><span>${esc(dLabel(d))}</span><span>${t.known || t.refused || t.unknown ? `<strong>${t.ml} ml</strong>${t.refused ? ` · ${t.refused} refused` : ""}${t.unknown ? ` · ${t.unknown} not known` : ""}` : notesDays.has(d) ? '<span class="muted">No drinks written down</span>' : '<span class="muted">No notes</span>'}</span></div>`; }).join("")}</div></div>`;
    graphRows = { bars: ds.map((d) => ({ d, v: byDay.get(d).ml, has: byDay.get(d).known > 0 || byDay.get(d).refused > 0 })), max, target: c.target };
  } else if (R.topic === "food") {
    const cnt = (k) => all.filter((o) => o.portion === k || (k === "none" && o.outcome === "refused" && !o.portion)).length;
    summary.push(`Meals, snacks or eating were written about on ${recDays.size} of the ${ds.length} days.`);
    const parts = [["all", "all eaten"], ["most", "most eaten"], ["half", "half eaten"], ["little", "a little eaten"], ["none", "refused or nothing eaten"], ["unknown", "amount not known"]].map(([k, l]) => [cnt(k), l]).filter(([x]) => x);
    if (parts.length) summary.push(`Recorded: ${parts.map(([x, l]) => `${x} ${l}`).join(", ")}.`);
    const weights = observations().filter((o) => o.topic === "weight" && o.kg).sort((a, b) => a.ts - b.ts), height = observations().filter((o) => o.topic === "weight" && o.cm).sort((a, b) => b.ts - a.ts)[0];
    const wIn = weights.filter((o) => inRange(o.ts));
    if (wIn.length >= 2) { const a = wIn[0], b = wIn[wIn.length - 1], d = Math.round((b.kg - a.kg) * 10) / 10; summary.push(`Weight measured ${wIn.length} times; ${a.kg} kg on ${fmtDay(a.ts)} and ${b.kg} kg on ${fmtDay(b.ts)} (${d > 0 ? "+" : ""}${d} kg, ${d > 0 ? "+" : ""}${Math.round((d / a.kg) * 1000) / 10}%).`); }
    else if (wIn.length === 1) summary.push(`Weight measured once: ${wIn[0].kg} kg on ${fmtDay(wIn[0].ts)}.`);
    else summary.push(weights.length ? `No weight measured in this period; the last was ${weights[weights.length - 1].kg} kg on ${fmtDay(weights[weights.length - 1].ts)}.` : "No weight has been recorded.");
    if (height) summary.push(`Height last recorded: ${height.cm} cm on ${fmtDay(height.ts)}.`);
    const rows = [["Ate all or most", ["all", "most"], "#2e7d32"], ["Half or a little", ["half", "little"], "#d98a00"], ["Refused or none", ["none"], "var(--incident)"], ["Not known", ["unknown"], "#7a7085"]];
    graphRows = rows.map(([l, ks, col]) => [l, (d) => all.filter((o) => day(o) === d && (ks.includes(o.portion) || (ks.includes("none") && o.outcome === "refused" && !o.portion) || (ks.includes("unknown") && !o.portion && o.outcome !== "refused"))).length, col]);
    extraHTML = mustInfoHTML(weights, height, all);
    for (const w of weights.filter((o) => inRange(o.ts) && !all.includes(o))) timeline.push({ ts: w.ts, html: `<strong class="small">Weight or height</strong><div class="small">${esc(obsLine(w))}</div>`, o: w });
  } else if (R.topic === "bowels") {
    const opened = all.filter((o) => o.outcome === "opened"), acc = all.filter((o) => o.outcome === "accident"), not = all.filter((o) => o.outcome === "not_opened");
    const openDays = new Set([...opened, ...acc].map(day));
    summary.push(`Bowels were recorded as opened on ${openDays.size} of the ${ds.length} days (${n(opened.length + acc.length, "time", "times")}${acc.length ? `, including ${n(acc.length, "accident", "accidents")}` : ""}).`);
    const silent = ds.filter((d) => notesDays.has(d) && !recDays.has(d)).length;
    if (silent) summary.push(`On ${n(silent, "day", "days")} with notes, nothing was written about bowels. That isn't the same as not opened.`);
    if (not.length) summary.push(`A carer wrote that the bowels were not opened on ${n(new Set(not.map(day)).size, "day", "days")}.`);
    const sorted = [...openDays].sort(); let gap = 0, gapFrom = "", gapTo = "";
    for (let i = 1; i < sorted.length; i++) { const g = Math.round((new Date(sorted[i]) - new Date(sorted[i - 1])) / 864e5); if (g > gap) { gap = g; gapFrom = sorted[i - 1]; gapTo = sorted[i]; } }
    if (gap > 1) summary.push(`Longest time between recorded bowel movements: ${gap} days (${dLabel(gapFrom)} to ${dLabel(gapTo)}).`);
    const types = all.filter((o) => o.bristol).map((o) => o.bristol);
    summary.push(types.length ? `Bristol stool types given by carers: ${types.join(", ")}.` : "No Bristol stool type was given.");
    graphRows = [["Opened", ["opened"], "#2e7d32"], ["Accident", ["accident"], "#d98a00"], ["Said not opened", ["not_opened"], "#7a7085"]].map(([l, ks, col]) => [l, (d) => all.filter((o) => day(o) === d && ks.includes(o.outcome)).length, col]);
    for (const d of prnFor(/bowel|constipat|laxat|stool|motion/i)) timeline.push({ ts: d.ts, html: `<strong class="small">Medicine (from the medicines chart)</strong><div class="small">${esc(d.med || "When-required medicine")} given${d.amount ? ", " + esc(d.amount) : ""}</div>`, med: d });
  } else if (R.topic === "urinary") {
    const night = (o) => { const h = new Date(o.ts).getHours(); return h >= 22 || h < 6; };
    const c = (k) => all.filter((o) => o.outcome === k);
    summary.push(`Urine or pads were written about on ${recDays.size} of the ${ds.length} days.`);
    const inc = [...c("incontinent"), ...c("pad_wet")];
    if (inc.length) summary.push(`${[c("incontinent").length ? `${n(c("incontinent").length, "episode", "episodes")} of incontinence` : "", c("pad_wet").length ? n(c("pad_wet").length, "wet pad", "wet pads") : ""].filter(Boolean).join(" and ")} recorded, ${inc.filter(night).length} at night (22:00 to 06:00).`);
    if (c("pad_dry").length) summary.push(`${n(c("pad_dry").length, "dry pad", "dry pads")} recorded.`);
    if (c("catheter").length) summary.push(`Catheter care or observations recorded ${n(c("catheter").length, "time", "times")}.`);
    const words = all.filter((o) => /colou?r|dark|cloudy|blood|smell|odour|odor|burn|sting|pain|uncomfortable/i.test(o.words));
    if (words.length) summary.push(`Colour, smell or discomfort was mentioned ${n(words.length, "time", "times")}; see the entries below for the carers' words.`);
    summary.push("Nothing recorded on a day isn't the same as not passing urine.");
    graphRows = [["Passed", ["passed"], "#2e7d32"], ["Incontinent or wet pad", ["incontinent", "pad_wet"], "#d98a00"], ["Dry pad", ["pad_dry"], "#7a7085"], ["Catheter", ["catheter"], "#3f6fb5"]].map(([l, ks, col]) => [l, (d) => all.filter((o) => day(o) === d && ks.includes(o.outcome)).length, col]);
    const fl = observations().filter((o) => o.topic === "fluids" && inRange(o.ts) && o.drankMl != null);
    if (fl.length) extraHTML = `<p class="small" style="margin:0">For context, drinks counted in this period: ${fl.reduce((a, o) => a + o.drankMl, 0)} ml over ${new Set(fl.map(day)).size} days (see the Fluid intake report).</p>`;
  } else if (R.topic === "sleep") {
    // Each entry belongs to a night: before midday counts as the night before.
    const nightOf = (ts) => { const d = new Date(ts); if (d.getHours() < 12) d.setDate(d.getDate() - 1); return dayKey(d); };
    const c = (k) => all.filter((o) => o.outcome === k), nights = new Set(all.filter((o) => o.outcome !== "napped").map((o) => nightOf(o.ts)).filter((d) => ds.includes(d)));
    summary.push(`Sleep was written about for ${n(nights.size, "night", "nights")} of the ${ds.length}.`);
    const parts = [["slept", "slept well"], ["woke", "woke in the night"], ["restless", "restless or unsettled"], ["awake_night", "awake most of the night"], ["napped", "slept in the day"]].map(([k, l]) => [c(k).length, l]).filter(([x]) => x);
    if (parts.length) summary.push(`Recorded: ${parts.map(([x, l]) => `${x} ${l}`).join(", ")}.`);
    const bad = [...new Set([...c("woke"), ...c("restless"), ...c("awake_night")].map((o) => nightOf(o.ts)))];
    if (bad.length) summary.push(`Waking, restlessness or being awake was written about on ${n(bad.length, "night", "nights")}.`);
    const night = (o) => { const h = new Date(o.ts).getHours(); return h >= 22 || h < 6; };
    const painNight = observations().filter((o) => o.topic === "pain" && inRange(o.ts) && night(o));
    if (painNight.length) summary.push(`Pain or discomfort was written about at night (22:00 to 06:00) ${n(painNight.length, "time", "times")}; see the Pain report.`);
    const prn = prnFor(/sleep|insomnia|night|settle|anxi/i);
    if (prn.length) summary.push(`${n(prn.length, "when-required dose", "when-required doses")} for sleep or settling recorded in the medicines chart.`);
    summary.push("A night with nothing written isn't the same as a night slept well.");
    graphRows = [["Slept well", (d) => c("slept").filter((o) => nightOf(o.ts) === d).length, "#2e7d32"], ["Woke, restless or awake", (d) => [...c("woke"), ...c("restless"), ...c("awake_night")].filter((o) => nightOf(o.ts) === d).length, "#d98a00"], ["Slept in the day", (d) => c("napped").filter((o) => day(o) === d).length, "#7a7085"]];
    for (const d of prn) timeline.push({ ts: d.ts, html: `<strong class="small">When-required medicine (from the medicines chart)</strong><div class="small">${esc(d.med || "Medicine")} given${d.amount ? ", " + esc(d.amount) : ""}</div>`, med: d });
  } else if (R.topic === "behaviour") {
    const part = (ts) => { const h = new Date(ts).getHours(); return h < 6 ? "night (00:00 to 06:00)" : h < 12 ? "morning" : h < 18 ? "afternoon" : h < 22 ? "evening" : "night (22:00 to 00:00)"; };
    summary.push(`Behaviour was written about ${n(all.length, "time", "times")}, on ${recDays.size} of the ${ds.length} days.`);
    const byPart = new Map(); for (const o of all) byPart.set(part(o.ts), (byPart.get(part(o.ts)) || 0) + 1);
    if (all.length >= 2) summary.push(`By time of day: ${[...byPart].sort((a, b) => b[1] - a[1]).map(([p, x]) => `${p} ${x}`).join(", ")} (from the time each note was saved).`);
    const withA = all.filter((o) => o.before), withC = all.filter((o) => o.after);
    summary.push(`What happened before was written for ${withA.length} of these, and what happened after for ${withC.length}.`);
    summary.push("The report shows what carers wrote; it never says why a behaviour happened.");
    graphRows = [["Behaviour written about", (d) => all.filter((o) => day(o) === d).length, "#7a4fa0"]];
    extraHTML = all.length ? `<div><h3 style="font-size:17px;margin:0 0 6px">ABC chart</h3><div style="display:grid;gap:8px">
      ${all.map((o) => `<div class="card" style="box-shadow:none;padding:10px 12px;display:grid;gap:3px;break-inside:avoid"><div class="tiny muted">${esc(dayLabel(o.ts))} ${fmtTime(o.ts)}</div>
        <div class="small"><strong>A, before:</strong> ${esc(o.before || "Not written")}</div><div class="small"><strong>B, behaviour:</strong> ${esc(o.words)}</div><div class="small"><strong>C, after:</strong> ${esc(o.after || "Not written")}</div></div>`).join("")}</div></div>` : "";
  } else if (R.topic === "skin") {
    summary.push(`Skin was written about ${n(all.length, "time", "times")}, on ${recDays.size} of the ${ds.length} days.`);
    const sk = latestForms("skin"), open = sk.filter((r) => r.status !== "closed"), shown = sk.filter((r) => r.status !== "closed" || formVersions(r.formId).some((v) => inRange(v.ts)));
    summary.push(open.length ? `${n(open.length, "skin concern is", "skin concerns are")} being followed up${open.some((r) => formData(r).nextReview && formData(r).nextReview <= dayKey(new Date())) ? ", and a check is due" : ""}.` : "No skin integrity form is open.");
    const checks = (S.acks || []).filter((a) => a.what === "skin" && inRange(a.ts));
    if (checks.length) summary.push(`"I've checked the skin" was ticked ${n(checks.length, "time", "times")} by carers catching up.`);
    const vsIn = forms().filter((v) => v.type === "skin" && inRange(v.ts));
    graphRows = [["Skin written about", (d) => all.filter((o) => day(o) === d).length, "#b5651d"], ["Skin form saved", (d) => vsIn.filter((v) => dayKey(new Date(v.ts)) === d).length, "#3f6fb5"]];
    for (const v of vsIn) timeline.push({ ts: v.ts, html: `<strong class="small">Skin integrity form <button class="link small" data-openform="${esc(v.formId)}">${esc(v.ref)}</button></strong><div class="small">${v.formId === v.id ? "Started" : "Changed"} by ${esc(v.byName || "")}: ${esc(skinWhere(formData(v)))}${formData(v).status ? ` (${esc((opt(SKIN_STATUS, formData(v).status) || "").toLowerCase())})` : ""}</div>` });
    extraHTML = `<div><h3 style="font-size:17px;margin:0 0 6px">Skin integrity forms</h3>${shown.length ? `<div style="display:grid;gap:6px">${shown.map((r) => { const d = formData(r); return `<div class="card" style="box-shadow:none;padding:10px 12px;display:grid;gap:2px;break-inside:avoid"><button class="link small" data-openform="${esc(r.formId)}" style="justify-self:start;text-align:left">${esc(r.ref)}: ${esc(skinWhere(d))}</button><div class="small">${r.status === "closed" ? "Healed or resolved" : `${esc(opt(SKIN_STATUS, d.status) || "Being followed up")}${d.nextReview ? `, next check ${esc(fmtDay(new Date(d.nextReview + "T12:00:00").getTime()))}` : ""}`} · ${(d.followups || []).length} follow-up check${(d.followups || []).length === 1 ? "" : "s"}</div></div>`; }).join("")}</div>` : `<p class="small" style="margin:0">None in this period.</p>`}
      ${isFamily() ? "" : `<button class="btn secondary noprint" id="rpSkinNew" style="margin-top:8px">New skin check</button>`}</div>`;
  } else if (R.topic === "pain") {
    summary.push(`Pain or discomfort was written about ${n(all.length, "time", "times")}, on ${recDays.size} of the ${ds.length} days.`);
    const scored = all.filter((o) => o.painScore != null);
    if (scored.length) summary.push(`Scores given: ${scored.map((o) => `${o.painScore}/10 (${fmtDay(o.ts)})`).join(", ")}.`);
    const where = new Map(); for (const o of all) if (o.where) where.set(o.where.toLowerCase(), (where.get(o.where.toLowerCase()) || 0) + 1);
    if (where.size) summary.push(`Where: ${[...where].sort((a, b) => b[1] - a[1]).map(([w, x]) => `${w} (${x})`).join(", ")}.`);
    const half = Math.floor(ds.length / 2), a = all.filter((o) => ds.indexOf(day(o)) < half).length, b = all.length - a;
    if (all.length >= 4) summary.push(`Written about ${n(a, "time", "times")} in the first half of the period and ${n(b, "time", "times")} in the second half.`);
    const prn = prnFor(/pain|ache|sore|discomfort/i);
    if (prn.length) summary.push(`${n(prn.length, "when-required dose", "when-required doses")} for pain recorded in the medicines chart.`);
    extraHTML = assessListHTML("painad", "PAINAD or other pain assessments");
    graphRows = [["Pain or discomfort written about", (d) => all.filter((o) => day(o) === d).length, "#b5651d"], ["Pain relief given (when required)", (d) => prn.filter((x) => x.day === d).length, "#3f6fb5"]];
    for (const d of prn) timeline.push({ ts: d.ts, html: `<strong class="small">Pain relief (from the medicines chart)</strong><div class="small">${esc(d.med || "When-required medicine")} given${d.amount ? ", " + esc(d.amount) : ""}${outcomeFor(d.id) ? " · " + esc(outcomeFor(d.id).outcome || "") : ""}</div>`, med: d });
  }
  timeline.sort((x, y) => x.ts - y.ts);
  // Notes written without the AI (no signal, or it failed) have nothing picked out: say so, so a day isn't read as "nothing happened".
  const firstObs = (S.observations || []).reduce((m, o) => Math.min(m, o.ts), Infinity);
  const unread = S.notes.filter((x) => !isExample(x) && inRange(x.ts) && x.ts >= firstObs && x.source !== "ai" && R.words.test(x.note || "")).length;
  const warn = (startNote ? `<div class="warn small" style="margin-bottom:10px">${esc(startNote)}</div>` : "") + (unread ? `<div class="warn small" style="margin-bottom:10px">${n(unread, "note", "notes")} in this period mention${unread === 1 ? "s" : ""} this but couldn't be read for the report (saved without signal or the AI). Check ${unread === 1 ? "it" : "them"} in the record log.</div>` : "");
  reportFrame(kind, R, { ...range }, opts, `Made ${esc(fmtDay(Date.now()))} ${fmtTime(Date.now())} from ${n(all.length, "observation", "observations")} in carers' notes · counted by the app`, warn, `<div>This records carers' observations. It is not a clinical assessment and doesn't diagnose anything.</div>`);
  const body = $("#rpBody");
  const graph = () => {
    if (graphRows.bars) {
      const { bars, max, target } = graphRows;
      return `<div class="card" style="box-shadow:none;overflow-x:auto"><div style="display:flex;align-items:flex-end;gap:3px;height:140px;position:relative;min-width:${bars.length * 14}px">${target ? `<div style="position:absolute;left:0;right:0;bottom:${Math.round((target / max) * 120)}px;border-top:2px dashed #3f6fb5" title="Target ${target} ml"></div>` : ""}${bars.map((x) => `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:140px;${notesDays.has(x.d) ? "" : "background:repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,.08) 3px,rgba(0,0,0,.08) 5px)"}"><div style="width:100%;height:${x.has ? Math.max(2, Math.round((x.v / max) * 120)) : 0}px;background:#3f6fb5;border-radius:3px 3px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact" title="${x.v} ml"></div><span style="font-size:10px">${+x.d.slice(8)}</span></div>`).join("")}</div>
        <p class="tiny muted" style="margin:6px 0 0">Recorded ml each day${target ? `; dashed line: target ${target} ml` : ""}. Shaded days had no notes at all; no bar means no drinks with a known amount were written down.</p></div>`;
    }
    return `<div class="card" style="box-shadow:none;overflow-x:auto"><table style="border-collapse:collapse;font-size:12px"><thead><tr><th></th>${ds.map((d) => `<th style="padding:2px 3px;font-weight:600">${+d.slice(8)}</th>`).join("")}</tr></thead><tbody>
      ${graphRows.map(([label, f, colour]) => `<tr><th style="text-align:left;padding:2px 8px 2px 0;white-space:nowrap;font-weight:600">${esc(label)}</th>${ds.map((d) => { const c = f(d); return `<td style="text-align:center;padding:2px 3px;${notesDays.has(d) ? "" : "background:repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,.08) 3px,rgba(0,0,0,.08) 5px)"}">${c ? `<span style="display:inline-block;min-width:16px;border-radius:8px;background:${colour};color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact">${c}</span>` : ""}</td>`; }).join("")}</tr>`).join("")}
      </tbody></table><p class="tiny muted" style="margin:6px 0 0">Numbers are how many times it was written that day. Shaded days had no notes at all.</p></div>`;
  };
  body.innerHTML = `${opts.graph ? graph() : ""}
    <div><h3 style="font-size:17px;margin:0 0 4px">Summary</h3><ul class="small" style="margin:0;padding-left:18px;display:grid;gap:4px">${summary.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
    ${extraHTML}
    <div><h3 style="font-size:17px;margin:0 0 6px">Each entry, in date order</h3><div style="display:grid;gap:8px">
      ${timeline.length ? timeline.map((t, i) => `<div class="card" style="box-shadow:none;padding:10px 12px;display:grid;gap:2px;break-inside:avoid"><div class="tiny">${t.o ? `<button class="link tiny" data-obsnote="${i}">${when(t.ts)}</button> · ${esc(who(t.o))}` : when(t.ts)}${t.o && t.o.fixedBy ? ` · corrected by ${esc(t.o.fixedBy)}` : ""}</div>${t.html}${t.o ? `<div class="tiny muted">"${esc(t.o.words)}"</div>` : ""}</div>`).join("") : `<p class="small" style="margin:0">Nothing was written about this in the period. That doesn't mean nothing happened: only that nothing was recorded.</p>`}
    </div></div>`;
  body.querySelectorAll("[data-obsnote]").forEach((b) => (b.onclick = () => { const o = timeline[+b.dataset.obsnote].o; if (byNote(o)) openSavedNote(o.noteId); }));
  if ($("#rpSkinNew", body)) $("#rpSkinNew", body).onclick = () => openFormEdit("skin");
  body.querySelectorAll("[data-assessnew]").forEach((b) => (b.onclick = () => openFormEdit("assessment", { preset: { tool: b.dataset.assessnew } })));
  if (all.length) bindReportShare(`${R.title}, ${range.label}\n\n${summary.join("\n")}\n\nMade from carers' notes.`, false);
}
// The parts every report shares: period, About, print, graph, and the footer.
function reportFrame(kind, R, range, opts, meta, warnHTML, footerHTML, waiting) {
  const au = clientCountry() === "AU", { days, from, to, graph } = opts, root = $("#fullRoot");
  root.innerHTML = `<div class="full" role="dialog" aria-modal="true" aria-label="${esc(R.title)} report"><div class="wrap" style="gap:0;min-width:0">
    <div class="noprint" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn ghost" id="rpClose">Close</button><button class="btn ghost" id="rpAbout">About this report</button><button class="btn primary" id="rpPrint" style="grid-column:1/-1">Print or save as PDF</button></div>
    <div class="noprint" style="display:grid;gap:8px;margin:12px 0">
      <div class="seg" role="group" aria-label="Period">${[7, 14, 30].map((d) => `<button data-days="${d}" aria-pressed="${!from && days === d}">${d}</button>`).join("")}<button data-days="custom" aria-pressed="${!!from}">Dates</button></div><span class="tiny muted" style="margin-top:-4px">Days, or choose dates</span>
      <div class="row" id="rpDates" style="gap:8px" ${from ? "" : "hidden"}><label class="f" style="flex:1">From<input type="date" id="rpFrom" value="${esc(from)}"></label><label class="f" style="flex:1">To<input type="date" id="rpTo" value="${esc(to)}"></label><button class="btn secondary" id="rpGo" style="align-self:end">Show</button></div>
      <label class="check"><input type="checkbox" id="rpGraph" ${graph ? "checked" : ""}><span>Show a graph</span></label>
      <div class="card noprint" id="rpAboutBox" hidden style="box-shadow:none;display:grid;gap:4px"><div class="small" style="display:grid;gap:4px">${R.about(au)}</div><button class="btn ghost" id="rpAboutClose">Close this</button></div></div>
    <h2 style="font-size:22px;margin:0">${esc(R.title)} report</h2>
    <p class="small" style="margin:4px 0 0"><strong>${esc(S.client.name)}</strong> · ${esc(range.label)}</p>
    <p class="tiny muted" style="margin:2px 0 12px">${meta}</p>
    ${warnHTML || ""}
    <div id="rpBody" style="display:grid;gap:14px"><p class="small">${waiting || ""}</p></div>
    <div class="tiny muted" style="margin-top:16px;display:grid;gap:4px">
      <div>Made only from what carers wrote. Days with no notes are not evidence that all was well.</div>
      ${footerHTML || ""}
      <div>Dignity Notes · pilot, made-up data only</div></div>
    ${canEditPlan() ? '<button class="btn secondary block noprint" id="rpShare" style="margin-top:12px" hidden>Share with the family</button>' : ""}
  </div></div>`;
  document.body.classList.add("printing-mar", "report-open");
  const again = (o) => openReport(kind, { days, from, to, graph: $("#rpGraph").checked, ...o });
  $("#rpClose").onclick = () => { root.innerHTML = ""; };
  $("#rpPrint").onclick = () => window.print();
  $("#rpAbout").onclick = () => { $("#rpAboutBox").hidden = !$("#rpAboutBox").hidden; if (!$("#rpAboutBox").hidden) $("#rpAboutBox").scrollIntoView({ block: "start" }); };
  $("#rpAboutClose").onclick = () => { $("#rpAboutBox").hidden = true; };
  root.querySelectorAll("[data-days]").forEach((b) => (b.onclick = () => (b.dataset.days === "custom" ? ($("#rpDates").hidden = false) : again({ days: +b.dataset.days, from: "", to: "" }))));
  $("#rpGo").onclick = () => { const f = $("#rpFrom").value, t = $("#rpTo").value; if (!f || !t || f > t) return toast("Choose a start date before the end date"); if ((new Date(t) - new Date(f)) / 864e5 > 91) return toast("Choose up to 92 days at a time"); again({ from: f, to: t }); };
  $("#rpGraph").onchange = () => again({});
}
// Share a report's summary with the family, after the carer reads and edits it. Not counted as the
// daily update; blocked when it includes incidents the family doesn't see.
function bindReportShare(text, hasIncidents) {
  const share = $("#rpShare"); if (!share || !text) return;
  share.hidden = false;
  if (hasIncidents && !(session.client && session.client.familyIncidents)) { share.disabled = true; share.textContent = "Can't share: it includes incidents, which this family doesn't see"; return; }
  share.onclick = () => {
    const q = sheet(`${sheetHead("Share with the family")}<p class="small" style="margin:0">Read it and change anything that shouldn't go to the family. They'll see it with the daily updates.</p>
      <textarea id="rsText" class="grow" maxlength="4000" style="min-height:220px">${esc((REPORT_SHARE_PREFIX + text).slice(0, 4000))}</textarea><button class="btn primary block" id="rsGo">Share with the family</button>`, { guard: () => true });
    autoGrow($("#rsText", q.root));
    $("#rsGo", q.root).onclick = () => {
      let t = $("#rsText", q.root).value.trim(); if (!t) return toast("Nothing to share");
      if (!t.startsWith(REPORT_SHARE_PREFIX)) t = (REPORT_SHARE_PREFIX + t).slice(0, 4000);
      S.summaries = S.summaries || []; S.summaries.push({ id: uid(), ts: Date.now(), day: new Date().toLocaleDateString("en-CA"), text: t }); save();
      q.close(); share.hidden = true; toast("Shared with the family");
    };
  };
}
async function openReport(kind, { days = 14, from = "", to = "", graph = false } = {}) {
  const R = REPORTS[kind], range = reportRange(days, from, to);
  if (R.topic) return openObsReport(kind, R, range, { days, from, to, graph });
  const inRange = (ts) => ts >= range.from && ts <= range.to;
  const NOTE_CAP = 120, allNotes = S.notes.filter((n) => !isExample(n) && inRange(n.ts) && R.pick(n)).sort((a, b) => a.ts - b.ts);
  const notes = allNotes.slice(-NOTE_CAP), leftOut = allNotes.length - notes.length; // the most recent; the report says how many earlier ones weren't used
  const flags = S.flags.filter((f) => !DEMO_IDS.has(f.id) && inRange(f.ts) && R.pickFlag(f)).sort((a, b) => a.ts - b.ts);
  const entries = [...flags.map((f, i) => ({ id: "f" + (i + 1), ref: f })), ...notes.map((n, i) => ({ id: "n" + (i + 1), ref: n, isNote: true }))];
  const byId = new Map(entries.map((e) => [e.id, e]));
  const when = (ts) => `${esc(dayLabel(ts))} ${fmtTime(ts)}`;
  const daysWithNotes = new Set(S.notes.filter((n) => !isExample(n) && inRange(n.ts)).map((n) => dayKey(new Date(n.ts))));
  const docs = planDocs().filter((d) => d.kind === "risk");
  reportFrame(kind, R, range, { days, from, to, graph },
    `Made ${esc(fmtDay(Date.now()))} ${fmtTime(Date.now())} from ${notes.length} note${notes.length === 1 ? "" : "s"} and ${flags.length} incident${flags.length === 1 ? "" : "s"} · written by AI from carers' notes · check it against the notes before sharing`,
    leftOut ? `<div class="warn small" style="margin-bottom:10px">This period has ${allNotes.length} notes about mobility; the report uses the latest ${notes.length}. Choose a shorter period to include the ${leftOut} earlier one${leftOut === 1 ? "" : "s"}.</div>` : "",
    `<div>This records carers' observations. It is not a falls risk assessment, which is done by a trained professional.</div>${docs.length ? `<div>Professional assessments in the care plan: ${docs.map((d) => `<button class="link tiny" data-opendoc="${esc(d.id)}">${esc(d.name)}</button>`).join(", ")}</div>` : ""}`,
    entries.length ? "Writing the report…" : "");
  const body = $("#rpBody");
  if (!entries.length) { body.innerHTML = `<p class="small" style="margin:0">Nothing about mobility or falls was written in this period. That doesn't mean all was well: only that nothing was recorded.</p>`; return; }
  // The same notes give the same report: kept on this phone until a note in the period changes.
  const sig = kind + "|" + range.from + "|" + range.to + "|" + entries.map((e) => e.ref.id + ":" + mtOf(e.ref)).join(",");
  const cache = Array.isArray(S.reportCache) ? S.reportCache : [];
  let out = (cache.find((c) => c.sig === sig) || {}).out || null;
  if (!out) {
    try {
      out = await syncJSON("/plan/report", { client: session.client.id, clientName: S.client.name, kind, period: range.label,
        entries: entries.map((e) => ({ id: e.id, time: `${fmtDay(e.ref.ts)} ${new Date(e.ref.ts).getFullYear()} ${fmtTime(e.ref.ts)}`, by: e.isNote ? carer(e.ref.carerId, e.ref.carerName).name : "Incident record",
          text: e.isNote ? (e.ref.amends ? "(Added to an earlier note; not a separate event.) " : "") + e.ref.note : `${e.ref.title}. ${e.ref.detail || ""}` })) }, 180000);
      S.reportCache = [{ sig, out }, ...cache.filter((c) => c.sig !== sig)].slice(0, 6); saveLocal();
    } catch (err) { out = null; if (body.isConnected) body.innerHTML = `<div class="warn small">${esc(err.message || "Couldn't write the report.")} The notes it would use are listed below.</div>`; }
  }
  if (!body.isConnected) return;
  const src = (ids) => ids.map((id) => byId.get(id)).filter(Boolean).map((e) => `<button class="link tiny" data-src="${e.id}">${when(e.ref.ts)}</button>`).join(" · ");
  const obs = out ? out.observations.filter((o) => byId.has(o.entry)) : [];
  // Every fall incident is listed, even one the AI didn't mention.
  if (out) for (const e of entries) if (!e.isNote && !obs.some((o) => o.entry === e.id)) obs.push({ entry: e.id, type: "fall", words: `${e.ref.title}${e.ref.detail ? ": " + e.ref.detail : ""}` });
  obs.sort((a, b) => byId.get(a.entry).ref.ts - byId.get(b.entry).ref.ts);
  // Graph: one column a day; marks only from what was written; a day with no notes at all is marked as such.
  const graphHTML = () => {
    const ds = []; for (const d = new Date(range.from); d.getTime() <= range.to && ds.length < 92; d.setDate(d.getDate() + 1)) ds.push(dayKey(d));
    const cnt = (d, types) => obs.filter((o) => types.includes(o.type) && dayKey(new Date(byId.get(o.entry).ref.ts)) === d).length;
    return `<div class="card" style="box-shadow:none;overflow-x:auto"><table style="border-collapse:collapse;font-size:12px"><thead><tr><th></th>${ds.map((d) => `<th style="padding:2px 3px;font-weight:600">${+d.slice(8)}</th>`).join("")}</tr></thead><tbody>
      ${R.groups.map(([label, types, colour]) => `<tr><th style="text-align:left;padding:2px 8px 2px 0;white-space:nowrap;font-weight:600">${esc(label)}</th>${ds.map((d) => { const c = cnt(d, types); return `<td style="text-align:center;padding:2px 3px;${daysWithNotes.has(d) ? "" : "background:repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,.08) 3px,rgba(0,0,0,.08) 5px)"}">${c ? `<span style="display:inline-block;min-width:16px;border-radius:8px;background:${colour};color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact">${c}</span>` : ""}</td>`; }).join("")}</tr>`).join("")}
      </tbody></table><p class="tiny muted" style="margin:6px 0 0">Numbers are how many times it was written that day. Shaded days had no notes at all.</p></div>`;
  };
  body.innerHTML = `${out && graph ? graphHTML() : ""}
    ${out ? (out.sections.length || obs.length ? out.sections.map((x) => `<div><h3 style="font-size:17px;margin:0 0 4px">${esc(x.heading)}</h3><p class="small" style="margin:0;white-space:pre-line">${esc(x.text)}</p>${x.entries.length ? `<div class="tiny" style="margin-top:2px">From: ${src(x.entries)}</div>` : ""}</div>`).join("") : '<p class="small" style="margin:0">The notes in this period don\'t record anything about mobility.</p>') : ""}
    <div><h3 style="font-size:17px;margin:0 0 6px">${out ? "Each observation, in date order" : "Notes and incidents in this period"}</h3>
      <div style="display:grid;gap:8px">
      ${(out ? obs.map((o) => ({ e: byId.get(o.entry), what: R.labels[o.type] || "Other", words: o.words })) : entries.map((e) => ({ e, words: e.isNote ? e.ref.note : e.ref.title }))).map((r) => `<div class="card" style="box-shadow:none;padding:10px 12px;display:grid;gap:2px;break-inside:avoid"><div class="tiny"><button class="link tiny" data-src="${r.e.id}">${when(r.e.ref.ts)}</button> · ${esc(r.e.isNote ? carer(r.e.ref.carerId, r.e.ref.carerName).name : "Incident record")}</div>${out ? `<strong class="small">${esc(r.what)}</strong>` : ""}<div class="small">${esc(r.words)}</div></div>`).join("") || '<p class="small" style="margin:0">Nothing about mobility was found in these notes.</p>'}
      </div></div>`;
  body.querySelectorAll("[data-src]").forEach((b) => (b.onclick = () => { const e = byId.get(b.dataset.src); if (e.isNote) openSavedNote(e.ref.id); else openFlag(e.ref.id); }));
  if (out && out.sections.length) bindReportShare(`${R.title}, ${range.label}\n\n${out.sections.map((x) => `${x.heading}\n${x.text}`).join("\n\n")}\n\nMade from carers' notes. Not a falls risk assessment.`, flags.length > 0);
}
