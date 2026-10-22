// Dignity Notes: choosing a client, and starting the app (loaded last: the only part that runs at load).
// Loaded by index.html after app.js, in order; shares its global scope (one app split into files).
"use strict";

/* ---------- clients ---------- */
// The client list lives on the server, so the agreement is asked for once per client, not once per carer.
// Local testing (no server) keeps the list on this phone.
const LOCAL_CLIENTS = "dignitynotes.localclients";
const localClients = () => { try { return JSON.parse(localStorage.getItem(LOCAL_CLIENTS) || "[]"); } catch { return []; } };
const clientsApi = {
  list: async () => {
    if (session.local) return localClients();
    const out = await relay("/clients", {});
    if (session && out.meId) { session.meId = out.meId; session.meName = out.meName; saveSession(); }
    if (session) accentFromServer(out.accent);
    return out.clients;
  },
  add: async (name, consent, country = "UK", care = "private") => {
    if (!session.local) { const out = await relay("/clients/add", { name, consent, country, care }); if (out.meId) session.meId = out.meId; return out.client; }
    const client = { id: uid(), name, country, care, consent: { name: consent.name, role: consent.role, ts: Date.now(), by: session.username }, createdAt: Date.now(), createdBy: session.username };
    localStorage.setItem(LOCAL_CLIENTS, JSON.stringify([...localClients(), client]));
    return client;
  },
};
// Clients already used on this phone, for when there's no connection.
function savedClients() {
  const prefix = REC_PREFIX + session.username + ".";
  const out = [];
  try {
    for (const k of recStore.keys()) {
      if (!k.startsWith(prefix) || k.slice(prefix.length).includes(".")) continue;
      const d = recStore.get(k);
      if (d && d.client && d.consent && !d.detached) out.push({ id: k.slice(prefix.length), name: d.client.name, consent: d.consent, carers: d.client.carers || [] });
    }
  } catch {}
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
// If an administrator removed the client (for example, consent withdrawn), stop using it.
async function checkClient() {
  if (!session || !session.client || !navigator.onLine) return;
  let clients;
  try { clients = await clientsApi.list(); } catch { return; }
  if (!session || !session.client) return;
  const fresh = clients.find((c) => c.id === session.client.id);
  if (!fresh) {
    toast(isFamily() ? `You're no longer linked to ${session.client.name}, or it was removed` : `You're no longer a carer for ${session.client.name}, or it was removed`);
    detachClient();
    session.client = null; saveSession(); KEY = null; S = seed(); showClients(false);
  } else if (JSON.stringify(fresh.carers) !== JSON.stringify(session.client.carers) || fresh.name !== session.client.name || (fresh.country || "UK") !== clientCountry() || JSON.stringify(fresh.family || []) !== JSON.stringify(session.client.family || []) || !!fresh.familyIncidents !== !!session.client.familyIncidents || (fresh.familyAt || "") !== (session.client.familyAt || "") || (fresh.pronouns || "") !== (session.client.pronouns || "") || (fresh.care || "private") !== (session.client.care || "private") || (fresh.catchupDays || 7) !== (session.client.catchupDays || 7)) {
    // Carers or shifts changed elsewhere (e.g. an administrator assigned someone): pick that up.
    session.client = clientFromServer(fresh);
    saveSession(); loadUser(); render();
  }
}
// The client as the app keeps it in session.client, from the relay's record (one place, so a refresh
// never drops a field).
const clientFromServer = (c) => ({ id: c.id, name: c.name, country: c.country || "UK", consent: c.consent, carers: c.carers || [], family: c.family || [], familyIncidents: !!c.familyIncidents, familyAt: c.familyAt || "", pronouns: c.pronouns || "", care: c.care === "agency" ? "agency" : "private", catchupDays: c.catchupDays || 7, shared: c.shared || [] });
function chooseClient(client) {
  session.client = clientFromServer(client); calDay = ""; calView = "month";
  saveSession(); loadUser(); $("#fullRoot").innerHTML = ""; go("today");
}
// manual = opened from Settings; otherwise a single client is picked automatically.
async function showClients(manual) {
  const root = $("#fullRoot");
  const canGoBack = manual && session.client;
  root.innerHTML = `<div class="full" role="dialog" aria-modal="true"><div class="wrap">
    <div style="background:#FDFAF3;border-radius:16px;padding:10px 12px;box-shadow:var(--shadow);max-width:360px"><img src="logo-wordmark.png" alt="Dignity Notes: Spoken care notes" width="720" height="195" style="width:100%;height:auto;display:block"></div>
    <span class="eyebrow">Choose client</span>
    <h2 style="font-size:30px;line-height:1.15">${session && session.role === "family" ? "Who would you like to see?" : "Who are you caring for?"}</h2>
    <div class="card"><div class="list" id="clList"><div class="empty">Loading clients…</div></div></div>
    <button class="btn secondary block" id="clNew">Add a new client</button>
    <form id="clForm" hidden style="display:grid;gap:14px">
      <h3 style="font-size:20px;margin:6px 0 0">New client</h3>
      <label class="f">Client's name<input type="text" id="clName" placeholder="e.g. Nana" autocomplete="off"></label>
      <label class="f">Where is the care?<select id="clCountry"><option value="UK">United Kingdom</option><option value="AU">Australia</option></select></label>
      <label class="f">How is the care arranged?<select id="clCare"><option value="private">Private: the family employs the carers</option><option value="agency">Agency: a care agency provides the carers</option></select></label>
      <p class="muted" style="margin:0">Carers record short voice notes about the client's day. The app keeps the original recording, writes a tidy note and builds the handover for the next carer.</p>
      <div class="card small" style="display:grid;gap:8px">
        <div><strong>What is recorded:</strong> the carer's voice. Other voices nearby may be picked up.</div>
        <div><strong>Who can see it:</strong> the client's carers and the pilot administrators (kept securely in the cloud, in the EU), the authorised family member, and health staff in an emergency. Service providers handle it for us: Anthropic (AI note writing), Cloudflare (storage and speech-to-text) and the carer's phone maker, Apple or Google (speech-to-text).</div>
        <div><strong>Why:</strong> to keep an accurate record that protects the client and the carer.</div>
      </div>
      <p class="small" style="margin:0" id="cnWho">The client, or the person holding Lasting Power of Attorney for health and welfare, must agree before this is used. This is asked once, when the client is added.</p>
      <label class="f">Name of the person agreeing<input type="text" id="cnName" autocomplete="off"></label>
      <label class="f">They are<select id="cnRole"></select></label>
      <label class="check"><input type="checkbox" id="cnOk"><span>I agree to Dignity Notes being used to keep care notes and voice recordings for this client.</span></label>
      <button class="btn primary block" id="cnGo" disabled>Add client and start</button>
      <div class="small" id="clMsg" role="alert" style="color:var(--incident)"></div>
    </form>
    ${canGoBack ? `<button class="link" id="clBack" style="justify-self:center">Back to ${esc(session.client.name)}</button>` : ""}
    <button class="link" id="clOut" style="justify-self:center;color:var(--ink-2)">Sign out</button>
    <p class="tiny muted" style="margin:0;text-align:center">Prototype for testing with fictional information only.</p>
  </div></div>`;
  const listEl = $("#clList");
  const fillRoles = () => {
    const c = $("#clCountry").value;
    $("#cnRole").innerHTML = CONSENT_ROLES[c].map((r) => `<option>${esc(r)}</option>`).join("");
    $("#cnWho").textContent = c === "AU" ? "The client, or their enduring guardian, tribunal-appointed guardian or person responsible, must agree before this is used. This is asked once, when the client is added." : "The client, or the person holding Lasting Power of Attorney for health and welfare, must agree before this is used. This is asked once, when the client is added.";
  };
  fillRoles(); $("#clCountry").onchange = fillRoles;
  $("#clNew").onclick = () => { $("#clForm").hidden = false; $("#clNew").hidden = true; $("#clName").focus(); };
  if ($("#clBack")) $("#clBack").onclick = () => { root.innerHTML = ""; };
  $("#clOut").onclick = () => { if (!session.local) relay("/logout", {}).catch(() => {}); signedOut("You've signed out."); };
  const check = () => ($("#cnGo").disabled = !($("#cnOk").checked && $("#cnName").value.trim() && $("#clName").value.trim()));
  $("#cnOk").onchange = check; $("#cnName").oninput = check; $("#clName").oninput = check;
  $("#clForm").onsubmit = async (e) => {
    e.preventDefault();
    const b = $("#cnGo"); b.disabled = true; b.textContent = "Saving…"; $("#clMsg").textContent = "";
    try {
      chooseClient(await clientsApi.add($("#clName").value.trim(), { name: $("#cnName").value.trim(), role: $("#cnRole").value, agreed: true }, $("#clCountry").value, $("#clCare").value));
      toast("Client added");
      if (canEditPlan()) openEmergencyEdit({ then: offerPlanSetup });
    } catch (err) { $("#clMsg").textContent = err.message; b.textContent = "Add client and start"; check(); }
  };
  let clients, offline = false;
  try { clients = await clientsApi.list(); }
  catch (e) {
    if (!session) return; // signed out (e.g. sign-in ended)
    clients = savedClients(); offline = clients.length > 0;
    if (!offline) {
    listEl.innerHTML = `<div class="empty">Couldn't load clients: ${esc(e.message)}<br><button class="btn secondary" id="clRetry" style="margin-top:10px">Try again</button></div>`;
    $("#clRetry").onclick = () => showClients(manual); return;
    }
  }
  if (!manual && clients.length === 1) return chooseClient(clients[0]);
  listEl.innerHTML = clients.length ? clients.map((c) => `<button class="item" data-client="${esc(c.id)}" style="width:100%;text-align:left;background:none;border:0;cursor:pointer">
      <span class="avatar">${esc(c.name.charAt(0).toUpperCase())}</span>
      <div class="body"><strong>${esc(c.name)}</strong>${session.client && session.client.id === c.id ? ' <span class="chip accent">Current</span>' : ""}
        <div class="small muted">Agreed by ${esc(c.consent.name)} (${esc(c.consent.role)}) on ${fmtDay(c.consent.ts)}</div>
        ${(c.carers || []).length ? `<div class="tiny muted">Carers: ${c.carers.map((x) => esc(x.name)).join(", ")}</div>` : ""}</div></button>`).join("")
    : '<div class="empty">No clients yet. Add the first one below.</div>';
  if (offline) listEl.insertAdjacentHTML("afterbegin", '<div class="warn small">No connection. Showing clients already on this phone.</div>');
  listEl.querySelectorAll("[data-client]").forEach((b) => (b.onclick = () => { handoverDraft = familySummary = null; chooseClient(clients.find((c) => c.id === b.dataset.client)); }));
  if (session && session.role === "family") { $("#clNew").hidden = true; if (!clients.length) listEl.innerHTML = '<div class="empty">You are not linked to anyone yet. Ask the administrator who gave you your sign-in to link you.</div>'; return; }
  if (!clients.length) $("#clNew").click();
}

/* ---------- iPhone keyboard ---------- */
// On iPhones (especially from the Home Screen), closing the on-screen keyboard can leave fixed bars,
// like the tabs at the bottom, part-way up the screen until the page is scrolled. Nudge it back.
const settleViewport = () => setTimeout(() => { window.scrollBy(0, 1); window.scrollBy(0, -1); }, 60);
document.addEventListener("focusout", (e) => { if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) settleViewport(); });
if (window.visualViewport) { let lastH = visualViewport.height; visualViewport.addEventListener("resize", () => { if (visualViewport.height > lastH + 100) settleViewport(); lastH = visualViewport.height; }); }

