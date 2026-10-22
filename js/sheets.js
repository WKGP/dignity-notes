// Dignity Notes: sheets, carers on duty, outings, appointments and the calendar, reminders, About and Settings.
// Loaded by index.html after app.js, in order; shares its global scope (one app split into files).
"use strict";

/* ---------- sheets ---------- */
function sheet(html, { onClose, guard } = {}) {
  const root = $("#sheetRoot");
  root.innerHTML = `<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
  const close = () => { root.innerHTML = ""; onClose && onClose(); };
  // guard(): true when closing would lose work, so the close button needs a second tap.
  const tryClose = () => { if (guard && guard()) return confirmInline(root.querySelector("[data-close]"), close, "Tap again to discard"); close(); };
  $("#scrim").addEventListener("click", (e) => { if (e.target.id === "scrim" && !(guard && guard())) close(); });
  root.querySelectorAll("[data-close]").forEach((b) => (b.onclick = tryClose));
  const dlg = $(".sheet", root), title = dlg.querySelector("h2, h3");
  if (title) { title.id = title.id || "sheetTitle"; dlg.setAttribute("aria-labelledby", title.id); }
  dlg.tabIndex = -1; setTimeout(() => { if (dlg.isConnected && !dlg.contains(document.activeElement)) dlg.focus(); }, 50);
  dlg.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); tryClose(); } });
  return { root: dlg, close };
}
// Two-tap confirm: the first tap turns the button into "Tap again to discard".
function confirmInline(btn, action, label = "Tap again to confirm") {
  if (!btn || btn.dataset.armed) return action();
  btn.dataset.armed = "1"; const old = btn.innerHTML, oldAria = btn.getAttribute("aria-label"), oldBg = btn.style.background, oldCol = btn.style.color;
  // Dark text on amber, so it reads on any button (orange on purple couldn't be read: Sam, 2026-10-18).
  btn.innerHTML = `<span style="font-size:14px;font-weight:700;white-space:normal">${esc(label)}</span>`;
  btn.style.background = "#ffd27a"; btn.style.color = "#1d1a22";
  if (oldAria !== null) btn.setAttribute("aria-label", label);
  btn.style.width = "auto";
  setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.innerHTML = old; btn.style.width = ""; btn.style.background = oldBg; btn.style.color = oldCol; if (oldAria !== null) btn.setAttribute("aria-label", oldAria); } }, 3000);
}
const sheetHead = (title) => `<div class="sheet-h"><h2>${title}</h2><button class="icon-btn" data-close aria-label="Close">${ICON.close}</button></div>`;

function openCarerSheet() {
  const s = sheet(`${sheetHead("Who's on duty?")}
    <div class="list card">${roster().map((c) => `<button class="item" data-c="${esc(c.id)}" style="border-left:0;border-right:0;border-bottom:0;background:none;text-align:left;width:100%;align-items:center"><span class="avatar">${esc(c.name.charAt(0))}</span><span class="body"><strong>${esc(c.name)}</strong><div class="small muted">${esc(c.shift || "No shift set")}</div></span>${c.id === S.onDuty ? '<span class="chip accent">On duty</span>' : ""}</button>`).join("")}</div>
    <p class="small muted" style="margin:0">Every note is stamped with the carer on duty. Use Handover at the end of a shift to pass on properly. Who cares for ${esc(S.client.name)} is set by an administrator in Manage people.</p>`);
  s.root.querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => {
    // Real accounts: notes are always saved under the person signed in on this phone.
    if (session && !session.local) return toast(b.dataset.c === myId() ? "You're on duty on this phone" : "Each carer signs in on their own phone, so their notes carry their name");
    S.onDuty = b.dataset.c; save(); s.close(); render(); toast(`${onDuty().name} is now on duty`);
  }));
}

function openTransferSheet() {
  const s = sheet(`${sheetHead("Hand over to someone else")}
    <p class="small muted" style="margin:0">Only to a person authorised by the family. ${esc(S.client.name)} will be shown as out of your care until they're back.</p>
    <label class="f">Who is taking ${esc(S.client.name)}?<input type="text" id="trWho" placeholder="Name, e.g. Peter" autocomplete="off"></label>
    <label class="f">Relationship<input type="text" id="trRel" placeholder="e.g. Son, family friend" autocomplete="off"></label>
    <label class="f">Where to<input type="text" id="trWhy" placeholder="e.g. Church" autocomplete="off"></label>
    <button class="btn primary block" id="trSave">Confirm handover at ${fmtTime(Date.now())}</button>`);
  $("#trSave").onclick = () => {
    const who = $("#trWho").value.trim(); if (!who) return toast("Enter who is taking them");
    S.transfers.push({ id: uid(), outTs: Date.now(), withWhom: who, relationship: $("#trRel").value.trim(), purpose: $("#trWhy").value.trim(), carerId: stampId() });
    save(); s.close(); render(); toast(`${S.client.name} is now with ${who}`);
  };
}
function openReturnSheet() {
  const t = activeTransfer(); if (!t) return;
  const s = sheet(`${sheetHead("Back in your care")}
    <p class="small" style="margin:0">${esc(S.client.name)} went out with <strong>${esc(t.withWhom)}</strong> at ${fmtTime(t.outTs)}.</p>
    <label class="f">Anything to note on return? (optional)<input type="text" id="bkNote" placeholder="e.g. Had lunch out, seemed tired" autocomplete="off"></label>
    ${canEditPlan() ? `<label class="small" style="display:flex;gap:8px;align-items:center;min-height:40px"><input type="checkbox" id="bkHosp" ${/hospital|a ?& ?e|\bED\b|emergency department|ambulance|\bward\b|discharge/i.test(t.purpose || "") ? "checked" : ""}> Back from hospital (there may be a new ReSPECT form)</label>` : ""}
    <button class="btn primary block" id="bkSave">Confirm back at ${fmtTime(Date.now())}</button>`);
  $("#bkSave").onclick = () => {
    t.backTs = Date.now(); t.backNote = $("#bkNote").value.trim(); t.backCarerId = stampId(); touch(t); save(); s.close(); render(); toast("Back in your care");
    if ($("#bkHosp", s.root) && $("#bkHosp", s.root).checked) openEmergencyEdit({ why: "<strong>Back from hospital:</strong> a new ReSPECT form is usually given on discharge. Check which form there is now and where it's kept." });
  };
}
function openEventSheet(day = "", after, preset = null, onClose) {
  const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1);
  const pad = (n) => String(n).padStart(2, "0");
  const s = sheet(`${sheetHead(preset ? "Change the appointment" : "Add appointment or plan")}
    ${preset ? `<p class="small muted" style="margin:0">Change what you need and tap Save: the old one shows as cancelled ("moved") in the diary.</p>` : ""}
    <label class="f">What<input type="text" id="evLabel" placeholder="e.g. B12 injection at the surgery" autocomplete="off" value="${esc(preset ? preset.label : "")}"></label>
    <label class="f">Details (optional)<input type="text" id="evDetail" placeholder="e.g. Coming to the house" autocomplete="off" value="${esc(preset ? preset.detail || "" : "")}"></label>
    <div class="row"><label class="f" style="flex:1">Date<input type="date" id="evDay" value="${esc(day || dayKey(new Date()))}" min="${esc(dayKey(new Date()))}" max="${esc(diaryLast())}"></label>
    <label class="f" style="flex:1">Time<input type="text" id="evTime" value="${preset ? fmtTime(preset.when) : `${pad(d.getHours())}:00`}" inputmode="numeric" placeholder="e.g. 14:30 or 1430" aria-describedby="evTimeHelp"><span class="tiny muted" id="evTimeHelp">Type 11, 1130 or 11:30</span></label></div>
    <div class="small muted" id="evSame" role="status"></div>
    <fieldset style="border:0;padding:0;margin:0;display:grid;gap:4px"><legend class="small" style="font-weight:600;margin-bottom:4px">Remind</legend>
      ${REMIND_OPTS.map(([m, l]) => `<label class="check"><input type="checkbox" data-rem="${m}" ${(preset ? String(preset.remind || "").split(",") : ["60"]).includes(String(m)) ? "checked" : ""}><span>${l}</span></label>`).join("")}</fieldset>
    <label class="f">Who gets the reminders<select id="evWho"><option value="all">Everyone caring for ${esc(S.client.name)}</option><option value="me" ${preset && preset.remindWho === "me" ? "selected" : ""}>Just me</option></select></label>
    ${preset ? (preset.seriesId ? `<p class="tiny muted" style="margin:0">This changes only this one; the others in the series stay as they are.</p>` : "") : `<div class="row" style="gap:8px"><label class="f" style="flex:1">Repeats<select id="evRep">${Object.entries(REPEATS).map(([k, r]) => `<option value="${k}">${r.label}</option>`).join("")}</select></label>
      <label class="f" style="flex:1" id="evUntilBox" hidden>Until<input type="date" id="evUntil" min="${esc(dayKey(new Date()))}" max="${esc(diaryLast())}"></label></div>`}
    <p class="tiny muted" style="margin:0">Reminders pop up in the app, and come as a phone notification if notifications are on (Settings). The notification never says what the appointment is.</p>
    <button class="btn primary block" id="evSave">${preset ? "Save the change" : "Add"}</button>`, onClose ? { onClose: () => { if (!saved) onClose(); } } : {});
  let saved = false;
  // What else is on that day, so it's easy to see whether it fits.
  const same = () => { const k = $("#evDay").value, l = liveAppts().filter((e) => dayKey(new Date(e.when)) === k && (!preset || e.id !== preset.id)).sort((x, y) => x.when - y.when); $("#evSame").textContent = k ? (l.length ? `Already on that day: ${l.map((e) => `${fmtTime(e.when)} ${e.label}`).join("; ")}` : "Nothing else on that day.") : ""; };
  $("#evDay").onchange = same; same();
  if ($("#evRep")) $("#evRep").onchange = (e) => { const on = e.target.value !== "none"; $("#evUntilBox").hidden = !on; if (on && !$("#evUntil").value) { const u = new Date(($("#evDay").value || dayKey(new Date())) + "T12:00:00"); u.setMonth(u.getMonth() + 3); $("#evUntil").value = dayKey(u); } };
  $("#evSave").onclick = () => {
    const label = $("#evLabel").value.trim(); const m = parseClock($("#evTime").value), k = $("#evDay").value;
    if (!label) return toast("Enter what it is"); if (!k) return toast("Choose the date"); if (!m) return toast("Type the time like 11, 1130 or 11:30");
    const w = new Date(k + "T00:00:00"); w.setHours(+m[1], +m[2], 0, 0); // that calendar day, so a clock change doesn't move it by an hour
    if (w.getTime() < Date.now() - 60000) return toast(`${pad(m[1])}:${pad(m[2])} on that day has already passed. Check the time or the date.`);
    if (k > diaryLast()) return toast("Choose a date within the next two years");
    const remind = [...s.root.querySelectorAll("[data-rem]")].filter((c) => c.checked).map((c) => c.dataset.rem).join(",");
    const base = { label, detail: $("#evDetail").value.trim(), by: stampId(), remindWho: $("#evWho").value, ...(remind ? { remind } : {}) };
    // A repeating appointment is one entry per date (each can be changed or cancelled on its own).
    const rep = $("#evRep") ? REPEATS[$("#evRep").value] : REPEATS.none, dates = [w];
    if (rep.step) {
      const until = $("#evUntil").value; if (!until) return toast("Choose when it stops repeating");
      if (until < k) return toast("The Until date is before the first appointment"); if (until > diaryLast()) return toast("Choose an Until date within the next two years");
      const end = new Date(until + "T23:59:59");
      for (let i = 1; ; i++) { const n = rep.step(new Date(w), i); if (n > end) break; dates.push(n); if (dates.length > 120) return toast("That's more than 120 appointments: choose an earlier Until date"); }
    }
    const seriesId = dates.length > 1 ? uid() : "";
    const recs = dates.map((d) => ({ id: uid(), ts: Date.now(), when: d.getTime(), ...base, ...(seriesId ? { seriesId, repeat: `${rep.label}, until ${fmtDay(dates[dates.length - 1].getTime())}`.slice(0, 60) } : {}) }));
    S.schedule.push(...recs);
    saved = true; save(); s.close(); render(); toast(`${preset ? "Changed to" : "Added"}: ${label}, ${dayLabel(w.getTime())} at ${pad(m[1])}:${pad(m[2])}${recs.length > 1 ? ` (and ${recs.length - 1} more, ${rep.label.toLowerCase()})` : ""}`);
    if (after) after(recs[0]);
  };
}

// The calendar (Gavin, 2026-10-21, after Google Calendar): a month grid with each day's appointments
// named inside it; tap a day to see its appointments listed underneath (and add one on that day); tap an
// appointment to see it, change it or cancel it. List shows everything coming up, day by day. Swipe the
// month sideways, or use ‹ › and Today. Moving around inside it keeps the scroll and focus where they were.
let calView = "month", calDay = "";
function openCalendar(month, day, focus) {
  const now = new Date(), today = dayKey(now);
  calDay = day || (month && month !== today.slice(0, 7) ? month + "-01" : today);
  if (!day && !month) calView = "month"; // a fresh open: this month, today
  const first = new Date(calDay.slice(0, 7) + "-01T12:00:00");
  const y = first.getFullYear(), mo = first.getMonth(), days = new Date(y, mo + 1, 0).getDate(), lead = (first.getDay() + 6) % 7; // Monday first
  const key = (d) => dayKey(new Date(y, mo, d, 12)), byDay = new Map();
  for (const e of liveAppts()) { const k = dayKey(new Date(e.when)); byDay.set(k, [...(byDay.get(k) || []), e]); }
  for (const l of byDay.values()) l.sort((a, b) => a.when - b.when);
  const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const back = () => openCalendar(undefined, calDay); // where a closed appointment (or an unsaved change) returns to
  const canAdd = (k) => !isFamily() && k >= today && k <= diaryLast();
  const icons = (e) => `${e.seriesId ? " ↻" : ""}${e.remind ? " 🔔" : ""}`;
  const item = (e) => `<button class="cal-item${e.cancelledTs ? " off" : ""}" data-calappt="${esc(e.id)}"><span class="cal-when">${fmtTime(e.when)}</span><span style="display:grid;gap:2px;min-width:0"><strong>${esc(e.label)}${icons(e)}</strong>${e.detail ? `<span class="small muted">${esc(e.detail)}</span>` : ""}${e.cancelledTs ? `<span class="small muted">Cancelled${e.cancelReason ? `: ${esc(e.cancelReason)}` : ""}</span>` : ""}</span></button>`;
  const dayName = (k) => new Date(k + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  let body;
  if (calView === "list") {
    // Everything from today, a day at a time (cancelled ones left out here; they stay in the day view).
    const all = liveAppts().filter((e) => e.when >= new Date(today + "T00:00:00").getTime()).sort((a, b) => a.when - b.when), ahead = all.slice(0, 100), groups = new Map();
    for (const e of ahead) { const k = dayKey(new Date(e.when)); groups.set(k, [...(groups.get(k) || []), e]); }
    let lastMonth = "";
    body = groups.size ? `<div style="display:grid;gap:8px">${[...groups].map(([k, l]) => { const m = k.slice(0, 7), mh = m !== lastMonth ? `<h3 style="margin:10px 0 0;font-size:16px">${esc(new Date(k + "T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" }))}</h3>` : ""; lastMonth = m; return `${mh}<p class="cal-dayh">${esc(dayName(k))}${k === today ? " · Today" : ""}</p>${l.map(item).join("")}`; }).join("")}${all.length > ahead.length ? `<p class="small muted" style="margin:0">Showing the next 100. Use Month to see later ones.</p>` : ""}</div>`
      : `<p class="small muted" style="margin:0">Nothing coming up.</p>`;
  } else {
    const sel = S.schedule.filter((e) => !isExample(e) && dayKey(new Date(e.when)) === calDay).sort((a, b) => a.when - b.when);
    body = `<div class="cal-grid" id="caGrid">
      ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="cal-dow" aria-hidden="true">${d}</div>`).join("")}
      ${Array(lead).fill("<div></div>").join("")}
      ${Array.from({ length: days }, (_, i) => { const k = key(i + 1), list = byDay.get(k) || [];
        return `<button class="cal-day${k === today ? " today" : ""}${k < today ? " past" : ""}" data-cday="${k}" aria-pressed="${k === calDay}" aria-label="${esc(dayName(k))}${list.length ? `: ${esc(list.map((e) => `${fmtTime(e.when)} ${e.label}`).join(", "))}` : ", nothing on"}"><span class="cal-num">${i + 1}</span>${list.slice(0, 2).map((e) => `<span class="cal-chip">${esc(e.label)}</span>`).join("")}${list.length > 2 ? `<span class="cal-more">+${list.length - 2} more</span>` : ""}</button>`; }).join("")}
    </div>
    <div style="display:grid;gap:8px" id="caDayList">
      <p class="cal-dayh" style="margin-top:4px">${esc(dayName(calDay))}${calDay === today ? " · Today" : ""}</p>
      ${sel.length ? sel.map(item).join("") : `<p class="small muted" style="margin:0">Nothing on this day.</p>`}
      <div style="display:flex;gap:16px;flex-wrap:wrap">${canAdd(calDay) ? `<button class="link" id="caAddDay" style="min-height:44px">+ Add on this day</button>` : ""}<button class="link" id="caDiary" style="min-height:44px">Open this day in the diary</button></div>
    </div>`;
  }
  const was = $("#sheetRoot .sheet[data-cal]"), top = was ? was.scrollTop : 0;
  const s = sheet(`${sheetHead("Calendar")}
    <div class="seg" role="group" aria-label="Calendar view"><button data-cview="month" aria-pressed="${calView === "month"}">Month</button><button data-cview="list" aria-pressed="${calView === "list"}">List</button></div>
    ${calView === "month" ? `<div style="display:flex;align-items:center;gap:8px"><button class="btn ghost cal-nav" id="caPrev" aria-label="Previous month">‹</button><strong style="flex:1;text-align:center" id="caMonth">${esc(first.toLocaleDateString("en-GB", { month: "long", year: "numeric" }))}</strong><button class="btn ghost cal-nav" id="caToday">Today</button><button class="btn ghost cal-nav" id="caNext" aria-label="Next month">›</button></div>` : ""}
    ${body}
    ${isFamily() ? "" : `<button class="btn secondary block" id="caAdd">+ Add appointment or plan</button>`}`);
  // Moving around inside the calendar: no slide-in again, same scroll, focus back on the control used,
  // and a screen reader hears what changed. A chosen day's list is scrolled into view.
  s.root.dataset.cal = "1";
  if (was) { s.root.style.animation = "none"; s.root.scrollTop = top; }
  if (focus) { const f = $(focus, s.root); if (f) f.focus({ preventScroll: true }); }
  if (was) $("#srSay").textContent = calView === "list" ? "Appointments coming up" : focus && focus.startsWith("[data-cday") ? `${dayName(calDay)}: ${(byDay.get(calDay) || []).length || "nothing"} on` : $("#caMonth", s.root).textContent;
  if (was && focus && focus.startsWith("[data-cday") && $("#caDayList", s.root)) $("#caDayList", s.root).scrollIntoView({ block: "nearest" });
  const month2 = (n, f) => openCalendar(undefined, ym(new Date(y, mo + n, 1)) + "-01", f);
  s.root.querySelectorAll("[data-cview]").forEach((b) => (b.onclick = () => { calView = b.dataset.cview; openCalendar(undefined, calDay, `[data-cview="${calView}"]`); }));
  if ($("#caPrev", s.root)) { $("#caPrev", s.root).onclick = () => month2(-1, "#caPrev"); $("#caNext", s.root).onclick = () => month2(1, "#caNext"); $("#caToday", s.root).onclick = () => openCalendar(undefined, today, "#caToday"); }
  s.root.querySelectorAll("[data-cday]").forEach((b) => (b.onclick = () => openCalendar(undefined, b.dataset.cday, `[data-cday="${b.dataset.cday}"]`)));
  s.root.querySelectorAll("[data-calappt]").forEach((b) => (b.onclick = () => openAppt(b.dataset.calappt, back)));
  const addOn = (k) => openEventSheet(k, (rec) => openCalendar(undefined, dayKey(new Date(rec.when))), null, back);
  if ($("#caAddDay", s.root)) $("#caAddDay", s.root).onclick = () => addOn(calDay);
  if ($("#caAdd", s.root)) $("#caAdd", s.root).onclick = () => addOn(canAdd(calDay) ? calDay : "");
  if ($("#caDiary", s.root)) $("#caDiary", s.root).onclick = () => { s.close(); logDay = calDay; go("log"); };
  // Swipe the month sideways, like turning a paper calendar's page.
  const grid = $("#caGrid", s.root); let x0 = null, y0 = 0;
  if (grid) {
    grid.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    grid.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null; if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) month2(dx < 0 ? 1 : -1, "#caMonth"); });
  }
}
const REMIND_OPTS = [[0, "At the time"], [15, "15 minutes before"], [60, "1 hour before"], [120, "2 hours before"], [1440, "The day before (24 hours)"], [2880, "2 days before"], [10080, "A week before"]];
// How a repeating appointment steps: from the first date, the i-th repeat (a month keeps the same date,
// or the month's last day when it's shorter).
const REPEATS = {
  none: { label: "Doesn't repeat" },
  daily: { label: "Every day", step: (d, i) => (d.setDate(d.getDate() + i), d) },
  weekly: { label: "Every week", step: (d, i) => (d.setDate(d.getDate() + 7 * i), d) },
  fortnightly: { label: "Every 2 weeks", step: (d, i) => (d.setDate(d.getDate() + 14 * i), d) },
  four: { label: "Every 4 weeks", step: (d, i) => (d.setDate(d.getDate() + 28 * i), d) },
  monthly: { label: "Every month", step: (d, i) => { const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + i); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return d; } },
};
// Reminders pop up in the app when they're due (and come as phone notifications from the relay).
// Each shows once on this phone; "just me" reminders only for the person who added the appointment.
const REM_SEEN = () => "dignitynotes.remseen." + (session ? session.username : "");
function dueReminders() {
  let seen = {}; try { seen = JSON.parse(localStorage.getItem(REM_SEEN()) || "{}"); } catch {}
  const now = Date.now();
  return liveAppts().filter((e) => e.remind && (e.remindWho !== "me" || e.by === stampId())).flatMap((e) => String(e.remind).split(",").map(Number).filter((m) => Number.isFinite(m) && m >= 0).map((m) => ({ e, m, due: e.when - m * 60000 })))
    .filter((x) => x.due <= now && x.due > now - 12 * 36e5 && x.e.when > now - 36e5 && !seen[x.e.id + ":" + x.m]);
}
function checkReminders() {
  if (!session || !S || !S.schedule || isFamily() || appBusy() || document.visibilityState !== "visible") return;
  const due = dueReminders(); if (!due.length) return;
  let seen = {}; try { seen = JSON.parse(localStorage.getItem(REM_SEEN()) || "{}"); } catch {}
  for (const x of due) seen[x.e.id + ":" + x.m] = Date.now();
  for (const k of Object.keys(seen)) if (Date.now() - seen[k] > 30 * 864e5) delete seen[k]; // forget old ones
  try { localStorage.setItem(REM_SEEN(), JSON.stringify(seen)); } catch {}
  const events = [...new Map(due.map((x) => [x.e.id, x.e])).values()].sort((a, b) => a.when - b.when);
  const inWords = (t) => { const mins = Math.round((t - Date.now()) / 60000); return mins <= 0 ? "now" : mins < 60 ? `in ${mins} minutes` : mins < 1440 ? `in ${Math.round(mins / 60)} hour${Math.round(mins / 60) === 1 ? "" : "s"}` : `in ${Math.round(mins / 1440)} day${Math.round(mins / 1440) === 1 ? "" : "s"}`; };
  const s = sheet(`${sheetHead("Reminder")}${events.map((e) => `<div class="card" style="box-shadow:none;padding:10px 12px;display:grid;gap:4px"><strong>${esc(e.label)}</strong><span class="small">${esc(fmtDay(e.when))} ${fmtTime(e.when)} · ${inWords(e.when)}</span>${e.detail ? `<span class="small muted">${esc(e.detail)}</span>` : ""}<button class="link small" data-remday="${esc(dayKey(new Date(e.when)))}" style="justify-self:start;min-height:40px">Open that day in the diary</button></div>`).join("")}
    <button class="btn primary block" data-close>OK</button>`);
  s.root.querySelectorAll("[data-remday]").forEach((b) => (b.onclick = () => { s.close(); logDay = b.dataset.remday; go("log"); }));
}
setInterval(checkReminders, 30000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") setTimeout(checkReminders, 1500); });
// Appointments not cancelled (examples left out).
const liveAppts = () => S.schedule.filter((e) => !isExample(e) && !e.cancelledTs);
// One appointment: change it (cancel this one, add the new one) or cancel it (Sam, 2026-10-21). The
// original stays in the record, shown as cancelled, with who cancelled it and when.
function openAppt(id, back) {
  const e = S.schedule.find((x) => x.id === id); if (!e) return;
  const s = sheet(`${sheetHead(esc(e.label))}
    <p class="small" style="margin:0"><strong>${esc(fmtDay(e.when))} ${fmtTime(e.when)}</strong>${e.detail ? ` · ${esc(e.detail)}` : ""}</p>
    ${e.by && roster().some((c) => c.id === e.by) ? `<p class="tiny muted" style="margin:0">Added by ${esc(carer(e.by).name)}</p>` : ""}
    ${e.repeat ? `<p class="small" style="margin:0">Repeats: ${esc(e.repeat)}</p>` : ""}
    <p class="small" style="margin:0">Reminders: ${e.remind ? esc(String(e.remind).split(",").map((m) => (REMIND_OPTS.find(([k]) => String(k) === m) || [0, m + " minutes before"])[1].toLowerCase()).join(", ")) + (e.remindWho === "me" ? " (just the person who added it)" : " (everyone caring for " + esc(S.client.name) + ")") : "none"}</p>
    ${e.cancelledTs ? `<div class="warn small">Cancelled ${esc(dayLabel(e.cancelledTs).toLowerCase())} ${fmtTime(e.cancelledTs)}${e.cancelledBy && roster().some((c) => c.id === e.cancelledBy) ? ` by ${esc(carer(e.cancelledBy).name)}` : ""}${e.cancelReason ? `: ${esc(e.cancelReason)}` : ""}</div>`
      : isFamily() || isExample(e) ? "" : `<button class="btn secondary block" id="apChange">Change the date, time or details</button>
      <label class="f">Why it's cancelled (optional)<input type="text" id="apWhy" maxlength="200" placeholder="e.g. Surgery rang to cancel" autocomplete="off"></label>
      ${e.seriesId ? `<label class="check"><input type="checkbox" id="apLater"><span>Also cancel the later ones in this series</span></label>` : ""}
      <button class="btn ghost block" id="apCancel">Cancel the appointment</button>`}`, back ? { onClose: back } : {});
  const cancel = (why) => { const cur = S.schedule.find((x) => x.id === id); if (!cur || cur.cancelledTs) return; Object.assign(cur, { cancelledTs: Date.now(), cancelledBy: stampId(), ...(why ? { cancelReason: why.slice(0, 200) } : {}) }); touch(cur); save(); };
  if ($("#apChange", s.root)) $("#apChange", s.root).onclick = () => openEventSheet(dayKey(new Date(Math.max(e.when, Date.now()))), (rec) => { cancel(`Moved to ${fmtDay(rec.when)} ${fmtTime(rec.when)}`); render(); if (back) openCalendar(undefined, dayKey(new Date(rec.when))); }, e, back); // replaces this sheet
  if ($("#apCancel", s.root)) $("#apCancel", s.root).onclick = (ev) => confirmInline(ev.currentTarget, () => {
    const why = $("#apWhy", s.root).value.trim(), later = $("#apLater", s.root) && $("#apLater", s.root).checked;
    const ids = later ? S.schedule.filter((x) => x.seriesId === e.seriesId && x.when >= e.when && !x.cancelledTs).map((x) => x.id) : [id];
    for (const x of ids) { const cur = S.schedule.find((y) => y.id === x); if (cur && !cur.cancelledTs) { Object.assign(cur, { cancelledTs: Date.now(), cancelledBy: stampId(), ...(why ? { cancelReason: why.slice(0, 200) } : {}) }); touch(cur); } }
    save(); s.close(); render(); toast(ids.length > 1 ? `Cancelled ${ids.length} appointments` : "Cancelled");
  }, "Tap again to cancel it");
}
document.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest("[data-appt]"); if (b) openAppt(b.dataset.appt); });
// A time typed on a phone keypad (no ":" on an iPhone number pad): 11, 930, 1130, 11.30, 11:30, 2pm, 2.30pm.
// 1 to 6 on their own mean the afternoon (3 = 15:00); type 03:00 for the early morning.
function parseClock(v) {
  const t = String(v || "").trim().toLowerCase().replace(/\s+/g, "");
  let m = t.match(/^(\d{1,2})(?:[:.h]?(\d{2}))?(am|pm)?$/) || t.match(/^(\d)(\d{2})(am|pm)?$/);
  if (!m) return null;
  let h = +m[1]; const min = m[2] ? +m[2] : 0;
  if (m[3] && (h === 0 || h > 12)) return null; // "0pm", "13pm"
  if (m[3] === "pm" && h < 12) h += 12; if (m[3] === "am" && h === 12) h = 0;
  // A bare 1 to 6 (no am/pm, no leading 0) is an afternoon appointment: "3" means 15:00.
  if (!m[3] && h >= 1 && h <= 6 && !t.startsWith("0")) h += 12;
  if (h > 23 || min > 59) return null;
  return [null, h, min];
}

