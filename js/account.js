// Dignity Notes: the privacy notice, pronouns, the shared phone, sign-in and people.
// Loaded by index.html after app.js, in order; shares its global scope (one app split into files).
"use strict";

/* ---------- privacy notice ---------- */
const PRIVACY_VERSION = "2026-10-22.24";
const PRIVACY_HTML = `
<p class="small muted" style="margin:0">Version 24 · 22 October 2026 · Pilot</p>
<h3>Who we are</h3>
<p>Dignity Notes is owned and operated by <strong>Workgroup (WA) Pty Ltd</strong> ("we", "us"). We decide how the personal information described here is used. This version of Dignity Notes is a <strong>pilot for evaluation only</strong>.</p>
<h3>Important: use fictional information only</h3>
<p>During the pilot, <strong>do not record or type real information about real people</strong>, including names, health details, medication, addresses or anything that could identify someone. Use made-up examples. This keeps everyone's health information out of the pilot.</p>
<h3>What we collect about you</h3>
<ul>
<li><strong>Your account:</strong> your name, username and password. We store passwords only in a scrambled (hashed) form that can't be read back.</li>
<li><strong>How notes refer to you:</strong> the pronouns you choose (for example she/her), or that notes should use your name. Optional, and you can change it in Settings. Notes, handovers and the AI use it so you're referred to correctly.</li>
<li><strong>Shared phones:</strong> if an administrator makes a phone a client's shared phone (kept at the client's home for the carers), we keep a random ID for that phone with the client, a description of it (for example "Android · Chrome"), who set it up and when. Signing in on it is recorded as the shared phone and isn't added to your own devices.</li>
<li><strong>Sign-in records:</strong> the time of each sign-in attempt, your IP address, your approximate location worked out from that address (town and country), your type of device and browser, and a random ID that this app stores on your device. We use these to keep accounts secure and to detect when a login is shared or used on another device.</li>
<li><strong>How you work, for medicines:</strong> whether an administrator has recorded you as a private carer (self-employed or employed by the client or family) or an agency carer, and who recorded it. It decides whether a medicines training sign-off is needed.</li>
<li><strong>Medicines training sign-off:</strong> if an administrator records that you're trained and assessed to support people with medicines: the date, who assessed you, the review date and any note. Administrators can see it; it's used to decide who can change the medicine list.</li>
<li><strong>Medicines training certificates:</strong> if you or an administrator upload one: the certificate file (a photo or PDF, which may show your full name and a certificate number), the course, who issued it, the dates, whether it included a practical assessment, who uploaded it, and who verified it and when. Only you and administrators can see it. It's deleted when you remove it (before it's verified), when an administrator removes it, or when your account is removed.</li>
<li><strong>Your agreement:</strong> when you accepted this notice, and the IP address you accepted it from.</li>
<li><strong>Clients:</strong> the name of each person being cared for, and the name and role of the person who agreed to Dignity Notes being used, with the date. This is kept on our relay so every carer sees the same agreement.</li>
<li><strong>Carers for each client:</strong> which clients you care for, and your shift times for each. Administrators set who cares for whom. The other carers on the same client can see your name and shift.</li>
<li><strong>Feedback:</strong> if you report a problem or suggest an idea, your messages and the helper's replies, any questions the developer asks you about it and your answers, any screenshot you add, your name, username and role, which screen and page you were on, and the summary and analysis the AI writes for the developer. A screenshot shows whatever was on your screen, so avoid screens that show care notes.</li>
</ul>
<h3>Care notes and recordings</h3>
<p><strong>Family accounts.</strong> An administrator can give an authorised family member their own sign-in, linked to a client. They see only the daily updates carers choose to share, coming appointments, messages with the carers, and incidents if that has been switched on for the client as agreed with the client or their representative. They never see care notes, recordings, the care plan, contacts or handovers. Messages and shared updates are kept in our cloud storage in the European Union with the client's record, and carers on the client see family messages.</p>
<p><strong>Medicines chart.</strong> If carers help with a client's medicines, the client's medicine list (names, strengths, doses, times, prescriber, where each detail came from), their date of birth, NHS or Medicare number if given, GP practice and allergies, every dose recorded (given, prompted, refused or not given, with reasons, amounts, whether a when-required dose helped, who recorded it and when), and each new supply received (how much, from where, and whether the label matched) are kept in our cloud storage in the European Union with the client's record. Carers on the client and the pilot administrators can see and add to it; family members cannot. Every change to the list is kept with who made it and who checked it, and dose entries are never changed (a correction is a new entry). The app records what carers did; it does not give medical advice.</p>
<p>Each client's <strong>contacts</strong> (names, roles, phone numbers, email and postal addresses of people and services involved in their care, such as the GP, pharmacy and family) are kept in our cloud storage in the European Union, shared with the client's carers and the pilot administrators, and can be added or changed by any of them; every change is kept with who made it. The last list seen is kept on the carer's device so it can be read without signal, and is removed if the carer is taken off the client.</p>
<p>Each client's <strong>care plan and documents</strong> (such as an emergency care plan or risk assessments) are kept in our cloud storage, written by the client's carers and administrators, and shown to the client's carers. A copy of the care plan, and of any document a carer opens, is kept on their device so it can be read without signal; document copies are removed when the document is taken out of the care plan, when the carer signs out, or when the client is removed.</p>
<p>Care notes (with the words you spoke), voice recordings, flags, handovers, outings and attendance (when each carer checked in and out, and when they recorded it; never where they were) are saved on your device and <strong>copied to our cloud storage</strong>, so they aren't lost if your device's data is cleared, and every carer on the same client sees the same record. They are stored by Cloudflare in the <strong>European Union</strong>, encrypted, and only the client's carers and pilot administrators can see them. Your settings stay on your device only.</p>
<h3>AI note writing</h3>
<p>When you ask the user manual a question, your question (nothing else) is sent through our relay to Anthropic so the AI can answer it from the manual. It isn't stored.</p>
<p>When you use the feedback helper, your messages and any screenshot are also sent to Anthropic, so the helper can ask questions and write a summary for the developer. Email addresses and phone numbers are removed automatically before a report is stored.</p>
<p><strong>Turning speech into words.</strong> While you record, your phone's own speech recognition may show your words as you speak: on an iPhone this may send your voice to <strong>Apple</strong>, and on Android to <strong>Google</strong>, under their own terms (Apple says it may use it to improve its speech recognition; you can turn this off in your phone's settings). When there's signal (or if your phone can't turn your speech into words), the recording is sent through our relay to <strong>Cloudflare</strong>'s speech-to-text service, which returns the words. Spelling hints go with it: the first names of the client and their carers, the names of the client's medicines, and your saved word fixes. The voice set-up works the same way; its practice recordings aren't kept. This may happen outside the European Union. Our relay doesn't keep that copy; the recording is kept only as described under Care notes and recordings.</p>
<p>When you ask the app to write a note, handover, summary or report (such as the falls and mobility report), the <strong>words</strong> of your note (never the recording), the client's first name, the names of the carers involved, the names of the client's care plan sections, and your saved word fixes ("My words"), are sent through our secure relay to <strong>Anthropic</strong>, which provides the Claude AI service, to be tidied. Our relay doesn't keep the text it sends for tidying; the note you save is stored as described under Care notes and recordings. Anthropic processes it under its commercial terms, which don't allow it to train its AI models on this data.</p>
<p><strong>Writing the care plan.</strong> When you ask the app to write up a care plan section, the words you said or typed for it, the section's current wording, the client's name, and the names and pronouns of the client and their carers are sent to Anthropic in the same way. When you ask it to fill the care plan from a care plan document, a copy of that document is sent to Anthropic to be read. You check and can change everything before it's saved, and each saved version of the care plan is kept with who changed it, and who agreed to it (the client, their attorney, or not yet).</p>
<p><strong>Reports.</strong> When a note is saved, what it says about drinks (and how much), meals, bowels, passing urine, pain, sleep, behaviour, skin, mobility and any weight or height is also kept as separate entries with the client's record in the EU, so the reports (such as fluid intake or bowels) can be made without carers writing anything twice. The words of the note are sent to Anthropic for this as part of writing the note. Carers can correct these entries; family members don't see them unless a carer shares a report with them.</p>
<p><strong>Incident reports and skin forms.</strong> When a carer completes an incident report or a skin integrity form, it's kept with the client's record in the EU, with every version (who changed what, and when) and, for an agency, an administrator's review. To start one from a note, the words of that note are sent to Anthropic in the same way, to suggest answers the carer checks. Professional assessments you copy in (such as MUST or PAINAD), with who completed them, are kept the same way. The client's carers and administrators see them; family members see what happened and what was done in incident reports (not safeguarding answers, witnesses or who was told) only if an administrator has let them see incidents. When a carer catches up after time away, "I've read this" and "I've checked the skin" are kept with their name and the time.</p>
<p><strong>Training course.</strong> If you do the training course, which modules you've finished, your final check score and your certificate number are kept with your account. Administrators can see them in Manage people.</p>
<p><strong>Medicine photos.</strong> If you take a photo of a medicine label, prescription or box to fill in or check the medicines chart, the photo is kept with the client's documents in our cloud storage in the European Union, and sent to Anthropic in the same way to be read. A prescription may show the client's name, address and date of birth. You check every detail before it's saved.</p>
<h3>Who else handles data for us</h3>
<ul>
<li><strong>Cloudflare:</strong> runs our relay, turns recordings into words when your phone can't (possibly outside the EU), and stores accounts, sign-in records, clients, who cares for each client and their shifts, feedback reports, and the care records and recordings described above (in the European Union).</li>
<li><strong>GitHub (Microsoft):</strong> hosts the app's web pages.</li>
<li><strong>Anthropic:</strong> AI note writing, as described above.</li>
<li><strong>Apple or Google:</strong> your phone's own speech recognition, as described above.</li>
<li><strong>Notifications:</strong> if you turn on notifications, your phone's notification service (Apple, Google, Mozilla or Microsoft) delivers them. We keep the address that service gives your phone, and send only an encrypted note of the kind of thing that's waiting (a handover, an incident or an appointment reminder): never a name or care details. For appointment reminders we also note which reminders have been sent (the appointment's reference and the time), so each is sent once. Turn them off in Settings at any time; signing out stops them for you on that phone.</li>
</ul>
<p>These providers may process data outside the UK and Australia, including in the United States, under their own data protection safeguards.</p>
<h3>Why we use it</h3>
<p>To run the pilot, keep accounts secure, stop logins being shared, and improve Dignity Notes. In UK law our grounds are our legitimate interests in running a secure pilot, and your agreement to take part.</p>
<h3>How long we keep it</h3>
<ul>
<li><strong>Sign-in records, and the list of devices you've used:</strong> deleted automatically 90 days after your last sign-in.</li>
<li><strong>A record of administrators' actions</strong> (who added, removed or changed people, clients, care plans and documents, and when): kept for 2 years.</li>
<li><strong>Accounts:</strong> until an administrator removes you, or the pilot ends.</li>
<li><strong>Your agreement record:</strong> for as long as your account exists.</li>
<li><strong>Feedback reports:</strong> deleted automatically after 12 months, or sooner if an administrator deletes them.</li>
<li><strong>Clients:</strong> until an administrator removes the client. A record of who removed it and when is kept.</li>
<li><strong>Care records, recordings, care plans and documents:</strong> until the client is removed (for example, if agreement is withdrawn) or the pilot ends. Removing a client deletes them from the cloud straight away, and from carers' devices the next time each device is used.</li>
</ul>
<h3>Who can see your information</h3>
<p>Pilot administrators can see the people list, who cares for each client, which devices each account has used, the sign-in history and feedback reports. Carers on the same client see each other's names and shifts, and the client's care notes, recordings, flags, handovers, outings and attendance, including yours. Pilot administrators can see these too.</p>
<h3>Your rights</h3>
<p>You can ask to see, correct or delete the information we hold about you, or object to how we use it. Ask the administrator who invited you, who will pass your request to Workgroup (WA) Pty Ltd. If you're unhappy, you can complain to the UK Information Commissioner's Office (ico.org.uk) or, in Australia, the Office of the Australian Information Commissioner (oaic.gov.au).</p>
<h3>Changes</h3>
<p>During this test pilot you accept this notice once. If we change it, the latest version is always in Settings, under Privacy notice.</p>
<p class="small muted">© 2026 Workgroup (WA) Pty Ltd. All rights reserved. Dignity Notes, its design, logo and software are the property of Workgroup (WA) Pty Ltd.</p>
`;
const COPYRIGHT = "© 2026 Workgroup (WA) Pty Ltd. All rights reserved.";
function showPrivacy(onAccept) {
  const root = $("#fullRoot");
  root.innerHTML = `<div class="full" role="dialog" aria-modal="true"><div class="wrap">
    <div style="background:#FDFAF3;border-radius:16px;padding:10px 12px;box-shadow:var(--shadow);max-width:360px"><img src="logo-wordmark.png" alt="Dignity Notes: Spoken care notes" width="720" height="195" style="width:100%;height:auto;display:block"></div>
    <span class="eyebrow">Before you start</span>
    <h2 style="font-size:30px;line-height:1.15">Privacy notice</h2>
    <div class="card policy" style="display:grid;gap:4px">${PRIVACY_HTML}</div>
    <label class="check"><input type="checkbox" id="pvOk"><span>I've read the privacy notice and agree to take part in the Dignity Notes pilot on these terms.</span></label>
    <button class="btn primary block" id="pvGo" disabled>Agree and continue</button>
    <button class="link" id="pvNo" style="justify-self:center;color:var(--ink-2)">I don't agree (sign out)</button>
    <div class="small" id="pvMsg" style="color:var(--incident)"></div>
  </div></div>`;
  $("#pvOk").onchange = (e) => ($("#pvGo").disabled = !e.target.checked);
  $("#pvNo").onclick = () => { if (!session.local) relay("/logout", {}).catch(() => {}); signedOut("You need to accept the privacy notice to use Dignity Notes."); };
  $("#pvGo").onclick = async () => {
    const b = $("#pvGo"); b.disabled = true; b.textContent = "Saving…";
    try {
      if (!session.local) await relay("/privacy/accept", { version: PRIVACY_VERSION });
      session.privacyAccepted = PRIVACY_VERSION; saveSession(); root.innerHTML = ""; onAccept();
    } catch (e) { $("#pvMsg").textContent = e.message; b.disabled = false; b.textContent = "Agree and continue"; }
  };
}
function viewPrivacy() {
  sheet(`${sheetHead("Privacy notice")}<div class="card policy" style="display:grid;gap:4px">${PRIVACY_HTML}</div>`);
}
// After sign-in (or on opening the app), make sure the current notice has been accepted.
function afterSignIn(privacyAccepted) {
  if (!session) return;
  if (privacyAccepted && session.privacyAccepted !== PRIVACY_VERSION) { session.privacyAccepted = PRIVACY_VERSION; saveSession(); }
  const go2 = () => {
    if (isSharedPhone() && pushSupported() && Notification.permission === "granted") subscribePush().catch(() => {}); // the phone's notifications are now this carer's
    if (session.client) { $("#fullRoot").innerHTML = ""; loadUser(); go("today"); openFromHash(); checkClient(); checkPush(); setTimeout(checkPronouns, 1500); } else showClients(false);
  };
  if (session.local || privacyAccepted || session.privacyAccepted === PRIVACY_VERSION) go2(); else showPrivacy(go2);
}