/* ---------- when nothing is open ----------
 * Things that wait for a quiet moment: an app update reload, a sign-in or privacy request from the
 * relay, and other carers' new notes arriving while someone is reading or typing.
 */
let pendingReload = false;
setInterval(() => {
  if (appBusy()) return;
  if (pendingReload) { location.reload(); return; }
  if (syncState.blocked) { handleSyncBlocked(); return; }
  if (syncState.redraw && !userIsReading()) { syncState.redraw = false; render(); }
  if (S.pending && S.pending.length && !rec.on && !rec.finishing) resumePending();
}, 3000);
const userIsReading = () => { const a = document.activeElement; return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) || [...document.querySelectorAll("audio")].some((x) => !x.paused); };

/* ---------- the phone's Back button ----------
 * On an installed app, Android's Back closed the whole app (Gavin, Samsung, 2026-10-22): there was no
 * history to go back through. Each open layer (a tab other than Today, a sheet, a full screen) now has one
 * history step, so Back closes the top one, the way its Close button does (a sheet with unsaved work asks
 * "Tap again to discard" first). Back on Today with nothing open still leaves the app.
 */
let histPushed = 0, histIgnore = 0;
const histWanted = () => (session && tab !== "today" ? 1 : 0) + ($("#sheetRoot").innerHTML.trim() ? 1 : 0) + ($("#fullRoot").innerHTML.trim() ? 1 : 0);
function syncHistory() {
  const want = histWanted();
  if (want > histPushed) { for (; histPushed < want; histPushed++) history.pushState({ dn: histPushed + 1 }, "", location.href); }
  else if (want < histPushed) { histIgnore++; history.go(want - histPushed); histPushed = want; } // closed with a button: drop its step
}
window.addEventListener("popstate", () => {
  if (histIgnore) { histIgnore--; return; }
  histPushed = Math.max(0, histPushed - 1); // the phone has already gone back one step
  const full = $("#fullRoot"), sheetOpen = $("#sheetRoot").innerHTML.trim();
  if (full.innerHTML.trim()) { const c = full.querySelector('[id$="Close"]:not(#rpAboutClose)'); if (c) c.click(); else full.innerHTML = ""; }
  else if (sheetOpen) { const c = $("#sheetRoot [data-close]"); if (c) c.click(); }
  else if (session && tab !== "today") go("today");
  setTimeout(syncHistory, 0); // still open (unsaved work, or no way to close it here): keep a step for it
});
new MutationObserver(() => syncHistory()).observe($("#sheetRoot"), { childList: true });
new MutationObserver(() => syncHistory()).observe($("#fullRoot"), { childList: true });