// App version comes from package.json (bumped on every commit); the relay reports its own on /health.
// The version this copy of the app was opened as (Check for updates compares the published one with it).
let loadedVersion = "";
const latestVersion = async () => (await (await fetch("package.json", { cache: "no-store" })).json()).version || "";
latestVersion().then((v) => { loadedVersion = v; }).catch(() => {});
// Check for updates (Gavin, 2026-10-22): asks for the newest version now, instead of waiting for the next
// time the app is opened, and reloads into it.
async function checkForUpdates(btn) {
  const say = (t) => { const el = $("#abUpd"); if (el) el.textContent = t; };
  btn.disabled = true; say("Checking…");
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) await reg.update().catch(() => {});
    const v = await latestVersion();
    if (loadedVersion && v && v !== loadedVersion) { say(`Updating to ${v}…`); setTimeout(() => location.reload(), 800); return; }
    say(`You have the latest version${v ? ` (${v})` : ""}.`);
  } catch { say("Couldn't check: no signal. Try again when you're online."); }
  btn.disabled = false;
}
// What's new, inside the app with a Close button (opened as a page, it had no way back on an installed
// iPhone app: Gavin, 2026-10-22).
async function openWhatsNew(back) {
  const s = sheet(`${sheetHead("What's new")}<div id="wnBody" class="small" style="display:grid;gap:6px"><div class="recorder"><div class="spinner"></div></div></div><button class="btn primary block" data-close>Close</button>`, back ? { onClose: back } : {});
  let md = "";
  try { md = await (await fetch("CHANGELOG.md", { cache: "no-cache" })).text(); } catch {}
  const body = $("#wnBody", s.root); if (!body) return;
  if (!md) { body.innerHTML = `<p class="muted" style="margin:0">Couldn't load it: no signal. Try again when you're online.</p>`; return; }
  const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  body.innerHTML = md.split(/\r?\n/).filter((l) => l.trim() && !/^# /.test(l)).map((l) => /^#{2,3} /.test(l) ? `<h3 style="margin:8px 0 0;font-size:16px">${inline(l.replace(/^#+ /, ""))}</h3>` : /^\s*[-*] /.test(l) ? `<p style="margin:0;padding-left:14px;text-indent:-10px">• ${inline(l.replace(/^\s*[-*] /, ""))}</p>` : `<p style="margin:0">${inline(l)}</p>`).join("");
}
async function showVersions(root) {
  const set = (id, v) => { const el = root.querySelector(id); if (el) el.textContent = v; };
  let app = loadedVersion, relayV = "";
  if (!app) try { app = await latestVersion(); } catch {}
  set("#abApp", app || "unknown (offline)");
  try { if (relayBase()) relayV = (await (await fetch(relayBase() + "/health", { cache: "no-store" })).json()).version || ""; } catch {}
  set("#abRelay", relayV || (relayBase() ? "unknown (offline)" : "not connected"));
  if (app && relayV && app !== relayV) set("#abMatch", "The app and server versions differ. Close and reopen the app; if it persists, tell your administrator.");
}

// Long menus on a phone: every section after the first becomes a row that opens in place.
function foldSections(root, skip = 1) {
  const cards = [...root.querySelectorAll(".card")].filter((c) => c.firstElementChild && c.firstElementChild.tagName === "H3" && !c.parentElement.closest(".card"));
  cards.slice(skip).forEach((c) => {
    const d = document.createElement("details"); d.className = "card fold";
    const sm = document.createElement("summary"); sm.innerHTML = `<span>${esc(c.firstElementChild.textContent)}</span>${ICON.chev}`;
    c.firstElementChild.remove();
    const b = document.createElement("div"); c.classList.remove("card"); b.className = ("fold-b " + c.className).trim();
    while (c.firstChild) b.appendChild(c.firstChild);
    d.append(sm, b); c.replaceWith(d);
  });
}
function openSettings() {
  const c = S.consent;
  const s = sheet(`${sheetHead("Settings")}
    <div class="card" style="display:grid;gap:12px"><h3 style="font-size:17px">Your account</h3>
      <p class="small" style="margin:0">Signed in as <strong>${esc(session.name)}</strong> <span class="muted">(${esc(session.username)} · ${session.role === "admin" ? "Administrator" : session.role === "family" ? "Family" : "Carer"})</span></p>
      ${session.role === "admin" ? '<button class="btn primary" id="stTesters">Manage people</button>' : ""}
      <button class="btn secondary" id="stTest">Check AI connection</button><div class="small" id="stMsg"></div>
      ${session.local || session.role === "family" ? "" : '<button class="btn secondary" id="stTrain">Medicines training</button>'}
      ${session.local || session.role === "family" ? "" : `<button class="btn secondary" id="stPron">How notes refer to you${session.pronounsAsked ? ` (${esc(session.pronouns || "your name")})` : ""}</button>`}
      ${session.local ? "" : '<button class="btn secondary" id="stPw">Change my password</button><div id="stPush"></div>'}
      ${isSharedPhone() ? '<button class="btn primary" id="stShSwitch">Switch carer</button>' : ""}
      ${storageState.installed ? "" : '<button class="btn secondary" id="stInstall">Install app on this phone</button><div class="small" id="stInstallMsg"></div>'}
      <button class="btn ghost" id="stOut">Sign out</button></div>
    ${!session.local && session.role === "admin" && session.client ? `<div class="card" style="display:grid;gap:12px"><h3 style="font-size:17px">This phone</h3>
      ${isSharedPhone() ? `<p class="small" style="margin:0">This is <strong>${esc(S.client.name)}</strong>'s shared phone. It opens only ${esc(S.client.name)}, carers switch with their own password, and it locks when it isn't used.</p>
        <label class="f">Lock after<select id="stShLock">${[5, 15, 30].map((n) => `<option value="${n}" ${n === (Number(session.shared.lockMins) || 15) ? "selected" : ""}>${n} minutes unused</option>`).join("")}</select></label>
        <button class="btn ghost" id="stShOff">Stop being ${esc(S.client.name)}'s shared phone</button>`
      : `<p class="small" style="margin:0">If this phone stays at ${esc(S.client.name)}'s home for all the carers to use, make it the shared phone: it opens only ${esc(S.client.name)}, doesn't count as anyone's own device, has Switch carer, and locks after 15 minutes unused.</p>
        <button class="btn secondary" id="stShOn">Make this ${esc(S.client.name)}'s shared phone</button>`}
      ${(session.client.shared || []).length ? `<div class="small"><strong>Shared phones for ${esc(S.client.name)}</strong>${session.client.shared.map((x) => `<div class="row" style="justify-content:space-between;align-items:center;gap:8px;margin-top:6px"><span>${esc(x.label)} <span class="muted">· set up ${esc(dayLabel(x.setAt).toLowerCase())} by ${esc(x.setBy)}</span></span><button class="link small" data-shrm="${esc(x.key)}">Stop</button></div>`).join("")}</div>` : ""}</div>` : ""}
    <div class="card" style="display:grid;gap:12px"><h3 style="font-size:17px">Client</h3>
      <p class="small" style="margin:0">Notes are for <strong>${esc(S.client.name)}</strong>.</p>
      <label class="f">Where the care is<select id="stCountry" ${session.role === "admin" && !session.local ? "" : "disabled"}><option value="UK" ${clientCountry() === "UK" ? "selected" : ""}>United Kingdom</option><option value="AU" ${clientCountry() === "AU" ? "selected" : ""}>Australia</option></select></label>
      <label class="f">How notes refer to ${esc(S.client.name)}<select id="stCPron" ${session.role === "admin" && !session.local ? "" : "disabled"}>${[["", `By name (${S.client.name})`], ["he/him", "He / him"], ["she/her", "She / her"], ["they/them", "They / them"]].map(([v, l]) => `<option value="${esc(v)}" ${(session.client.pronouns || "") === v ? "selected" : ""}>${esc(l)}</option>`).join("")}${session.client.pronouns && !["he/him", "she/her", "they/them"].includes(session.client.pronouns) ? `<option value="${esc(session.client.pronouns)}" selected>${esc(session.client.pronouns)}</option>` : ""}<option value="other">Something else…</option></select></label>
      <p class="tiny muted" style="margin:-6px 0 0">Sets the emergency numbers and contacts under Who to tell, the agreement wording, and the spelling the AI uses.${session.role === "admin" ? "" : " An administrator can change it."}</p>
      <label class="f">How the care is arranged<select id="stCare" ${session.role === "admin" && !session.local ? "" : "disabled"}><option value="private" ${isAgency() ? "" : "selected"}>Private: the family employs the carers</option><option value="agency" ${isAgency() ? "selected" : ""}>Agency: a care agency provides the carers</option></select></label>
      <p class="tiny muted" style="margin:-6px 0 0">For an agency, an administrator reviews each incident report and records whether a statutory notification is needed.</p>
      <label class="f">Ask carers to catch up after this many days away<input type="number" id="stCatch" min="1" max="60" inputmode="numeric" value="${esc(session.client.catchupDays || 7)}" ${session.role === "admin" && !session.local ? "" : "disabled"}></label>
      ${isSharedPhone() ? "" : '<button class="btn secondary" id="stSwitch">Switch or add client</button>'}</div>
    <div class="card" style="display:grid;gap:12px"><h3 style="font-size:17px">Carers for ${esc(S.client.name)}</h3>
      ${roster().filter((x) => !x.notOnRoster).map((x) => `<label class="f">${esc(x.name)}<input type="text" data-cs="${esc(x.id)}" data-was="${esc(x.shift)}" value="${esc(x.shift)}" placeholder="Shift, e.g. Day · 08:00–20:00" maxlength="40" autocomplete="off">${x.shift && !shiftRange(x.shift) ? '<span class="tiny" style="color:var(--follow)">Add the times, like 04:00–13:30, so the app can tell who is on shift.</span>' : ""}</label>`).join("") || `<p class="small muted" style="margin:0">No carers are on ${esc(S.client.name)} yet.</p>`}
      ${roster().some((x) => x.notOnRoster) ? `<p class="tiny muted" style="margin:0">You're not one of ${esc(S.client.name)}'s carers, so you aren't listed here.</p>` : ""}
      ${roster().some((x) => !x.notOnRoster) ? '<button class="btn secondary" id="stPeople">Save shifts</button>' : ""}
      ${session.role === "admin" ? `<button class="link" id="stWho" style="justify-self:start">Change who cares for ${esc(S.client.name)}</button>` : `<p class="tiny muted" style="margin:0">An administrator decides who cares for ${esc(S.client.name)}.</p>`}</div>
    <div class="card small"><h3 style="font-size:17px;margin-bottom:6px">Consent</h3>
      <p style="margin:0">${c ? `Agreed by <strong>${esc(c.name)}</strong> (${esc(c.role)}) on ${fmtDay(c.ts)} at ${fmtTime(c.ts)}.` : "Not recorded."}</p>
      <p class="muted" style="margin:8px 0 0">Notes and recordings are saved on this phone and copied to the cloud (in the EU) for this client's carers and the pilot administrators. Only the words of a note (never the recording) are sent to the AI to tidy. If the phone can't turn speech into words, the recording is sent through the relay to Cloudflare's speech-to-text service to work out the words.</p></div>
    <div class="card" style="display:grid;gap:10px"><h3 style="font-size:17px">Demo data</h3>
      <p class="small muted" style="margin:0">Start again with the example day on this phone. Notes already copied to the cloud come back from there.</p>
      <button class="btn ghost" id="stReset">Reset demo</button><button class="btn danger" id="stResetYes" hidden>Yes, delete everything</button></div>
    <div class="card" style="display:grid;gap:10px"><h3 style="font-size:17px">My words</h3>
      <p class="small muted" style="margin:0">Misheard words you've chosen to remember. They're fixed automatically on your next recordings. Saved on this phone only.</p>
      <div class="list" id="stDict"></div></div>
    <div class="card" style="display:grid;gap:10px"><h3 style="font-size:17px">Your accent</h3>
      <label class="f">The phone turns your speech into words more accurately when it knows your accent<select id="stAccent">${ACCENTS.map(([c, n]) => `<option value="${c}" ${c === speechLang() ? "selected" : ""}>English (${n})</option>`).join("")}</select></label>
      <p class="tiny muted" style="margin:0">${session.local ? "Saved on this phone only." : "Saved on your account, so it follows you to any phone you sign in on."}</p>
      ${session.local || isFamily() || !cloudOn() ? "" : `<button class="btn secondary" id="stVoice">Voice set-up (about 2 minutes)</button><p class="tiny muted" style="margin:-4px 0 0">${voiceSetupState() && voiceSetupState().done ? `Done ${esc(dayLabel(voiceSetupState().done).toLowerCase())}. Do it again any time, for example for a new client's name.` : "Read a few sentences so the app learns the words it mishears in your voice."}</p>`}</div>
    <button class="btn ghost" id="stPrivacy">Read the privacy notice</button>
    <div class="card small" style="display:grid;gap:6px"><h3 style="font-size:17px">About</h3>
      <div>App version <strong id="abApp">checking…</strong></div>
      <div>Server (relay) version <strong id="abRelay">checking…</strong></div>
      <div>Privacy notice version <strong>${esc(PRIVACY_VERSION)}</strong></div>
      <div>Cloud copy: <strong>${esc(cloudStatus())}</strong></div>
      <div>Notes on this phone: <strong>${storageState.privateLikely ? "may be deleted (private tab)" : storageState.installed || storageState.persisted ? "kept permanently" : "may be cleared by the browser"}</strong></div>
      <div class="muted" id="abMatch"></div>
      <button class="btn secondary" id="abCheck" style="justify-self:start">Check for updates</button><div class="muted" id="abUpd" role="status"></div>
      <button class="link" id="abNew" style="justify-self:start;min-height:44px">What's new</button>
      <p class="tiny muted" style="margin:4px 0 0">Dignity Notes pilot · fictional test use only<br>${COPYRIGHT}</p></div>`);
  foldSections(s.root);
  showVersions(s.root);
  $("#abCheck", s.root).onclick = (e) => checkForUpdates(e.currentTarget);
  $("#abNew", s.root).onclick = () => openWhatsNew(openSettings);
  $("#stPrivacy").onclick = () => { s.close(); viewPrivacy(); };
  const drawDict = () => {
    const d = loadDict(); const keys = Object.keys(d).sort((a, b) => d[b].t - d[a].t);
    $("#stDict", s.root).innerHTML = keys.length ? keys.map((k) => `<div class="item" style="align-items:center"><div class="body small"><strong>${esc(k)}</strong> → ${esc(d[k].to)} <span class="muted tiny">${d[k].used ? `· used ${d[k].used} time${d[k].used > 1 ? "s" : ""}` : ""}</span></div><button class="link small" style="color:var(--record)" data-forget="${esc(k)}">Remove</button></div>`).join("")
      : '<div class="empty">No words yet. Fix a misheard word on the "Check before saving" screen and choose to remember it.</div>';
    $("#stDict", s.root).querySelectorAll("[data-forget]").forEach((b) => (b.onclick = () => { forgetWord(b.dataset.forget); drawDict(); toast("Removed"); }));
  };
  drawDict();
  if ($("#stVoice")) $("#stVoice").onclick = () => { s.close(); openVoiceSetup(); };
  $("#stAccent").onchange = (e) => { setSpeechLang(e.target.value); toast("Accent saved. It follows you to any phone you sign in on."); };
  $("#stTest").onclick = async () => {
    const m = $("#stMsg"); m.textContent = "Checking…"; m.style.color = "";
    try { const me = await relay("/me", {}); if (!me.username) throw new Error("that address isn't the Dignity Notes relay"); m.textContent = "Connected. Notes will be written by AI."; m.style.color = "var(--accent)"; }
    catch (e) { m.textContent = "Not connected: " + e.message + ". Notes will use the basic offline tidy."; m.style.color = "var(--incident)"; }
  };
  if ($("#stTesters")) $("#stTesters").onclick = () => { s.close(); openTesters(); };
  if ($("#stPw")) $("#stPw").onclick = openChangePassword;
  if ($("#stShSwitch")) $("#stShSwitch").onclick = () => { s.close(); switchCarer(); };
  if ($("#stPron")) $("#stPron").onclick = () => { s.close(); openPronouns(); };
  if ($("#stCPron") && !$("#stCPron").disabled) $("#stCPron").onchange = async (e) => {
    let v = e.target.value;
    if (v === "other") { v = (prompt(`How should notes refer to ${S.client.name}? (e.g. ze/zir)`) || "").trim(); if (!v) { e.target.value = session.client.pronouns || ""; return; } }
    try { const out = await relay("/clients/pronouns", { id: session.client.id, pronouns: v }); session.client.pronouns = out.client.pronouns || ""; saveSession(); toast("Saved"); }
    catch (err) { toast(err.message); }
  };
  // Always available: Chrome only offers its own install prompt now and then.
  if ($("#stInstall")) $("#stInstall").onclick = async () => {
    if (installPrompt) { try { installPrompt.prompt(); await installPrompt.userChoice; } catch {} installPrompt = null; await checkStorage(); s.close(); openSettings(); return; }
    $("#stInstallMsg").innerHTML = storageState.ios
      ? "In Safari: tap the <b>Share</b> button (square with an arrow), then <b>Add to Home Screen</b>, then <b>Add</b>. Open Dignity Notes from the new icon from now on."
      : "In Chrome: tap the <b>⋮</b> menu (top right), then <b>Add to Home screen</b> or <b>Install app</b>, then <b>Install</b>. If it says <b>Open app</b>, it's already installed: open it from your home screen.";
  };
  const shSet = async (body, msg) => {
    try {
      const out = await relay("/clients/sharedphone", { id: session.client.id, ...body });
      session.client.shared = out.client.shared || [];
      if (body.on === true) { session.shared = { clientId: session.client.id, lockMins: body.lockMins || 15 }; setSharedPhone({ ...session.shared, clientName: session.client.name, secret: out.sharedSecret || (sharedPhone() || {}).secret }); markActive(); }
      else if (body.sharedSecret) { delete session.shared; setSharedPhone(null); }
      saveSession(); toast(msg); s.close(); openSettings();
    } catch (e) { toast(e.message); }
  };
  if ($("#stShOn")) $("#stShOn").onclick = (e) => confirmInline(e.currentTarget, () => shSet({ on: true, lockMins: 15 }, `This is now ${session.client.name}'s shared phone`), "Tap again to make it the shared phone");
  if ($("#stShLock")) $("#stShLock").onchange = (e) => shSet({ sharedSecret: (sharedPhone() || {}).secret, on: true, lockMins: Number(e.target.value) }, `Locks after ${e.target.value} minutes unused`);
  if ($("#stShOff")) $("#stShOff").onclick = (e) => confirmInline(e.currentTarget, () => shSet({ sharedSecret: (sharedPhone() || {}).secret, on: false }, "This is an ordinary phone again"));
  s.root.querySelectorAll("[data-shrm]").forEach((b) => (b.onclick = () => confirmInline(b, () => shSet({ key: b.dataset.shrm, on: false }, "That phone is no longer a shared phone"))));
  if ($("#stTrain")) $("#stTrain").onclick = openMyTraining;
  if ($("#stPush")) drawPushSetting($("#stPush"));
  if ($("#stCountry") && !$("#stCountry").disabled) $("#stCountry").onchange = async (e) => {
    const was = clientCountry(), want = e.target.value;
    try {
      const out = await relay("/clients/country", { id: session.client.id, country: want }); session.client.country = out.client.country; saveSession(); render();
      const roles = CONSENT_ROLES[want];
      const role = session.client.consent && session.client.consent.role;
      toast(role && !roles.includes(role) ? `Changed. The agreement was given as "${role}", which doesn't apply there: record a new agreement with the right person.` : want === "AU" ? "Care is in Australia" : "Care is in the United Kingdom");
    }
    catch (err) { e.target.value = was; toast(err.message); }
  };
  const careSet = async (el, body, msg, was) => {
    try { const out = await relay("/clients/care", { id: session.client.id, ...body }); session.client.care = out.client.care; session.client.catchupDays = out.client.catchupDays; saveSession(); toast(msg); render(); }
    catch (err) { el.value = was; toast(err.message); }
  };
  if ($("#stCare") && !$("#stCare").disabled) $("#stCare").onchange = (e) => careSet(e.target, { care: e.target.value }, e.target.value === "agency" ? "Agency: incident reports get an administrator's review" : "Private care: no review step", isAgency() ? "agency" : "private");
  if ($("#stCatch") && !$("#stCatch").disabled) $("#stCatch").onchange = (e) => { const d = Math.floor(Number(e.target.value)); if (!(d >= 1 && d <= 60)) { e.target.value = session.client.catchupDays || 7; return toast("Choose between 1 and 60 days"); } careSet(e.target, { catchupDays: d }, `Carers catch up after ${d} day${d === 1 ? "" : "s"} away`, session.client.catchupDays || 7); };
  $("#stOut").onclick = async (e) => confirmInline(e.currentTarget, async () => {
    if (!session.local) relay("/logout", {}).catch(() => {});
    s.close(); signedOut("You've signed out.");
  });
  if ($("#stSwitch")) $("#stSwitch").onclick = () => { s.close(); handoverDraft = familySummary = null; showClients(true); };
  if ($("#stWho")) $("#stWho").onclick = () => { s.close(); openTesters(); };
  if ($("#stPeople")) $("#stPeople").onclick = async (e) => {
    // Only what this person changed, so an older view doesn't overwrite someone else's update.
    const shifts = {}; s.root.querySelectorAll("[data-cs]").forEach((i) => { if (i.value.trim() !== i.dataset.was) shifts[i.dataset.cs] = i.value.trim(); });
    if (!Object.keys(shifts).length) return toast("Nothing changed");
    const btn = e.currentTarget; btn.disabled = true;
    try {
      if (session.local) session.client.carers = roster().filter((c) => !c.notOnRoster).map((c) => ({ id: c.id, name: c.name, shift: shifts[c.id] ?? c.shift }));
      else session.client.carers = (await relay("/clients/shifts", { id: session.client.id, shifts })).client.carers;
      saveSession(); loadUser(); render(); toast("Shifts saved");
    } catch (err) { toast(err.message); }
    btn.disabled = false;
  };
  $("#stReset").onclick = () => { $("#stResetYes").hidden = false; };
  $("#stResetYes").onclick = async () => {
    if ((S.pending || []).length) return toast("A recording is still being saved. Wait a moment, then try again.");
    if (cloudOn() && (unsynced().length || unsentAudio().length || countFailed())) return toast("Some notes or recordings aren't in the cloud yet (see Settings > About). Connect to the internet, wait a moment, then try again.");
    const keep = S.settings, si = syncInfo(); clearDocCache();
    // Only recordings this phone has uploaded itself (another person on this phone may share the store).
    await audioDB.del(S.notes.filter((n) => n.audioId && (!cloudOn() || si.audio[n.audioId] === 1)).map((n) => n.audioId));
    S = seed(); S.settings = keep; save(); loadUser(); s.close(); handoverDraft = familySummary = null; go("today"); };
}