/* ---------- pronouns ----------
 * How notes and handovers refer to people. Each carer chooses their own (asked once, at the next
 * sign-in or app open); an administrator sets the client's. The AI is told never to guess from a name.
 */
const PRONOUN_CHOICES = [["she/her", "She / her"], ["he/him", "He / him"], ["they/them", "They / them"], ["", "Just use my name"]];
function openPronouns(after) {
  const cur = session.pronouns || "", other = cur && !PRONOUN_CHOICES.some(([v]) => v === cur);
  const s = sheet(`${sheetHead("How notes refer to you")}
    <p class="small" style="margin:0">Notes and handovers often say who did what (for example "Jo helped Nana up; she then called the GP"). Choose how they should refer to you, so it's never guessed from your name. You can change it any time in Settings.</p>
    <div style="display:grid;gap:8px">${PRONOUN_CHOICES.map(([v, l]) => `<label class="check"><input type="radio" name="prn" value="${esc(v)}" ${!other && v === cur && session.pronounsAsked ? "checked" : ""}><span>${esc(l)}</span></label>`).join("")}
      <label class="check"><input type="radio" name="prn" value="other" ${other ? "checked" : ""}><span>Something else</span></label>
      <input type="text" id="prnOther" maxlength="24" placeholder="e.g. ze/zir" value="${other ? esc(cur) : ""}" ${other ? "" : "hidden"} autocomplete="off"></div>
    <button class="btn primary block" id="prnSave">Save</button>
    <button class="btn ghost block" id="prnSkip">Skip: use my name</button>`, { onClose: after });
  s.root.querySelectorAll('[name="prn"]').forEach((r) => (r.onchange = () => { $("#prnOther", s.root).hidden = r.value !== "other"; }));
  const save = async (val) => {
    try { const out = await relay("/me/pronouns", { pronouns: val }); val = out.pronouns ?? val; session.pronouns = val; session.pronounsAsked = true; saveSession(); toast(val ? `Notes will use ${val}` : "Notes will use your name"); s.close(); }
    catch (e) { toast(e.message); }
  };
  $("#prnSave", s.root).onclick = () => { const r = s.root.querySelector('[name="prn"]:checked'); if (!r) return toast("Choose one"); save(r.value === "other" ? $("#prnOther", s.root).value.trim() : r.value); };
  $("#prnSkip", s.root).onclick = () => (navigator.onLine ? save("") : s.close()); // offline: asked again later
}
// Ask once: on the next sign-in or app open, for carers and administrators.
async function checkPronouns() {
  if (!session || session.local || session.role === "family" || session.pronounsAsked || !navigator.onLine) return;
  try {
    const me = await relay("/me", {});
    if (me.pronouns) { session.pronouns = me.pronouns.p || ""; session.pronounsAsked = true; saveSession(); return; }
    if (session && !appBusy() && !$("#lockRoot")) openPronouns();
  } catch {}
}