/* ---------- boot ---------- */
// Whatever empties the full-screen area (Close, sign-out, switching client), print and report modes end with it.
new MutationObserver(() => { if (!$("#fullRoot").innerHTML.trim()) document.body.classList.remove("printing-mar", "report-open"); }).observe($("#fullRoot"), { childList: true });
// Starts once this phone's records have been read (normally a fraction of a second).
recStore.ready.then(() => {
if (recStore.failed()) { // records moved to the phone's database, which won't open: never start an empty record
  $("#fullRoot").innerHTML = `<div class="full" role="dialog" aria-modal="true"><div class="wrap" style="display:grid;gap:14px"><h2>Your notes couldn't be opened</h2><p>This phone's storage didn't open. Your notes are still on the phone. Close Dignity Notes fully (swipe it away), then open it again.</p><button class="btn primary block" id="stoRetry">Try again</button></div></div>`;
  $("#stoRetry").onclick = () => location.reload(); return;
}
setTimeout(() => { try { openFromHash(); checkPush(); } catch {} }, 300); // opened from a notification; notifications still signed up
checkStorage().then(() => { if (session && session.client && tab === "today") render(); });
if (session && (session.token || session.local)) {
  if (session.client) { loadUser(); render(); } else render();
  checkLock(); // a shared phone that was locked (or left unused) stays locked after reopening
  if (session.client) setTimeout(checkPronouns, 2500);
  if (session.local || session.privacyAccepted === PRIVACY_VERSION) { if (session.client) checkClient(); else showClients(false); }
  else relay("/me", {}).then((me) => afterSignIn(me.privacyAccepted)).catch((e) => {
    if (!session) return; // sign-in ended: the login screen is already showing
    // No signal: carry on with the notes on this phone rather than asking for the privacy notice again.
    if (/internet|fetch|network|load failed|too long/i.test(e.message)) { if (!session.client) showClients(false); }
    else afterSignIn(false);
  });
}
else { render(); showLogin(); }
});
if ("serviceWorker" in navigator && location.protocol === "https:") {
  // When a new version of the app is published, reload once so nobody keeps running an old copy.
  const hadController = !!navigator.serviceWorker.controller;
  // Reload for the new version only when nothing is open, so a recording or a note being checked is never lost.
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController && !window.__reloaded) { window.__reloaded = true; if (appBusy()) pendingReload = true; else location.reload(); } });
  navigator.serviceWorker.register("sw.js").then((reg) => {
    reg.update().catch(() => {});
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
  }).catch(() => {});
}