/* ---------- the client's shared phone ----------
 * A phone kept at the client's home and used by several carers. An administrator makes it the
 * client's shared phone (Settings, holding the phone). Then it opens only that client, isn't counted
 * as anyone's own device, has "Switch carer" (tap your name, type your own password), shows who is
 * recording, and locks after a few minutes unused (never mid-recording; anything open stays underneath).
 * Switching sends everything first, then removes the previous carer's copy from the phone.
 */
const SHARED_KEY = "dignitynotes.sharedphone", SHARED_PEOPLE = "dignitynotes.sharedpeople", LOCK_KEY = "dignitynotes.locked", ACTIVE_KEY = "dignitynotes.active";
const sharedPhone = () => { try { return JSON.parse(localStorage.getItem(SHARED_KEY) || "null"); } catch { return null; } };
const setSharedPhone = (v) => { try { v ? localStorage.setItem(SHARED_KEY, JSON.stringify(v)) : localStorage.removeItem(SHARED_KEY); } catch {} };
const isSharedPhone = () => !!(session && !session.local && session.shared && sharedPhone());
const sharedPeople = () => { try { return JSON.parse(localStorage.getItem(SHARED_PEOPLE) || "[]"); } catch { return []; } };
function rememberSharedPerson(u, name) {
  try { localStorage.setItem(SHARED_PEOPLE, JSON.stringify([{ u, name }, ...sharedPeople().filter((p) => p.u !== u)].slice(0, 12))); } catch {}
}
let lastActive = (() => { try { return Number(localStorage.getItem(ACTIVE_KEY)) || Date.now(); } catch { return Date.now(); } })(), activeSaved = 0;
const markActive = () => { lastActive = Date.now(); if (lastActive - activeSaved > 30000) { activeSaved = lastActive; try { localStorage.setItem(ACTIVE_KEY, String(lastActive)); } catch {} } };
["pointerdown", "keydown", "touchstart", "wheel"].forEach((ev) => addEventListener(ev, () => { if (!$("#lockRoot")) markActive(); }, { passive: true, capture: true }));
const isLocked = () => { try { return localStorage.getItem(LOCK_KEY) === "1"; } catch { return false; } };
function checkLock() {
  if (!isSharedPhone() || $("#lockRoot")) return;
  if (rec.on || rec.starting || rec.finishing || $("#rvTx")) { markActive(); return; } // never mid-recording, or with a note being checked
  const mins = Number(session.shared.lockMins) || 15;
  if (isLocked() || Date.now() - lastActive >= mins * 60000) lockPhone();
}
setInterval(checkLock, 20000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkLock(); });
function lockPhone() {
  try { localStorage.setItem(LOCK_KEY, "1"); } catch {}
  const el = document.createElement("div"); el.id = "lockRoot";
  el.innerHTML = `<div class="full" role="dialog" aria-modal="true" style="z-index:9999"><div class="wrap" style="max-width:440px">
    <div style="display:grid;gap:10px;margin-top:6vh">
      <span class="eyebrow">${esc((sharedPhone() || {}).clientName || "Shared phone")}'s shared phone</span>
      <h2 style="font-size:30px;line-height:1.15">Locked</h2>
      <p style="margin:0"><strong>${esc(session.name)}</strong> was signed in. Anything you had open is kept.</p>
      <form id="lkForm" style="display:grid;gap:10px"><label class="f">${esc(session.name)}'s password<input type="password" id="lkPass" autocomplete="current-password"></label>
        <button class="btn primary block" id="lkGo">Unlock</button><div class="small" id="lkMsg" role="alert" style="color:var(--incident)"></div></form>
      <button class="btn secondary block" id="lkSwitch">Not ${esc(session.name)}? Switch carer</button>
    </div></div></div>`;
  document.body.appendChild(el);
  [...document.body.children].forEach((c) => { if (c !== el) c.inert = true; }); // nothing behind it can be reached
  $("#lkForm").onsubmit = async (e) => {
    e.preventDefault(); const pw = $("#lkPass").value, m = $("#lkMsg"); if (!pw) return;
    $("#lkGo").disabled = true; m.textContent = "";
    try {
      const out = await relay("/login", { username: session.username, password: pw, deviceId, sharedSecret: (sharedPhone() || {}).secret }, { auth: false });
      const old = session.token; session.token = out.token; session.shared = out.shared || session.shared; saveSession();
      fetch(relayBase() + "/logout", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + old }, body: "{}" }).catch(() => {});
      unlockPhone();
    } catch (err) { m.textContent = err.message; $("#lkGo").disabled = false; }
  };
  $("#lkSwitch").onclick = () => switchCarer();
  setTimeout(() => $("#lkPass") && $("#lkPass").focus(), 50);
}
function unlockPhone() { try { localStorage.removeItem(LOCK_KEY); } catch {} const el = $("#lockRoot"); if (el) el.remove(); [...document.body.children].forEach((c) => (c.inert = false)); markActive(); }
// Send everything, then remove this carer's copy from the shared phone and let the next one sign in.
async function switchCarer() {
  if (rec.on || rec.starting || rec.finishing) return toast("Finish the recording first");
  // A recording not saved yet stays on this phone (hidden) for that carer, so the phone isn't stuck.
  const keepFor = (S.pending || []).length ? session.username : "";
  if (keepFor && !confirm(`${session.name} has a recording that isn't saved yet. It will be kept on this phone, hidden, until ${session.name} signs in here again. Switch carer?`)) return;
  if (navigator.onLine) await syncNow().catch(() => {});
  const left = unsynced().length + unsentAudio().length + countFailed(); // counted now, not the last sync's figures
  if (left) return toast(`${left} item${left === 1 ? "" : "s"} not sent yet. Connect to the internet, wait a moment, then switch.`);
  const who = session.username, token = session.token;
  if (token && relayBase()) fetch(relayBase() + "/logout", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: "{}" }).catch(() => {});
  unlockPhone();
  signedOut(`${session.name} has switched off. Next carer: tap your name and sign in.`);
  try {
    const mineKey = (k) => (!keepFor && k === "nanacare.v3." + who) || (keepFor ? ["dignitynotes.fbdraft."] : ["nanacare.v3.", "dignitynotes.dict.", "dignitynotes.speechlang.", "dignitynotes.fbdraft."]).some((p) => k === p + who || k.startsWith(p + who + "."));
    for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && mineKey(k)) localStorage.removeItem(k); }
    recStore.keys().filter(mineKey).forEach(recStore.del);
  } catch {}
  if (!keepFor) audioDB.keys().then((ks) => audioDB.del((ks || []).filter((k) => !String(k).startsWith("doc_")))).catch(() => {}); // recordings already sent
}

/* ---------- sign-in ---------- */
// A random ID for this phone, so administrators can spot an account used on more than one device.
const deviceId = (() => {
  try {
    let id = localStorage.getItem("dignitynotes.device");
    if (!id) { id = uid() + uid(); localStorage.setItem("dignitynotes.device", id); }
    return id;
  } catch { return "no-storage"; }
})();
const lastRelay = () => { try { return localStorage.getItem("nanacare.relay") || ""; } catch { return ""; } };
function saveSession() {
  try { if (session && session.relayUrl) localStorage.setItem("nanacare.relay", session.relayUrl); } catch {}
  try { session ? localStorage.setItem(SESSION_KEY, JSON.stringify(session)) : localStorage.removeItem(SESSION_KEY); } catch {} }
function signedOut(msg) {
  if (rec.on) stopRecording(true);
  dropPush(session && session.token);
  clearDocCache(); saveLocal();
  audioDB.keys().then((ks) => audioDB.del((ks || []).filter((k) => String(k).startsWith("doc_")))); // every client's documents
  try { caches.delete("dn-manual"); } catch {} // the manual copy kept for reading without signal
  session = null; saveSession(); KEY = null; S = seed(); $("#sheetRoot").innerHTML = ""; calDay = ""; calView = "month"; handoverDraft = familySummary = null; fbQuestions = { list: [], at: 0, busy: false, drafts: {} }; showLogin(msg);
}
function showLogin(msg) {
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const root = $("#fullRoot");
  root.innerHTML = `<div class="full" role="dialog" aria-modal="true"><div class="wrap" style="max-width:440px">
    <div style="display:grid;gap:6px;margin-top:4vh"><div style="background:#FDFAF3;border-radius:18px;padding:12px 14px;box-shadow:var(--shadow);margin-bottom:12px"><img src="logo-wordmark.png" alt="Dignity Notes: Spoken care notes" width="720" height="195" style="width:100%;height:auto;display:block"></div>
      <h2 style="font-size:32px;line-height:1.1">${sharedPhone() ? `${esc(sharedPhone().clientName || "Shared")}'s phone` : "Sign in"}</h2>
      ${sharedPhone() && sharedPeople().length ? `<p class="small" style="margin:0">Who's using it? Tap your name, then type your own password.</p><div class="chips">${sharedPeople().map((p) => `<button type="button" class="chip" data-lgu="${esc(p.u)}" style="min-height:44px;font-size:16px">${esc(p.name)}</button>`).join("")}</div>` : ""}
      <p class="muted" style="margin:0">Spoken care notes for people who care for older adults at home. Use the username and password you were given.</p></div>
    ${msg ? `<div class="warn">${esc(msg)}</div>` : ""}
    <form id="lgForm" style="display:grid;gap:14px">
      <label class="f">Username<input type="text" id="lgUser" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
      <label class="f">Password<input type="password" id="lgPass" autocomplete="current-password" required></label>
      ${RELAY_URL ? "" : `<label class="f">Relay address<input type="text" id="lgRelay" inputmode="url" autocomplete="off" placeholder="https://dignity-notes-relay.example.workers.dev" value="${esc((session && session.relayUrl) || lastRelay())}"></label>`}
      <button class="btn primary block" id="lgGo">Sign in</button>
      <div class="small" id="lgMsg" role="alert" style="color:var(--incident)"></div>
    </form>
    ${local ? '<button class="link" id="lgLocal" style="justify-self:center">Continue without signing in (local testing only)</button>' : ""}
    <a class="link" href="manual.html" target="_blank" rel="noopener" style="justify-self:center">Read the user manual</a>
    <p class="tiny muted" style="margin:0;text-align:center">Prototype for evaluation with fictional information only. Ask the person who invited you if you need a login.<br>${COPYRIGHT}</p>
  </div></div>`;
  $("#lgForm").onsubmit = async (e) => {
    e.preventDefault();
    const btn = $("#lgGo"), m = $("#lgMsg"); m.textContent = "";
    const username = $("#lgUser").value.trim().toLowerCase(), password = $("#lgPass").value;
    const relayUrl = RELAY_URL || ($("#lgRelay") ? $("#lgRelay").value.trim() : "");
    if (!relayUrl) { m.textContent = "Enter the relay address."; return; }
    btn.disabled = true; btn.textContent = "Signing in…";
    session = { relayUrl };
    try {
      const out = await relay("/login", { username, password, deviceId, sharedSecret: (sharedPhone() || {}).secret }, { auth: false });
      if (!out.token) throw new Error("That address isn't the Dignity Notes relay.");
      if (out.privacyVersion && out.privacyVersion !== PRIVACY_VERSION) throw new Error("A newer version of the app is available. Close and reopen it, then sign in again.");
      session = { token: out.token, username: out.username, role: out.role, name: out.name, relayUrl, ...(out.shared ? { shared: out.shared } : {}) };
      if (out.shared) { setSharedPhone({ ...(sharedPhone() || {}), ...out.shared }); if (out.role !== "admin") rememberSharedPerson(out.username, out.name); } else setSharedPhone(null); // not (or no longer) a shared phone
      try { localStorage.removeItem(LOCK_KEY); } catch {} markActive();
      saveSession(); accentFromServer(out.accent); afterSignIn(out.privacyAccepted);
    } catch (err) {
      session = null; btn.disabled = false; btn.textContent = "Sign in";
      m.textContent = /fetch|network|load failed/i.test(err.message) ? "Couldn't reach the server. Check your internet connection and the relay address." : err.message;
    }
  };
  if ($("#lgLocal")) $("#lgLocal").onclick = () => {
    session = { username: "local", role: "admin", name: "Local tester", local: true, relayUrl: "" };
    saveSession(); showClients(false);
  };
  root.querySelectorAll("[data-lgu]").forEach((b) => (b.onclick = () => { $("#lgUser").value = b.dataset.lgu; $("#lgPass").focus(); }));
  setTimeout(() => $("#lgUser") && $("#lgUser").focus(), 50);
}

// Random passwords like "k7m2-p9xq-4tbn": 12 characters with no look-alikes (0/o, 1/l/i), about
// 59 bits, so they can't be guessed even by someone trying from many places at once.
const PW_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
function suggestPassword() {
  const r = crypto.getRandomValues(new Uint32Array(12));
  return [0, 4, 8].map((i) => Array.from(r.slice(i, i + 4), (n) => PW_CHARS[n % PW_CHARS.length]).join("")).join("-");
}
function loginText(username, password) {
  return `Dignity Notes test login\nLink: ${location.href.split("#")[0]}\nUsername: ${username}\nPassword: ${password}`;
}
function openTesters() {
  const s = sheet(`${sheetHead("People")}
    <p class="small muted" style="margin:0">People you add can sign in on their own phone and try the app. Tick the clients each person cares for: carers only see those clients. Their notes stay on their phone. Removing someone signs them out straight away.</p>
    <div class="card"><div class="list" id="tList"><div class="empty">Loading people…</div></div></div>
    <div class="card"><div class="card-h"><h3>Sign-in history</h3><span class="muted small">Last 90 days</span></div>
      <div class="list" id="tLog"><div class="empty">Loading…</div></div>
      <p class="tiny muted" style="margin:8px 0 0">Location is estimated from the internet connection, so it may show a nearby town.</p></div>
    <form class="card" id="tForm" style="display:grid;gap:12px"><h3 style="font-size:17px">Add a person</h3>
      <label class="f">Name<input type="text" id="tName" placeholder="Mary Smith" autocomplete="off"></label>
      <label class="f">Username<input type="text" id="tUser" placeholder="mary.smith" autocapitalize="none" spellcheck="false" autocomplete="off"></label>
      <label class="f">Password<span class="row"><input type="text" id="tPass" style="flex:1 1 170px" autocomplete="off" spellcheck="false"><button class="btn ghost" type="button" id="tGen" style="flex:0 0 auto">Suggest</button></span></label>
      ${session.client ? `<label class="check"><input type="checkbox" id="tCares" checked><span>Link to ${esc(session.client.name)} (cares for, or family of)</span></label>` : ""}
      <label class="f">Their accent (for speech-to-text)<select id="tAccent">${ACCENTS.map(([c, n]) => `<option value="${c}" ${c === speechLang() ? "selected" : ""}>English (${n})</option>`).join("")}</select></label>
      <label class="f" id="tTypeWrap">Works as (for medicines)<select id="tCarerType"><option value="private">A private carer: self-employed, or employed by the client or family (no training sign-off required)</option><option value="agency">An agency carer: employed by a registered care provider (training sign-off required)</option></select></label>
      <label class="f">They are<select id="tRole"><option value="tester">A carer</option><option value="family">A family member (sees shared updates and messages only)</option><option value="admin">An administrator (can add and remove people too)</option></select></label>
      <button class="btn primary">Add person</button><div class="small" id="tMsg"></div></form>`);
  const listEl = $("#tList", s.root);
  $("#tRole", s.root).addEventListener("change", (e) => { $("#tTypeWrap", s.root).hidden = e.target.value === "family"; });
  const showShare = (el, username, password, label) => {
    el.innerHTML = `<div class="warn" style="display:grid;gap:8px"><span><strong>${esc(label)}</strong> Send these details to the tester yourself:</span>
      <code style="white-space:pre-wrap;font-size:13px">${esc(loginText(username, password))}</code>
      <button class="btn secondary" type="button">Copy details</button></div>`;
    el.querySelector("button").onclick = async () => {
      try { await navigator.clipboard.writeText(loginText(username, password)); toast("Copied"); }
      catch { const r = document.createRange(); r.selectNodeContents(el.querySelector("code")); getSelection().removeAllRanges(); getSelection().addRange(r); toast("Selected. Copy it from the menu."); }
    };
  };
  const load = async () => {
    try {
      const { users, clients = [] } = await relay("/admin/users", {});
      listEl.innerHTML = users.length ? users.sort((a, b) => a.name.localeCompare(b.name)).map((u) => `<div class="item" style="flex-wrap:wrap">
        <span class="avatar">${esc((u.name || u.username).charAt(0).toUpperCase())}</span>
        <div class="body" style="flex:1 1 220px"><strong>${esc(u.name || u.username)}</strong>${u.role === "admin" ? ' <span class="chip accent">Admin</span>' : u.role === "family" ? ' <span class="chip">Family</span>' : ""}
          ${u.devices.length > 1 ? `<span class="chip incident">⚠ ${u.devices.length} devices</span>` : u.devices.length ? '<span class="chip">1 device</span>' : '<span class="chip">Not signed in yet</span>'}
          ${u.locked ? '<span class="chip follow">Locked to first device</span>' : ""}
          <div class="small muted">${esc(u.username)}${u.createdAt ? " · added " + esc(new Date(u.createdAt).toLocaleDateString("en-GB")) : ""} · ${u.agreedAt ? "privacy notice accepted " + esc(new Date(u.agreedAt).toLocaleDateString("en-GB")) : "privacy notice not yet accepted"}</div>
          ${u.devices.length ? `<details style="margin-top:4px"><summary>Devices</summary>${u.devices.map((d, i) => `<div class="small" style="padding:4px 0"><strong>${i === 0 ? "Home device" : "Other device"}:</strong> ${esc(d.device)} · ${esc(d.place)}<br><span class="tiny muted">First ${esc(new Date(d.first).toLocaleString("en-GB"))} · last ${esc(new Date(d.last).toLocaleString("en-GB"))}</span></div>`).join("")}</details>` : ""}
          <div class="small" style="margin-top:8px"><strong>${u.role === "family" ? "Family of" : "Cares for"}</strong>${u.role === "admin" ? ' <span class="muted">(administrators can open every client)</span>' : ""}
            <div class="chips" style="margin-top:4px">${clients.length ? clients.map((c) => `<label class="chip" style="display:inline-flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" data-assign="${esc(u.username)}" value="${esc(c.id)}" ${u.clients.includes(c.id) ? "checked" : ""} style="accent-color:var(--accent)">${esc(c.name)}</label>`).join("") : '<span class="muted">No clients yet</span>'}</div></div>
          ${u.training ? `<div class="small" style="margin-top:8px"><strong>Training course</strong> ${u.training.completedAt ? `<span class="chip accent">Completed</span> <span class="muted">${esc(new Date(u.training.completedAt).toLocaleDateString("en-GB"))}, final check ${u.training.score} of ${u.training.of}</span>` : `<span class="muted">${u.training.modulesDone ? `${u.training.modulesDone} of 10 modules done` : "not started"}</span>`}</div>` : ""}
          ${u.role !== "family" ? `<div class="small" style="margin-top:8px"><strong>Medicines</strong> ${u.meds && u.meds.valid ? `<span class="chip accent">Signed off</span> <span class="muted">${u.meds.via === "certificate" ? "verified certificate" : `assessed ${esc(u.meds.assessedOn)} by ${esc(u.meds.assessor)}`} · review by ${esc(u.meds.reviewOn)}</span>` : u.meds && u.meds.competent ? `<span class="chip incident">Review overdue (${esc(u.meds.reviewOn)})</span>` : (u.meds && (u.meds.certificates || []).some((c) => c.verifiedAt && !c.practical)) ? '<span class="chip follow">Course done: observed assessment needed</span>' : u.meds && u.meds.required === false ? '<span class="chip">Private carer</span> <span class="muted">no sign-off required</span>' : '<span class="muted">Not signed off to support with medicines</span>'} <button class="link small" data-medsign="${esc(u.username)}" style="min-height:40px">${u.meds && u.meds.assessedOn ? "Change" : "Record assessment"}</button>
            ${u.username === session.username ? (u.meds && u.meds.carerType ? `<div class="tiny muted">Works as: ${u.meds.carerType === "private" ? "private carer" : "agency carer"}</div>` : "") : `<label class="f" style="margin-top:4px">Works as<select data-carertype="${esc(u.username)}"><option value="" ${u.meds && u.meds.carerType ? "" : "selected"} disabled>Not set: private carer (no sign-off needed)</option><option value="private" ${u.meds && u.meds.carerType === "private" ? "selected" : ""}>Private carer (no sign-off required)</option><option value="agency" ${u.meds && u.meds.carerType === "agency" ? "selected" : ""}>Agency carer (sign-off required)</option></select></label>`}
            ${(() => { const cs = (u.meds && u.meds.certificates) || [], waiting = cs.filter((c) => !c.verifiedAt).length; return `<details style="margin-top:4px" ${waiting ? "open" : ""}><summary>Certificates (${cs.length})${waiting ? ` <span class="chip follow">${waiting} to verify</span>` : ""}</summary><div data-certs="${esc(u.username)}" style="display:grid;gap:8px;margin-top:6px">${cs.map((c) => certRowHTML(c, u.username, { admin: true, self: u.username === session.username, required: !!(u.meds && u.meds.required) })).join("")}<button class="btn ghost" type="button" data-certadd="${esc(u.username)}">Add a certificate for ${esc(u.name || u.username)}</button></div></details>`; })()}</div>` : ""}
          ${u.main ? '<p class="tiny muted" style="margin:6px 0 0">Main administrator: signs in with the relay settings, so the password and device lock aren\'t managed here.</p>' : `<label class="check small" style="margin-top:6px"><input type="checkbox" data-lock="${esc(u.username)}" ${u.locked ? "checked" : ""}><span>Lock to first device (refuse sign-ins from any other device)</span></label>`}
          ${u.devices.length ? `<button class="link small" data-devreset="${esc(u.username)}">Reset devices (next sign-in becomes the home device)</button>` : ""}</div>
        ${u.main ? "" : `<button class="link" data-reset="${esc(u.username)}">New password</button>
        <button class="link" style="color:var(--record)" data-remove="${esc(u.username)}">Remove</button>`}
        <div data-slot="${esc(u.username)}" style="flex-basis:100%"></div></div>`).join("") : '<div class="empty">No testers yet. Add the first one below.</div>';
      listEl.querySelectorAll("[data-assign]").forEach((c) => (c.onchange = async () => {
        const who = c.dataset.assign; const boxes = [...listEl.querySelectorAll("[data-assign]")];
        if (!c.checked && !confirm(`Take ${who} off ${c.parentElement.textContent.trim()}? They'll stop seeing this client's notes. Anything they haven't sent yet stays on their phone.`)) { c.checked = true; return; }
        const ids = boxes.filter((x) => x.dataset.assign === who && x.checked).map((x) => x.value);
        boxes.forEach((x) => (x.disabled = true)); // one change at a time, so two quick ticks can't overwrite each other
        try {
          await relay("/admin/assign", { username: who, clientIds: ids }); toast("Saved");
          if (session.client && c.value === session.client.id) checkClient(); // the client open on this phone changed
        } catch (e) { toast(e.message); c.checked = !c.checked; }
        boxes.forEach((x) => (x.disabled = false));
      }));
      listEl.querySelectorAll("[data-carertype]").forEach((sel) => (sel.onchange = async () => {
        try { await relay("/admin/carertype", { username: sel.dataset.carertype, carerType: sel.value }); toast(sel.value === "private" ? "Private carer: no sign-off required" : "Agency carer: sign-off required"); load(); }
        catch (e) { toast(e.message); load(); }
      }));
      // Certificates: view, verify (not your own), remove, or add one for them.
      listEl.querySelectorAll("[data-certs]").forEach((box) => { const u = users.find((x) => x.username === box.dataset.certs); bindCerts(box, (u.meds && u.meds.certificates) || [], openTesters, load); });
      listEl.querySelectorAll("[data-certadd]").forEach((b) => (b.onclick = () => openCertUpload(b.dataset.certadd, openTesters)));
      // Medicines training sign-off (NICE NG67 1.11): who assessed them, when, and when to review (yearly).
      listEl.querySelectorAll("[data-medsign]").forEach((b) => (b.onclick = () => {
        const u = users.find((x) => x.username === b.dataset.medsign), c = u.meds || {}, slot = listEl.querySelector(`[data-slot="${CSS.escape(u.username)}"]`);
        const today = dayKey(new Date()), inYear = (d) => { const x = new Date(d || today); x.setFullYear(x.getFullYear() + 1); return dayKey(x); };
        const certNow = (c.certificates || []).find((x) => x.counts);
        slot.innerHTML = `<div class="card" style="box-shadow:none;display:grid;gap:10px;margin-top:8px"><strong class="small">Medicines sign-off: ${esc(u.name || u.username)}</strong>
          ${certNow ? `<div class="warn small">A verified certificate (${esc(certNow.course)}) also signs them off until ${esc(certNow.reviewOn)}. To stop them handling medicines, also open Certificates and mark it <strong>Not verified</strong>.</div>` : ""}
          <label class="check"><input type="checkbox" id="mcOn" ${c.competent ? "checked" : ""}><span>Trained and assessed as competent to support people with their medicines</span></label>
          <label class="f">Date assessed<input type="date" id="mcOnDate" max="${today}" value="${esc(c.assessedOn || "")}"></label>
          <label class="f">Assessed by<input type="text" id="mcBy" maxlength="80" value="${esc(c.assessor || "")}" placeholder="e.g. the training provider, pharmacist or GP"></label>
          <label class="f">Review by (at most a year later)<input type="date" id="mcRev" value="${esc(c.assessedOn ? c.reviewOn || "" : "")}"></label>
          <label class="f">Note (optional)<input type="text" id="mcNote" maxlength="200" value="${esc(c.note || "")}" placeholder="e.g. Course name, certificate seen"></label>
          <p class="tiny muted" style="margin:0">NICE guidance: only trained carers, assessed as competent (including by watching them), give medicines or change the medicine list, and their competence is reviewed at least once a year. This records who assessed them; it isn't an assessment itself.</p>
          <div class="row" style="gap:8px"><button class="btn primary" type="button" id="mcSave" style="flex:1">Save</button><button class="btn ghost" type="button" id="mcCancel" style="flex:1">Cancel</button></div></div>`;
        $("#mcOnDate", slot).onchange = (e) => { $("#mcRev", slot).value = inYear(e.target.value); };
        $("#mcCancel", slot).onclick = () => { slot.innerHTML = ""; };
        $("#mcSave", slot).onclick = async () => {
          try {
            await relay("/admin/medscompetency", { username: u.username, competent: $("#mcOn", slot).checked, assessedOn: $("#mcOnDate", slot).value, assessor: $("#mcBy", slot).value, reviewOn: $("#mcRev", slot).value, note: $("#mcNote", slot).value });
            toast($("#mcOn", slot).checked ? "Signed off for medicines" : "Medicines sign-off removed"); if (u.username === session.username && medsState()) medsState().at = 0; load();
          } catch (e) { toast(e.message); }
        };
      }));
      // Shared phones for every client, so a lost one can be stopped from here (its sign-ins end at once).
      const sp = clients.filter((c) => (c.shared || []).length);
      if (sp.length) listEl.insertAdjacentHTML("afterbegin", `<div class="card" style="box-shadow:none;display:grid;gap:6px;margin-bottom:8px"><strong class="small">Shared phones</strong>${sp.map((c) => c.shared.map((x) => `<div class="row small" style="justify-content:space-between;align-items:center;gap:8px"><span>${esc(c.name)}: ${esc(x.label)} <span class="muted">· set up ${esc(dayLabel(x.setAt).toLowerCase())} by ${esc(x.setBy)}</span></span><button class="link small" data-sprm="${esc(c.id)}|${esc(x.key)}">Stop</button></div>`).join("")).join("")}</div>`);
      listEl.querySelectorAll("[data-sprm]").forEach((b) => (b.onclick = () => confirmInline(b, async () => {
        const [id, key] = b.dataset.sprm.split("|");
        try { await relay("/clients/sharedphone", { id, key, on: false }); toast("That phone is no longer a shared phone, and anyone signed in on it is signed out"); load(); } catch (e) { toast(e.message); }
      }, "Tap again to stop it")));
      listEl.querySelectorAll("[data-remove]").forEach((b) => (b.onclick = () => confirmInline(b, async () => {
        try { await relay("/admin/remove", { username: b.dataset.remove }); toast("Removed"); load(); } catch (e) { toast(e.message); }
      })));
      listEl.querySelectorAll("[data-lock]").forEach((c) => (c.onchange = async () => {
        try { await relay("/admin/lock", { username: c.dataset.lock, locked: c.checked }); toast(c.checked ? "Locked to first device" : "Lock removed"); load(); }
        catch (e) { toast(e.message); c.checked = !c.checked; }
      }));
      listEl.querySelectorAll("[data-devreset]").forEach((b) => (b.onclick = () => confirmInline(b, async () => {
        try { await relay("/admin/devices-reset", { username: b.dataset.devreset }); toast("Devices reset"); load(); } catch (e) { toast(e.message); }
      })));
      listEl.querySelectorAll("[data-reset]").forEach((b) => (b.onclick = async () => {
        const password = suggestPassword(); const slot = listEl.querySelector(`[data-slot="${CSS.escape(b.dataset.reset)}"]`);
        try { await relay("/admin/reset", { username: b.dataset.reset, password }); showShare(slot, b.dataset.reset, password, "Password changed."); }
        catch (e) { toast(e.message); }
      }));
    } catch (e) { listEl.innerHTML = `<div class="empty">Couldn't load testers: ${esc(e.message)}</div>`; }
  };
  const loadLog = async () => {
    const el = $("#tLog", s.root);
    try {
      const { logins } = await relay("/admin/logins", {});
      el.innerHTML = logins.length ? logins.slice(0, 50).map((l) => `<div class="item">
        <div class="when" style="min-width:64px"><div>${fmtTime(l.t)}</div><div class="tiny muted" style="font-weight:400">${esc(new Date(l.t).toLocaleDateString("en-GB", { day: "numeric", month: "short" }))}</div></div>
        <div class="body"><div><strong>${esc(l.u)}</strong> ${l.blocked ? '<span class="chip incident">Blocked: other device</span>' : l.ok ? '<span class="chip accent">Signed in</span>' : '<span class="chip incident">Wrong password</span>'}${l.nd && !l.blocked ? ' <span class="chip follow">⚠ New device</span>' : ""}</div>
        <div class="small muted">${esc(l.device)} · ${esc(l.place)}</div><div class="tiny muted">IP ${esc(l.ip)}</div></div></div>`).join("")
        : '<div class="empty">No sign-ins recorded yet.</div>';
    } catch (e) { el.innerHTML = `<div class="empty">Couldn't load sign-in history: ${esc(e.message)}</div>`; }
  };
  loadLog();
  $("#tGen").onclick = () => { $("#tPass").value = suggestPassword(); };
  $("#tPass").value = suggestPassword();
  $("#tForm").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#tName").value.trim(), username = $("#tUser").value.trim().toLowerCase(), password = $("#tPass").value.trim(), m = $("#tMsg");
    m.textContent = ""; m.style.color = "var(--incident)";
    if (!name || !username) { m.textContent = "Enter a name and a username."; return; }
    try {
      const role = $("#tRole").value;
      await relay("/admin/add", { name, username, password, role, accent: $("#tAccent") ? $("#tAccent").value : undefined, carerType: role === "family" ? undefined : $("#tCarerType").value });
      // Put them straight onto the client open on this phone, so they can be handed over to at once.
      const cares = $("#tCares") && $("#tCares").checked && session.client;
      if (cares) { try { await relay("/admin/assign", { username, clientIds: [session.client.id] }); await checkClient(); } catch (err) { toast("Added, but couldn't put them on " + session.client.name + ": " + err.message); } }
      showShare(m, username, password, (role === "admin" ? "Administrator added" : role === "family" ? "Family member added" : "Carer added") + (cares ? ` and put on ${session.client.name}.` : "."));
      $("#tRole").value = "tester";
      $("#tName").value = $("#tUser").value = ""; $("#tPass").value = suggestPassword(); load();
    } catch (err) { m.textContent = err.message; }
  };
  load();
}
