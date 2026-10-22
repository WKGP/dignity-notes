// Dignity Notes: recording, my words, the voice set-up, accent, checking and saving a note.
// Loaded by index.html after app.js, in order; shares its global scope (one app split into files).
"use strict";

/* ---------- recorder ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const rec = { media: null, chunks: [], stream: null, recog: null, on: false, final: "", interim: "", started: 0, timer: null, blob: null, speechOK: !!SR };

/* ---------- my words (personal dictionary) ----------
 * When a carer fixes words the phone misheard, the app offers to remember the fix on this phone
 * ("Nanna" -> "Nana", "for arm" -> "forearm") and applies it to their next recordings before the
 * AI sees them. The phone's original words are still kept with each note.
 * Only sound-alike mishearings are offered. Never learned, because they change meaning:
 * negatives, numbers and amounts, left/right, units, singular/plural and similar word endings,
 * capital letters alone, and very common words. The carer confirms each fix before it's kept,
 * and typing back over an automatic fix (or tapping Undo) forgets it.
 */
const DICT_COMMON = new Set(("a an the and or but so to too two in on at of off for four with by from up is was were be been being am are it its it's this that these those there their they're they them " +
  "he she his her hers him we our us you your i me my mine do did done has had have went go got get").split(" "));
const DICT_BLOCK = new Set(("no not nor never none nothing nobody cannot yes ok okay " +
  "zero one two three four five six seven eight nine ten eleven twelve fifteen twenty thirty forty fifty hundred half quarter once twice double single both few several many more less most least some any all every each " +
  "left right upper lower top bottom front back inner outer " +
  "ml mg g kg cup cups glass glasses mug mugs litre litres liter liters tablet tablets pill pills dose doses spoon spoons spoonful hour hours minute minutes am pm morning afternoon evening night").split(" "));
const DICT_MAX = 300;
const dictKey = () => "dignitynotes.dict." + (session ? session.username : "");
const dictNorm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();
function loadDict() { try { return JSON.parse(localStorage.getItem(dictKey()) || "{}") || {}; } catch { return {}; } }
function saveDict(d) {
  const keys = Object.keys(d);
  if (keys.length > DICT_MAX) keys.sort((a, b) => d[a].t - d[b].t).slice(0, keys.length - DICT_MAX).forEach((k) => delete d[k]);
  try { localStorage.setItem(dictKey(), JSON.stringify(d)); } catch {}
}
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const bare = (w) => w.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, "");
const tokens = (t) => String(t).split(/\s+/).map(bare).filter(Boolean);

// 0..1: how alike two words are (1 - edit distance / longer length), ignoring case.
function similarity(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase(); if (a === b) return 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
}

// Apply remembered fixes in one pass. Returns the text plus each replacement's position,
// so Undo can put back exactly those words. (No lookbehind: older iPhones don't support it.)
function applyDict(text) {
  const d = loadDict(); const keys = Object.keys(d).filter((k) => k.trim()).sort((a, b) => b.length - a.length);
  if (!keys.length || !text) return { text, reps: [] };
  try {
    const reps = []; let delta = 0;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}'])(${keys.map((k) => k.split(" ").map(reEsc).join("\\s+")).join("|")})(?=$|[^\\p{L}\\p{N}'])`, "giu");
    const out = text.replace(re, (m, pre, word, offset) => {
      const key = dictNorm(word), e = d[key];
      if (!e || word === e.to) return m; // already right: nothing to change or undo
      reps.push({ key, from: word, to: e.to, start: offset + pre.length + delta });
      delta += e.to.length - word.length;
      return pre + e.to;
    });
    return { text: out, reps };
  } catch { return { text, reps: [] }; } // never lose a recording over a dictionary problem
}
// Put back the words one remembered fix changed. Returns the new text and the remaining replacements.
function undoFix(text, reps, key) {
  let out = text; const keep = [];
  for (const r of [...reps].sort((a, b) => b.start - a.start)) {
    if (r.key !== key) { keep.push(r); continue; }
    if (out.slice(r.start, r.start + r.to.length) !== r.to) continue; // text moved: leave it
    out = out.slice(0, r.start) + r.from + out.slice(r.start + r.to.length);
    const shift = r.from.length - r.to.length;
    keep.forEach((k) => { if (k.start > r.start) k.start += shift; });
  }
  return { text: out, reps: keep.sort((a, b) => a.start - b.start) };
}

// Word-level differences (longest common subsequence) between two texts.
function diffRuns(a, b) {
  const A = tokens(a), B = tokens(b), n = A.length, m = B.length;
  if (!n || !m || n * m > 250000) return [];
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const runs = []; let i = 0, j = 0, ra = [], rb = [];
  const flush = () => { if (ra.length && rb.length) runs.push([ra, rb]); ra = []; rb = []; };
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) { flush(); i++; j++; }
    else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) { rb.push(B[j]); j++; }
    else { ra.push(A[i]); i++; }
  }
  flush();
  return runs;
}

// Is this edit a mishearing worth remembering (rather than a change of meaning)?
function isMishearing(ra, rb, minSim) {
  if (!ra.length || !rb.length || ra.length > 3 || rb.length > 3) return false;
  const all = [...ra, ...rb].map((w) => w.toLowerCase());
  if (all.some((w) => /\d/.test(w) || DICT_BLOCK.has(w) || /n't$/.test(w))) return false;
  const f = ra.join("").toLowerCase(), t = rb.join("").toLowerCase();
  if (f === t) return false; // capital letters or spacing only
  if (t.startsWith(f) || f.startsWith(t) || t.endsWith(f) || f.endsWith(t)) return false; // plural, -ed, un-, -n't...
  if (ra.every((w) => DICT_COMMON.has(w.toLowerCase())) && rb.every((w) => DICT_COMMON.has(w.toLowerCase()))) return false;
  return similarity(f, t) >= minSim;
}

// What the carer changed: fixes worth offering to remember, and remembered fixes to forget
// (when the carer typed the heard words back over an automatic fix).
function findFixes(baseline, corrected) {
  const d = loadDict(); const toKey = new Map(Object.entries(d).map(([k, e]) => [dictNorm(e.to), k]));
  const offer = [], forget = [];
  for (const [ra, rb] of diffRuns(baseline, corrected)) {
    const pairs = ra.length <= 3 && rb.length <= 3 ? [[ra, rb, 0.5]]
      : ra.map((w) => { const best = rb.map((v) => [v, similarity(w, v)]).sort((x, y) => y[1] - x[1])[0]; return best ? [[w], [best[0]], 0.6] : null; }).filter(Boolean);
    for (const [fa, fb, minSim] of pairs) {
      const reverted = toKey.get(dictNorm(fa.join(" ")));
      if (reverted && dictNorm(fb.join(" ")) === reverted) { forget.push(reverted); continue; }
      if (isMishearing(fa, fb, minSim)) {
        const from = dictNorm(fa.join(" ")), to = fb.join(" ");
        if (!offer.some((o) => o.from === from) && !(d[from] && d[from].to === to)) offer.push({ from, to });
      }
    }
  }
  return { offer: offer.slice(0, 6), forget };
}
function rememberFixes(list) {
  if (!list.length) return;
  const d = loadDict();
  for (const { from, to } of list) d[dictNorm(from)] = { to, used: 0, t: Date.now() };
  saveDict(d);
}
function noteFixesUsed(keys) {
  if (!keys.length) return;
  const d = loadDict();
  keys.forEach((k) => { if (d[k]) { d[k].used = (d[k].used || 0) + 1; d[k].t = Date.now(); } });
  saveDict(d);
}
function forgetWord(from) { const d = loadDict(); delete d[dictNorm(from)]; saveDict(d); }
// Spellings to suggest to the AI (data, not instructions): the most used fixes.
const dictVocabulary = () => { const d = loadDict(); return [...new Set(Object.values(d).sort((a, b) => (b.used || 0) - (a.used || 0)).map((e) => e.to))].slice(0, 40); };
/* ---------- better speech to text, and a voice set-up (Sam, 2026-10-20) ----------
 * Each recording is turned into words by the relay's speech-to-text (Whisper) whenever there's signal;
 * the phone's own live words are the preview and the fallback. Whisper gets spelling hints: the
 * client's and carers' names, the medicines on the chart, common care words, and this person's own
 * remembered words. The speech engine itself can't be trained on one voice; the voice set-up (read a
 * few sentences once) finds the words it gets wrong for this person and remembers the fixes.
 */
const CARE_WORDS = ["Zimmer frame", "commode", "continence pad", "MAR chart", "Cavilon cream", "catheter", "sacrum"];
function speechHints() {
  const client = (S.client && S.client.name) || "the client";
  const names = [...new Set([client, ...roster().map((c) => c.name)].filter(Boolean).map((n) => String(n).split(/\s+/)[0]))]; // first names only
  const meds = cloudOn() ? [...new Set(medsState().list.filter((m) => !m.stoppedAt).map((m) => m.name).filter(Boolean))].slice(0, 15) : [];
  const words = [...new Set([...dictVocabulary(), ...CARE_WORDS])].slice(0, 30);
  return [`A care note about ${client}.`, `People: ${names.join(", ")}.`, meds.length ? `Medicines: ${meds.join(", ")}.` : "", `Words: ${words.join(", ")}.`].filter(Boolean).join(" ").slice(0, 600);
}
const VOICE_KEY = () => "dignitynotes.voicesetup." + (session ? session.username : "");
const voiceSetupState = () => { try { return JSON.parse(localStorage.getItem(VOICE_KEY()) || "null"); } catch { return { done: 1 }; } };
const setVoiceSetup = (v) => { try { localStorage.setItem(VOICE_KEY(), JSON.stringify(v)); } catch {} };
// Offered on Today until done or put off (a week at a time).
const voiceCardHTML = () => {
  if (!session || session.local || isFamily() || !cloudOn() || !navigator.mediaDevices) return "";
  const v = voiceSetupState(); if (v && (v.done || (v.later && Date.now() < v.later))) return "";
  return `<div class="card" style="display:grid;gap:8px"><div class="card-h"><h3>Help the app hear you</h3></div>
    <p class="small" style="margin:0">Read 8 short sentences aloud (about 2 minutes, somewhere quiet). The app finds the names and words it mishears in your voice and fixes them from then on.</p>
    <div class="row" style="gap:8px"><button class="btn primary" data-voice="go">Start the voice set-up</button><button class="btn ghost" data-voice="later">Not now</button></div></div>`;
};
function bindVoiceCard(v) {
  v.querySelectorAll("[data-voice]").forEach((b) => (b.onclick = () => { if (b.dataset.voice === "later") { setVoiceSetup({ later: Date.now() + 7 * 864e5 }); render(); } else openVoiceSetup(); }));
}
function voiceSentences() {
  const c = (S.client && S.client.name) || "Nana";
  const others = roster().map((r) => r.name).filter((n) => n && n !== session.name);
  const meds = cloudOn() ? [...new Set(medsState().list.filter((m) => !m.stoppedAt).map((m) => m.name).filter(Boolean))] : [];
  const out = [
    [`${c} had porridge and a cup of tea at breakfast.`, [c, "porridge"]],
    [`I walked ${c} to the bathroom with the Zimmer frame.`, [c, "Zimmer frame"]],
    [`${c} used the commode overnight and the continence pad was dry.`, ["commode", "continence pad"]],
    [`I put Cavilon cream on the red area on the sacrum.`, ["Cavilon cream", "sacrum"]],
    [`Small bruise on the left forearm, no skin tear.`, ["bruise", "forearm", "skin tear"]],
  ];
  for (const m of meds.slice(0, 2)) out.push([`Gave ${m} at eight o'clock, as on the MAR chart.`, [m, "MAR chart"]]);
  if (others[0]) out.push([`Handed over to ${others[0]} at the end of my shift.`, [others[0]]]);
  out.push([`${c} drank about a litre today and refused the afternoon drink.`, [c, "litre"]]);
  return out.slice(0, 8);
}
// The words in what was heard that stand for a term in the sentence that was read, or null if it was
// heard right. The heard words are lined up with the sentence (longest common run of words), and only
// the words between the matched neighbours of the term count: never a nearby word that happens to look
// alike. Never everyday words, numbers or sides, never a plural or a small variation.
function wordPairs(A, B) {
  const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) { if (A[i] === B[j]) { out.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  return out;
}
function misheardAs(term, heard, sentence = term) {
  const low = (x) => tokens(x).map((w) => w.toLowerCase());
  const T = low(term), Sx = low(sentence), H = low(heard);
  if (!T.length || !H.length || ` ${H.join(" ")} `.includes(` ${T.join(" ")} `)) return null;
  let p = -1; for (let k = 0; k + T.length <= Sx.length; k++) if (Sx.slice(k, k + T.length).join(" ") === T.join(" ")) { p = k; break; }
  if (p < 0 || Sx.length * H.length > 40000) return "";
  const pairs = wordPairs(Sx, H), q = p + T.length;
  const before = pairs.filter(([a]) => a < p).pop(), after = pairs.find(([a]) => a >= q);
  const span = H.slice(before ? before[1] + 1 : 0, after ? after[1] : H.length);
  if (!span.length || span.length > 3 || span.join(" ") === T.join(" ")) return "";
  if (span.some((w) => DICT_COMMON.has(w) || DICT_BLOCK.has(w) || /\d/.test(w))) return "";
  return isMishearing(span, tokens(term), 0.6) ? span.join(" ") : "";
}
// A short recording for the set-up (not saved anywhere): microphone on until stop() is called.
async function recordClip() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  let mr; try { mr = new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach((t) => t.stop()); throw e; }
  const chunks = [];
  mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.start();
  const blob = () => new Blob(chunks, { type: mr.mimeType || "audio/webm" });
  // Some phones never say the recorder stopped: finish after 2 seconds anyway, as the main recorder does.
  return { stop: () => new Promise((r) => { let done = false; const end = () => { if (done) return; done = true; stream.getTracks().forEach((t) => t.stop()); r(blob()); }; mr.onstop = end; try { mr.stop(); } catch { end(); } setTimeout(end, 2000); }), cancel: () => { try { mr.stop(); } catch {} stream.getTracks().forEach((t) => t.stop()); } };
}
function openVoiceSetup() {
  if (!navigator.onLine) return toast("The voice set-up needs signal. Try again when you're connected.");
  const list = voiceSentences(), found = new Map(); let i = 0, clip = null, results = [];
  const s = sheet(`${sheetHead("Voice set-up")}<div id="vsBody" style="display:grid;gap:12px"></div>`, { onClose: () => { if (clip) clip.cancel(); } });
  const body = $("#vsBody", s.root);
  const step = () => {
    const [text] = list[i];
    body.innerHTML = `<p class="small muted" style="margin:0">Sentence ${i + 1} of ${list.length}. Tap Record, read it aloud as you'd normally speak, then tap Stop.</p>
      <div class="card" style="box-shadow:none;font-size:20px;line-height:1.4;padding:14px">${esc(text)}</div>
      <button class="btn primary block" id="vsRec">${ICON.mic} Record</button>
      <div class="small" id="vsMsg" role="status"></div>
      <div class="row" style="gap:8px"><button class="btn ghost" id="vsSkip">Skip this one</button></div>`;
    $("#vsSkip", body).onclick = () => next();
    $("#vsRec", body).onclick = async (e) => {
      const b = e.currentTarget;
      if (!clip) {
        if (b.disabled) return; b.disabled = true;
        let c; try { c = await recordClip(); } catch { b.disabled = false; return ($("#vsMsg", body).textContent = "The microphone isn't available. Allow it for Dignity Notes in the phone's settings."); }
        if (!s.root.isConnected || !b.isConnected) { c.cancel(); return; } // closed or moved on while asking
        clip = c; b.disabled = false;
        b.innerHTML = "Stop"; $("#vsMsg", body).textContent = "Listening… read the sentence, then tap Stop.";
        return;
      }
      b.disabled = true; const blob = await clip.stop(); clip = null;
      $("#vsMsg", body).textContent = "Checking what was heard…";
      let heard = "";
      try { heard = blob.size > 2000 ? await serverWords(blob) : ""; } catch (err) { $("#vsMsg", body).textContent = err.message || "Couldn't check it just now."; b.disabled = false; b.innerHTML = `${ICON.mic} Try again`; return; }
      if (!heard) { $("#vsMsg", body).textContent = "Nothing was heard. Try again, a little closer to the phone."; b.disabled = false; b.innerHTML = `${ICON.mic} Try again`; return; }
      const terms = list[i][1].filter(Boolean), wrong = [];
      for (const t of terms) { const w = misheardAs(t, heard, list[i][0]); if (w) { wrong.push([w, t]); if (!found.has(w)) found.set(w, t); } }
      results.push({ text: list[i][0], heard, wrong });
      $("#vsMsg", body).innerHTML = `<strong>Heard:</strong> ${esc(heard)}<br>${wrong.length ? `To fix: ${wrong.map(([w, t]) => `"${esc(w)}" means "${esc(t)}"`).join(", ")}` : "✓ Every name and word was heard right."}`;
      b.disabled = false; b.innerHTML = i + 1 < list.length ? "Next sentence" : "See the results"; b.onclick = () => next();
    };
  };
  const next = () => { if (clip) { clip.cancel(); clip = null; } i++; if (i < list.length) step(); else finish(); };
  const finish = () => {
    const fixes = [...found].map(([from, to]) => ({ from, to }));
    body.innerHTML = `<p class="small" style="margin:0">${results.length ? `${results.length} sentence${results.length === 1 ? "" : "s"} read.` : "No sentences were read."} ${fixes.length ? "These were misheard. Ticked ones are fixed automatically in your notes from now on:" : results.length ? "Every name and word was heard right: nothing to fix." : ""}</p>
      ${fixes.map((f, k) => `<label class="check"><input type="checkbox" data-vfix="${k}" checked><span>"${esc(f.from)}" → <strong>${esc(f.to)}</strong></span></label>`).join("")}
      <label class="f">Your accent<select id="vsAccent">${ACCENTS.map(([c, n]) => `<option value="${c}" ${c === speechLang() ? "selected" : ""}>English (${n})</option>`).join("")}</select></label>
      <p class="tiny muted" style="margin:0">Fixes are kept under My words in Settings, where you can remove any. Correcting a word on the Saved screen adds more.</p>
      <button class="btn primary block" id="vsDone">Save</button>`;
    $("#vsDone", body).onclick = () => {
      const keep = fixes.filter((_, k) => $(`[data-vfix="${k}"]`, body).checked);
      rememberFixes(keep);
      if ($("#vsAccent", body).value !== speechLang()) setSpeechLang($("#vsAccent", body).value);
      setVoiceSetup({ done: Date.now(), fixes: keep.length });
      s.close(); render(); toast(keep.length ? `${keep.length} word${keep.length === 1 ? "" : "s"} will be fixed automatically` : "Voice set-up done");
    };
  };
  body.innerHTML = `<p class="small" style="margin:0">You'll read ${list.length} short sentences with ${esc((S.client && S.client.name) || "the client")}'s name, the carers' names, medicines and everyday care words. The app checks what it heard and remembers fixes for the words it gets wrong in your voice.</p>
    <p class="small" style="margin:0">Somewhere quiet, speaking as you normally would. Nothing you read is saved as a note or kept.</p>
    <button class="btn primary block" id="vsStart">Start</button>`;
  $("#vsStart", body).onclick = step;
}


/* ---------- speech accent ----------
 * The phone's speech recognition works much better when it knows the speaker's accent.
 * Chosen per phone in Settings; defaults to the phone's own English variant, else UK.
 */
const ACCENTS = [["en-GB", "UK"], ["en-AU", "Australia"], ["en-ZA", "South Africa"], ["en-IE", "Ireland"], ["en-NZ", "New Zealand"], ["en-US", "United States"], ["en-IN", "India"]];
// Kept per person (on this phone, and on their account so it follows them to a new phone).
const ACCENT_KEY = () => "dignitynotes.speechlang" + (session && session.username ? "." + session.username : "");
function setSpeechLang(code, { fromServer = false } = {}) {
  if (!ACCENTS.some(([c]) => c === code)) return false;
  try { localStorage.setItem(ACCENT_KEY(), code); } catch {}
  if (!fromServer && session && session.token && !session.local) {
    relay("/me/accent", { accent: code }).then(() => { try { localStorage.removeItem(ACCENT_KEY() + ".unsent"); } catch {} })
      .catch(() => { try { localStorage.setItem(ACCENT_KEY() + ".unsent", "1"); } catch {} });
  }
  return true;
}
// The account's accent arrives with sign-in and the client list: use it, unless a change made on this
// phone hasn't reached the server yet (then send that instead).
function accentFromServer(code) {
  let unsent = false; try { unsent = !!localStorage.getItem(ACCENT_KEY() + ".unsent"); } catch {}
  if (unsent) { setSpeechLang(speechLang()); return; }
  if (code) { setSpeechLang(code, { fromServer: true }); return; }
  // Nothing on the account yet: send the choice made on this phone before accents were kept on accounts.
  let saved = null; try { saved = localStorage.getItem(ACCENT_KEY()) || localStorage.getItem("dignitynotes.speechlang"); } catch {}
  if (saved) setSpeechLang(saved);
}
function speechLang() {
  try {
    for (const k of [ACCENT_KEY(), "dignitynotes.speechlang"]) { const v = localStorage.getItem(k); if (ACCENTS.some(([c]) => c === v)) return v; }
  } catch {}
  const nav = (navigator.languages || [navigator.language || ""]).find((l) => ACCENTS.some(([c]) => c.toLowerCase() === String(l).toLowerCase()));
  return nav ? ACCENTS.find(([c]) => c.toLowerCase() === nav.toLowerCase())[0] : "en-GB";
}

function openRecorder(opts = {}) {
  rec.amends = opts.amends || null; // an addition to an earlier note (see openSavedNote)
  if (activeTransfer()) toast(`Note: ${S.client.name} is out with ${activeTransfer().withWhom}`);
  rec.final = rec.interim = rec.shown = ""; rec.blob = null; rec.diag = { parts: 0, ends: 0, err: "", muted: false, late: 0 }; rec.speechOK = !!SR; rec.cancelled = false; rec.speechLostAt = 0; rec.stoppedAt = 0;
  if (rec.abort) rec.abort.abort(); rec.finishing = false; // an earlier recording still being turned into words is dropped
  rec.gen = (rec.gen || 0) + 1; rec.skipServer = false; // each recording has its own number, so a late answer can't land on a newer one
  const s = sheet(`${sheetHead(rec.amends ? "Add to the note" : "Record care note")}
    <div class="recorder">
      <button class="big-mic" id="micBtn" aria-label="Start recording">${ICON.mic}</button>
      <div class="timer" id="recTimer">0:00</div>
      <p class="muted small" id="recHint" style="margin:0">Tap to start. Speak naturally, as if leaving a voice message.</p>
      <div class="live" id="live" hidden></div>
    </div>
    <div class="row"><button class="btn ghost" id="typeBtn">Type instead</button></div>
    <p class="tiny muted" style="margin:0;text-align:center">Recording as ${esc(onDuty().name)} · ${fmtTime(Date.now())}. The original recording is kept with the note. Keep the app open while recording: the screen stays on, and recording stops if the phone locks.</p>`,
    { onClose: () => { stopRecording(true); if (rec.finishing) { rec.cancelled = true; rec.abort && rec.abort.abort(); } }, guard: () => rec.on || rec.finishing });
  $("#micBtn").onclick = () => (rec.on ? stopRecording(false) : startRecording());
  $("#typeBtn").onclick = (e) => {
    // While the recording is being turned into words: skip that and type, keeping the recording.
    if (rec.finishing) { rec.skipServer = true; rec.abort && rec.abort.abort(); return; }
    const go = () => { stopRecording(true); openReview({ transcript: "", typed: true, amends: rec.amends }); };
    if (rec.on) confirmInline(e.currentTarget, go, "Tap again: discards this recording"); else go();
  };
}

async function startRecording() {
  if (rec.on || rec.starting) return; // a second tap while the microphone is starting
  rec.starting = true;
  // The first recording on a phone is often lost to the phone's permission questions (microphone, speech).
  try { rec.firstUse = !localStorage.getItem("dn.recorded"); localStorage.setItem("dn.recorded", "1"); } catch { rec.firstUse = false; }
  try {
    rec.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    rec.starting = false;
    $("#recHint").textContent = "The microphone is blocked. Allow microphone access for this site in your browser settings, or use Type instead.";
    return;
  }
  rec.starting = false;
  if (rec.cancelled || !$("#micBtn")) { rec.stream.getTracks().forEach((t) => t.stop()); return; } // closed while starting
  rec.chunks = [];
  try { try { rec.media = new MediaRecorder(rec.stream, { audioBitsPerSecond: 32000 }); } catch { rec.media = new MediaRecorder(rec.stream); } rec.media.ondataavailable = (e) => { if (e.data.size) { rec.chunks.push(e.data); rec.diag.parts++; } }; rec.media.start(1000); }
  catch { rec.media = null; }
  // For the "Nothing was picked up" details: did the phone silence the microphone part-way through?
  try { const tr = rec.stream.getAudioTracks()[0]; if (tr) tr.onmute = () => (rec.diag.muted = true); } catch {}
  if (SR) {
    try {
      rec.recog = new SR(); rec.recog.lang = speechLang(); rec.recog.continuous = true; rec.recog.interimResults = true;
      rec.recog.onresult = (e) => {
        // iPhones (Sam, 2026-10-21) can start the list of words afresh part-way through without ending,
        // and never mark words final: the words already shown would vanish. Keep them before the new ones.
        // Only a real restart counts: nothing in this event is final (a final replaces the words itself), there
        // are new words, and they share little with the words before (a corrected word isn't a restart).
        const prevInterim = rec.interim.trim(), prevLen = rec.resultsLen || 0;
        let fresh = "", anyFinal = false;
        for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) anyFinal = true; else fresh += e.results[i][0].transcript; }
        if (!anyFinal && !fresh.trim()) return; // an empty event (iPhones send one after Stop) doesn't wipe the words shown
        rec.resultsLen = e.results.length;
        if (!anyFinal && fresh.trim() && prevInterim.split(/\s+/).length >= 3 && e.resultIndex === 0 && e.results.length <= prevLen && !agreesWith(fresh, prevInterim) && !rec.final.trimEnd().endsWith(prevInterim)) rec.final += prevInterim + " ";
        rec.interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) { const seg = r[0].transcript.trim(); if (seg && !rec.final.trimEnd().endsWith(seg)) rec.final += seg + " "; }
          else rec.interim += r[0].transcript;
        }
        drawLive();
      };
      rec.recog.onerror = (e) => { rec.diag.err = e.error || "?"; if (["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"].includes(e.error)) { rec.speechOK = false; if (rec.on) rec.speechLostAt = Date.now() - rec.started; drawLive(); } };
      // Some phones (iPhone Safari) end recognition repeatedly; restarting at once can lock up the page,
      // so wait a moment, and give up on live words after 4 quick endings in a row (the audio keeps recording).
      rec.recogEnds = [];
      rec.recog.onend = () => {
        // iPhones end recognition now and then: keep any words not yet marked final before restarting.
        if (rec.interim.trim()) { rec.final += rec.interim.trim() + " "; rec.interim = ""; }
        rec.diag.ends++; rec.resultsLen = 0;
        if (!rec.on || !rec.speechOK) return;
        const now = Date.now(); rec.recogEnds = rec.recogEnds.filter((t) => now - t < 5000).concat(now);
        if (rec.recogEnds.length >= 4) { rec.speechOK = false; rec.speechLostAt = Date.now() - rec.started; drawLive(); return; }
        setTimeout(() => { if (rec.on && rec.speechOK) { try { rec.recog.start(); } catch { rec.speechOK = false; drawLive(); } } }, 400);
      };
      rec.recog.start();
    } catch { rec.speechOK = false; }
  }
  rec.on = true; rec.started = Date.now();
  keepAwake(true);
  const mic = $("#micBtn"); mic.classList.add("on"); mic.innerHTML = ICON.stop; mic.setAttribute("aria-label", "Stop recording");
  $("#recHint").textContent = "Recording. Tap the button when you've finished.";
  $("#live").hidden = false; drawLive();
  rec.timer = setInterval(() => { const s = Math.floor((Date.now() - rec.started) / 1000); const t = $("#recTimer"); if (t) t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }, 250);
}
// Keep the screen on while recording: an iPhone stops recording when the screen locks.
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && "wakeLock" in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => (wakeLock = null)); }
    else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { wakeLock = null; } // not supported, or refused (e.g. low battery mode): the warning below still applies
}
// If the screen locks or the carer switches app mid-recording, the phone stops the microphone.
// Finish there and keep everything recorded so far, rather than losing it.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && rec.on) { rec.stoppedAt = Date.now() - rec.started; stopRecording(false); }
  else if (document.visibilityState === "visible" && rec.on) keepAwake(true);
});
function drawLive() {
  // The words the carer saw are never lost: the longest version shown is kept as a fallback (Sam, 2026-10-21).
  const now = (rec.final + " " + rec.interim).trim(); if (now.length >= (rec.shown || "").length) rec.shown = now;
  const l = $("#live"); if (!l) return;
  l.innerHTML = rec.final || rec.interim ? `${esc(rec.final)}<span class="interim">${esc(rec.interim)}</span>${!rec.speechOK && rec.speechLostAt ? '<div class="warn small" style="margin-top:8px">The phone stopped turning your words into text. Keep talking: the recording carries on, and you can add the rest when you check the note.</div>' : ""}`
    : `<span class="interim">${rec.speechOK ? "Your words will appear here as you speak…" : "Live words aren't available in this browser. Your recording is still being kept."}</span>`;
}
// Small print under "Nothing was picked up", so a screenshot sent with feedback shows what the phone did.
function recDiag() {
  const d = rec.diag; if (!d) return "";
  return `<div class="tiny muted" style="margin-top:6px">Details for support: audio ${d.parts} part${d.parts === 1 ? "" : "s"}, ${d.bytes || 0} bytes${d.late ? `, waited ${d.late / 1000}s` : ""}; live words ${rec.shown ? "shown" : "none"}${SR ? "" : " (not available)"}; listening ended ${d.ends}×${d.err ? `, error ${esc(d.err)}` : ""}${d.muted ? "; microphone muted by the phone" : ""}.</div>`;
}
// Words from a recording, worked out on the relay (Cloudflare speech-to-text). Empty when offline or not set up.
// Do two versions of what was said mostly agree? (Share of the speech-to-text's words the phone heard too.)
function agreesWith(a, b) {
  const A = tokens(a).map((w) => w.toLowerCase()), B = new Set(tokens(b).map((w) => w.toLowerCase()));
  return A.length > 0 && A.filter((w) => B.has(w)).length / A.length >= 0.5;
}
async function serverWords(blob, signal, timeout = 60000) {
  if (!session || session.local || !session.token || !navigator.onLine || !relayBase()) return "";
  const r = await syncFetch("/transcribe", { signal, headers: { "Content-Type": blob.type || "application/octet-stream", "X-Lang": speechLang().slice(0, 2).toLowerCase(), "X-Hint": encodeURIComponent(speechHints()) }, body: blob, timeout });
  return String((await r.json()).text || "").trim();
}

// A recording is kept on the phone the moment it stops (S.pending + the audio store), before the note
// is written, so closing the app or losing signal can't lose it. It's saved as a note as soon as the
// note is written, and any left over (app closed meanwhile) are finished the next time the app opens.
async function keepPending({ blob, transcript, recordedAt, amends, lostAt, lockedAt }) {
  const id = uid();
  const p = { id, audioId: blob ? "a_" + id : null, transcript, recordedAt, amends: amends || null, by: stampId(), lostAt: lostAt || 0, lockedAt: lockedAt || 0 };
  S.pending = [...(S.pending || []), p]; saveLocal(); // the entry first, so the words survive even if the audio can't be stored
  if (blob && !(await audioDB.put(p.audioId, blob))) { p.audioId = null; saveLocal(); } // keep the words; save re-tries the audio
  return p;
}
function dropPending(p) { if (!p) return; S.pending = (S.pending || []).filter((x) => x.id !== p.id); saveLocal(); }
let resumingPending = false;
async function resumePending() {
  if (resumingPending || appBusy() || !S.pending || !S.pending.length || !session || !S.client) return;
  const p = S.pending[0];
  if (S.notes.some((n) => n.id === p.id)) { dropPending(p); return; } // already saved
  resumingPending = true;
  try {
    let blob = null;
    if (p.audioId) { try { blob = await audioDB.getStrict(p.audioId); } catch { return; } } // storage not readable just now: try again later
    if (!blob && !p.transcript) { dropPending(p); return; }
    let words = p.transcript || "", byRelay = p.byRelay;
    if (blob && (!words || p.lostAt) && !p.triedServer) {
      p.triedServer = true; saveLocal(); // once: never a paid call every few seconds
      try { const t = await serverWords(blob); if (t) { words = t; byRelay = true; p.lostAt = 0; } } catch {}
    }
    if (appBusy() || !(S.pending || []).some((x) => x.id === p.id)) return; // something opened meanwhile: try later
    toast("Finishing a recording that wasn't saved");
    openReview({ transcript: words, blob, pending: p, byRelay, amends: p.amends, lostAt: p.lostAt, lockedAt: p.lockedAt, phoneWords: p.phoneWords || "" });
  } finally { resumingPending = false; }
}

function stopRecording(cancel) {
  if (cancel) rec.cancelled = true;
  if (!rec.on) return;
  rec.on = false; clearInterval(rec.timer); rec.finishing = !cancel; keepAwake(false);
  try { rec.recog && rec.recog.stop(); } catch {}
  let done = false;
  const gen = rec.gen;
  const finish = async () => {
    if (done) return; done = true;
    rec.stream && rec.stream.getTracks().forEach((t) => t.stop());
    if (rec.cancelled) return;
    // Some iPhones hand over the audio only after "stop", and late: wait up to 6 more seconds for it.
    for (let w = 0; !rec.chunks.length && rec.media && gen === rec.gen && !rec.cancelled && !rec.skipServer && w < 30; w++) { await new Promise((r) => setTimeout(r, 200)); rec.diag.late = (w + 1) * 200; }
    if (rec.cancelled || gen !== rec.gen) return; // discarded while waiting (a new recording may have started)
    let blob = rec.chunks.length ? new Blob(rec.chunks, { type: (rec.media && rec.media.mimeType) || "audio/webm" }) : null;
    // Words that were on screen but went missing as the phone stopped listening are put back.
    if (!(rec.final + " " + rec.interim).trim() && rec.shown) rec.final = rec.shown;
    // A clip under ~2 KB is silence or a failed capture: don't claim it was kept.
    if (blob && blob.size < 2000) blob = null;
    rec.blob = blob;
    rec.diag.bytes = blob ? blob.size : (rec.chunks.length ? new Blob(rec.chunks).size : 0);
    const pending = await keepPending({ blob, transcript: (rec.final + " " + rec.interim).trim(), recordedAt: rec.started, amends: rec.amends, lostAt: rec.speechLostAt, lockedAt: rec.stoppedAt });
    // Closed (discarded) or a new recording started while the recording was being stored.
    if (rec.cancelled && gen === rec.gen) { dropPending(pending); if (pending && pending.audioId) audioDB.del([pending.audioId]); rec.finishing = false; return; }
    if (gen !== rec.gen) return; // kept, and finished later
    let transcript = (rec.final + " " + rec.interim).trim(), lostAt = rec.speechLostAt && rec.final ? rec.speechLostAt : 0, byRelay = false, serverError = "", phoneWords = "";
    // With signal, the relay's speech-to-text (Whisper, with names and medicines as spelling hints) turns
    // the whole recording into words: more accurate than the phone's, especially with accents (Sam,
    // 2026-10-20). Without signal, or if it returns nothing, the phone's own words are kept.
    if (blob && (!transcript || rec.speechLostAt || (cloudOn() && navigator.onLine)) && !rec.skipServer) {
      const h = $("#recHint"); if (h) h.textContent = "Turning your recording into words… (or tap Type instead)";
      rec.abort = new AbortController();
      // When the phone already has the words, wait less: on a weak signal its words are used instead.
      const had = !!transcript && !rec.speechLostAt;
      try {
        const t = await serverWords(blob, rec.abort.signal, had ? 20000 : 60000);
        // Whisper can invent words over silence or noise (even a medicine from the hints): when the phone
        // heard the note, Whisper's words are used only if most of them are the phone's words too.
        if (t && (!had || agreesWith(t, transcript))) { phoneWords = transcript; transcript = t; lostAt = 0; byRelay = true; }
      }
      catch (e) { if (!rec.skipServer && !rec.cancelled && !had) serverError = e.message || ""; }
      rec.abort = null;
      if (rec.cancelled || gen !== rec.gen) { // closed (discarded), or a new recording started (kept: finished later)
        if (gen === rec.gen) rec.finishing = false;
        if (rec.cancelled && gen === rec.gen && pending) { dropPending(pending); if (pending.audioId) audioDB.del([pending.audioId]); }
        return;
      }
    }
    rec.finishing = false;
    if (pending) { pending.transcript = transcript; pending.byRelay = byRelay; pending.phoneWords = phoneWords; pending.lostAt = lostAt; pending.triedServer = true; saveLocal(); }
    openReview({ transcript, blob, lostAt, lockedAt: rec.stoppedAt, byRelay, serverError, pending, amends: rec.amends, phoneWords });
  };
  const mic = $("#micBtn"); if (mic && !cancel) { mic.disabled = true; $("#recHint").textContent = "Finishing…"; }
  if (rec.media && rec.media.state !== "inactive") {
    rec.media.onstop = () => setTimeout(finish, 300);
    try { rec.media.stop(); } catch { setTimeout(finish, 300); }
    setTimeout(finish, 2000); // some phones never fire "stop": carry on with what was captured
  } else setTimeout(finish, 300);
}

async function openReview({ transcript, blob, typed, lostAt, lockedAt, byRelay, serverError, pending, amends, phoneWords = "" }) {
  // Notes are saved as soon as they're written (Sam's request): what was said is recorded as it was,
  // and anything to correct or add is added to it afterwards, so every change leaves a trace.
  const autoSave = true;
  const spoken = !typed && !!transcript; // words came from the phone's speech recognition
  const rawHeard = transcript; // exactly what the phone heard, kept with the note
  let baseline = transcript, reps = []; // baseline = heard words after remembered fixes
  if (spoken) ({ text: baseline, reps } = applyDict(transcript));
  transcript = baseline;
  let draft = null, needsRewrite = false, offered = null; const blobUrl = blob ? URL.createObjectURL(blob) : null;
  let saving = false;
  const s = sheet(`${sheetHead(typed ? "Type a care note" : "Check before saving")}<div id="rv" style="display:grid;gap:14px"></div>`,
    { guard: () => !saving && (!!blob || !!draft || !!(document.querySelector("#rvTx") || {}).value), onClose: () => {
        blobUrl && setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        if (pending && !S.notes.some((n) => n.id === pending.id)) { dropPending(pending); if (pending.audioId) audioDB.del([pending.audioId]); }
      } });
  const rv = $("#rv", s.root);
  const showInput = (msg) => {
    rv.innerHTML = `${msg ? `<div class="warn">${msg}</div>` : ""}
      ${blobUrl ? `<audio controls src="${blobUrl}"></audio>` : ""}
      <label class="f">${typed ? "What happened?" : "What you said"}<textarea id="rvTx" class="grow" style="min-height:200px" placeholder="e.g. Nana had porridge and a cup of tea, took her tablets with help.">${esc(transcript)}</textarea></label>
      <button class="btn primary block" id="rvGo">Write the note</button>`;
    autoGrow($("#rvTx")); // grows with the words as they're typed
    $("#rvGo").onclick = () => { transcript = $("#rvTx").value.trim(); if (!transcript) return toast("Add some words first"); run(); };
  };
  const run = async () => {
    rv.innerHTML = `<div class="recorder"><div class="spinner"></div><p class="muted" style="margin:0">Writing your care note…</p></div>`;
    draft = await tidy(transcript, !!amends);
    if (!rv.isConnected) return; // closed meanwhile
    draft.from = transcript; needsRewrite = false; offered = null; showDraft();
    if (autoSave && $("#rvSave", rv)) { offered = []; $("#rvSave", rv).click(); }
  };
  // Remembered fixes still in the words, one chip per fix.
  const chips = () => { const seen = new Map(); reps.forEach((r) => { if (!seen.has(r.key)) seen.set(r.key, r); }); return [...seen.values()]; };
  const showDraft = () => {
    const fixes = chips();
    rv.innerHTML = `${sourceTag(draft.source, draft.reason)}
      ${lockedAt ? `<div class="warn">Recording stopped at ${Math.floor(lockedAt / 60000)}:${String(Math.floor(lockedAt / 1000) % 60).padStart(2, "0")} because the screen locked or you left the app. Everything up to then is kept. To add more, save this note and record another.</div>` : ""}
      ${lostAt ? `<div class="warn">Only the first ${Math.floor(lostAt / 60000)}:${String(Math.floor(lostAt / 1000) % 60).padStart(2, "0")} of your recording was turned into words. Play it back and add anything missing under "What you said", then tap Rewrite.</div>` : ""}
      <label class="f">Care note<textarea id="rvNote" class="note-edit">${esc(draft.note)}</textarea></label>
      ${draft.unclear && draft.unclear.length ? `<div class="warn" style="display:grid;gap:8px"><span><strong>Check these words:</strong> ${draft.unclear.map(esc).join(", ")}</span>
        ${draft.unclear.map((w, k) => { const c = wordInContext(transcript, w) || wordInContext(draft.note, w) || wordInContext(transcript, unclearWords(w)) || wordInContext(draft.note, unclearWords(w)); return c ? `<div class="small" style="display:flex;gap:8px;align-items:baseline;justify-content:space-between"><span>${c.html}</span><button class="link small" data-showword="${k}" style="flex:none">Show me</button></div>` : ""; }).join("")}
        <span class="tiny muted">${blobUrl ? "Play the recording to hear what you said, then fix" : "Fix"} the words in "What you said" below.</span>
        ${spoken ? `<label class="f small" style="font-weight:400">Words often get misheard when the phone expects a different accent. Your accent is set to:
          <select id="rvAccent">${ACCENTS.map(([c, n]) => `<option value="${c}" ${c === speechLang() ? "selected" : ""}>English (${n})</option>`).join("")}</select></label>
          <span class="tiny muted">A change applies to your next recording. You can also change it in Settings.</span>` : ""}</div>` : ""}
      ${gapsHTML(draft)}
      ${draft.plan_sections && draft.plan_sections.length ? `<div><div class="eyebrow" style="margin-bottom:6px">Care plan</div><div class="chips">${draft.plan_sections.map((t) => `<span class="chip accent">${esc(t)}</span>`).join("")}</div></div>` : ""}
      <div><div class="eyebrow" style="margin-bottom:6px">Covers</div><div class="chips">${draft.categories.map((c) => `<span class="chip">${esc(c)}</span>`).join("") || '<span class="small muted">No categories found</span>'}</div></div>
      <div><div class="eyebrow" style="margin-bottom:6px">Flags</div><div class="flags" id="rvFlags">${draft.flags.length ? draft.flags.map((f, i) => `<div class="flag ${f.kind === "incident" ? "incident" : ""}"><div class="body"><span class="eyebrow">${f.kind === "incident" ? "Incident" : "To note"}</span><strong>${esc(f.title)}</strong><span class="small">${esc(f.detail)}</span></div><button class="link" data-rmflag="${i}">Remove</button></div>`).join("") : '<div class="empty">No flags. Nothing to note.</div>'}</div></div>
      <div class="card" style="display:grid;gap:10px;box-shadow:none">
        ${blobUrl ? `<audio controls src="${blobUrl}"></audio>` : ""}
        <label class="f">What you said${spoken ? ' <span class="muted" style="font-weight:400">(fix any misheard words)</span>' : ""}<textarea id="rvSaid" class="grow" style="min-height:180px">${esc(transcript)}</textarea></label>
        ${fixes.length ? `<div class="small" style="display:grid;gap:6px"><span class="muted">Fixed from your words:</span><div class="chips">${fixes.map((r) => `<span class="chip accent">${esc(r.from)} → ${esc(r.to)} <button class="link small" data-undo="${esc(r.key)}" style="padding:0 0 0 4px">Undo</button></span>`).join("")}</div></div>` : ""}
        ${needsRewrite ? '<div class="warn small">The care note above was written before this change. Rewrite it so it matches.</div>' : ""}
        <button class="btn secondary" id="rvRewrite" ${needsRewrite ? "" : "hidden"}>Rewrite the note from these words</button>
      </div>
      ${(() => { const earlier = S.notes.filter((n) => isToday(n.ts)).sort((a, b) => a.ts - b.ts);
        return earlier.length ? `<details class="card" style="box-shadow:none"><summary><strong>Earlier notes today (${earlier.length})</strong></summary>
          ${earlier.map((n) => `<div style="border-top:1px solid var(--line);padding-top:8px;margin-top:8px"><div class="tiny muted">${fmtTime(n.ts)} · ${esc(carer(n.carerId).name)}</div><p class="small" style="margin:4px 0 0">${esc(n.note)}</p>
            <p class="tiny muted" style="margin:4px 0 0">Words: ${esc(n.transcript)}</p></div>`).join("")}</details>` : ""; })()}
      <div id="rvLearn"></div>
      <div class="row"><button class="btn ghost" id="rvAgain">Re-record</button><button class="btn primary" id="rvSave">Save to record</button></div>
      <button class="link" id="rvDiscard" style="justify-self:center;color:var(--ink-2)">Discard</button>`;
    const said = $("#rvSaid", rv);
    if ($("#rvGapAdd", rv)) $("#rvGapAdd", rv).onclick = () => {
      // Jump to the end of "What you said" to add the missing details, then Rewrite.
      said.scrollIntoView({ block: "center" }); said.focus();
      if (!/\s$/.test(said.value)) said.value += " ";
      said.setSelectionRange(said.value.length, said.value.length); said.dispatchEvent(new Event("input"));
      $("#rvRewrite", rv).hidden = false;
    };
    rv.querySelectorAll("textarea.grow, #rvNote").forEach(autoGrow);
    rv.querySelectorAll("[data-showword]").forEach((b) => (b.onclick = () => {
      // Select the word where it is, so it's easy to see and fix.
      const w0 = draft.unclear[+b.dataset.showword];
      const w = [w0, unclearWords(w0)].find((x) => (said.value + $("#rvNote", rv).value).toLowerCase().includes(x.toLowerCase())) || w0;
      for (const box of [said, $("#rvNote", rv)]) {
        const i = box.value.toLowerCase().indexOf(w.toLowerCase());
        if (i >= 0) { box.scrollIntoView({ block: "center" }); box.focus(); box.setSelectionRange(i, i + w.length); return; }
      }
      toast("Those words have already been changed");
    }));
    said.oninput = () => { transcript = said.value; offered = null; $("#rvLearn", rv).innerHTML = ""; $("#rvRewrite", rv).hidden = !needsRewrite && said.value.trim() === draft.from.trim(); };
    $("#rvRewrite", rv).onclick = (e) => confirmInline(e.currentTarget, () => { transcript = said.value.trim(); if (!transcript) return toast("Add some words first"); run(); });
    rv.querySelectorAll("[data-undo]").forEach((b) => (b.onclick = () => {
      // A remembered fix was wrong here: put back exactly the words it changed, and forget it.
      const key = b.dataset.undo, fix = reps.find((r) => r.key === key);
      const unedited = said.value === baseline;
      const u = undoFix(baseline, reps, key); baseline = u.text; reps = u.reps;
      transcript = unedited ? baseline : said.value;
      forgetWord(key); needsRewrite = true; draft.note = $("#rvNote").value; showDraft();
      toast(unedited ? `Forgot: ${fix.from} → ${fix.to}` : `Forgot: ${fix.from} → ${fix.to}. You'd edited the words, so change them in the box too.`);
    }));
    if ($("#rvAccent", rv)) $("#rvAccent", rv).onchange = (e) => { setSpeechLang(e.target.value); toast("Accent saved for your next recording"); };
    rv.querySelectorAll("[data-rmflag]").forEach((b) => (b.onclick = () => { draft.flags.splice(+b.dataset.rmflag, 1); draft.note = $("#rvNote").value; transcript = said.value; showDraft(); }));
    $("#rvAgain").onclick = (e) => confirmInline(e.currentTarget, () => { s.close(); openRecorder({ amends }); });
    $("#rvDiscard").onclick = (e) => confirmInline(e.currentTarget, () => { if (pending) { dropPending(pending); if (pending.audioId) audioDB.del([pending.audioId]); } s.close(); toast("Discarded. Nothing was saved."); }, "Tap again to discard");
    $("#rvSave").onclick = async (e) => {
      if (saving) return;
      if (!rv.isConnected) return;
      const note = $("#rvNote", rv).value.trim(); if (!note) return toast("The note is empty");
      const finalSaid = (said.value || "").trim() || transcript;
      if (spoken && offered === null) {
        // First tap: offer to remember any misheard-word fixes (the carer confirms each one).
        const f = findFixes(baseline, finalSaid);
        f.forget.forEach(forgetWord);
        offered = f.offer;
        if (offered.length) {
          $("#rvLearn", rv).innerHTML = `<div class="card" style="display:grid;gap:8px;box-shadow:none"><strong class="small">Remember these fixes for next time?</strong>
            ${offered.map((o, i) => `<label class="check small"><input type="checkbox" data-learn="${i}" checked><span>${esc(o.from)} → ${esc(o.to)}</span></label>`).join("")}
            <span class="tiny muted">Untick any that were a change of meaning rather than a misheard word. Then tap Save again.</span></div>`;
          $("#rvLearn", rv).scrollIntoView({ block: "center" });
          return;
        }
      }
      saving = true; e.currentTarget.disabled = true; e.currentTarget.textContent = "Saving…";
      const keep = (offered || []).filter((o, i) => { const c = rv.querySelector(`[data-learn="${i}"]`); return c && c.checked; });
      rememberFixes(keep);
      noteFixesUsed([...new Set(reps.map((r) => r.key))].filter((k) => finalSaid.toLowerCase().includes(String(reps.find((r) => r.key === k).to).toLowerCase())));
      const id = pending ? pending.id : uid(); let audioId = pending && pending.audioId ? pending.audioId : null;
      if (blob && audioId && !(await audioDB.put(audioId, blob))) audioId = null; // make sure it's stored (same key, safe to repeat)
      if (blob && !audioId) {
        audioId = "a_" + id;
        if (!(await audioDB.put(audioId, blob))) {
          // Keep the screen open so nothing is lost: try again, or save the note without the recording.
          const btn = $("#rvSave");
          if (btn && !btn.dataset.noAudioOk) {
            saving = false; btn.disabled = false; btn.textContent = "Save without the recording";
            btn.dataset.noAudioOk = "1";
            return toast("The phone couldn't store the recording. Tap Save again to try, or it saves the note without the recording.");
          }
          audioId = null;
        }
      }
      const ts = (pending && pending.recordedAt) || Date.now();
      const extra = extraAssistanceNow();
      S.notes.push({ id, ts, approvedTs: Date.now(), carerId: (pending && pending.by) || stampId(), ...(amends ? { amends } : {}), ...(autoSave ? { auto: 1 } : {}), ...(extra ? { extra: 1 } : {}), transcript: finalSaid, ...(spoken && rawHeard !== finalSaid ? { heard: rawHeard, ...(byRelay ? { heardBy: "relay" } : {}) } : {}), ...(byRelay && phoneWords ? { phoneHeard: phoneWords.slice(0, 30000) } : {}), note, categories: draft.categories, ...(draft.source === "ai" && plan().sections.length ? { planSections: [...new Set(draft.plan_sections || [])].slice(0, 20) } : {}), audioId, source: draft.source });
      draft.flags.forEach((f) => S.flags.push({ id: uid(), ts, kind: f.kind, title: f.title, detail: f.detail, status: "open", noteId: id }));
      const savedNote = S.notes[S.notes.length - 1];
      S.observations = S.observations || [];
      for (const o of draft.source === "ai" ? draft.observations || [] : []) { const r = obsFromDraft(o, savedNote); if (r) S.observations.push(r); }
      // Copied to the cloud only once it's safely stored on this phone.
      if (!saveLocal() || !(await recStore.flush(KEY))) {
        // Not saved on this phone: take it back out so it isn't sent to the cloud half-saved.
        S.notes = S.notes.filter((n) => n.id !== id); S.flags = S.flags.filter((f) => f.noteId !== id); S.observations = (S.observations || []).filter((o) => o.noteId !== id); saveLocal(); // a slow write that lands later is replaced too
        if (audioId && !(pending && pending.audioId === audioId)) audioDB.del([audioId]); // the kept recording stays for the next try
        saving = false; const b = $("#rvSave"); if (b) { b.disabled = false; b.textContent = "Save to record"; }
        return;
      }
      scheduleSync(); dropPending(pending);
      s.close(); render();
      if (autoSave) openSavedNote(id, { unclear: draft.unclear || [], background: draft.background || [], gaps: draft.flags.some((f) => f.kind === "incident") ? draft.record_gaps || [] : [], lostAt, lockedAt, tasksDone: draft.tasks_done || [] });
      const inc = draft.flags.filter((f) => f.kind === "incident").length;
      // The carer's first note of this shift: remind them to hand over at the end of it.
      const firstOfShift = !extra && shiftNotes().filter((n) => n.carerId === stampId()).length === 1;
      toast((inc ? "Saved. Incident report added to Needs attention." : "Saved to the record.") + (firstOfShift ? " Don't forget to do a handover at the end of your shift." : "") + (keep.length ? ` Remembered ${keep.length} word fix${keep.length > 1 ? "es" : ""}.` : ""));
    };
  };
  if (typed || !transcript) showInput(!typed ? (blob ? (serverError && !/took too long|abort/i.test(serverError) ? esc(serverError) : "We couldn't turn your speech into words. Play it back and type a short version below.") : rec.firstUse ? "Nothing was picked up, because the phone was asking for permission to use the microphone. Close this and tap Record again: it works from now on." : `Nothing was picked up. Check the microphone, try again, or type the note.${recDiag()}`) : "");
  else run();
}

// The transcript with possibly misheard words highlighted (escaped first, then marked).
const markUnclear = (text, words) => {
  const raw = String(text || ""), pats = words.map((w) => String(w || "").trim()).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!pats.length) return esc(raw);
  // Whole words only (so "in" doesn't light up inside "thinking"); no lookbehind, for older iPhones.
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${pats.join("|")})(?=$|[^\\p{L}\\p{N}])`, "giu");
  let out = "", last = 0, m;
  while ((m = re.exec(raw))) {
    const start = m.index + m[1].length;
    out += esc(raw.slice(last, start)) + `<mark style="background:var(--follow);color:var(--surface);padding:0 3px;border-radius:3px">${esc(m[2])}</mark>`;
    last = start + m[2].length; re.lastIndex = last;
  }
  return out + esc(raw.slice(last));
};
// The note just saved, with anything to check, and a way to add to it (never to change it).
// Correcting a misheard word (Sam, 2026-10-16 and 20). Saved notes never change, so the correction is
// added underneath as a dated addition ("'cavalier' should read 'Cavilon'"), and the app can remember
// it so the same word is fixed next time. No AI involved: it's exactly what the carer typed.
function openWordFix(n, wrong = "", after) {
  const target = n.amends || n.id;
  const s = sheet(`${sheetHead("Correct a misheard word")}
    <p class="small muted" style="margin:0">The note stays as it was saved; your correction is added underneath, with your name and the time.</p>
    <label class="f">The word or words that are wrong<input type="text" id="wfWrong" maxlength="80" value="${esc(wrong)}" autocomplete="off" placeholder="e.g. cavalier cream"></label>
    <label class="f">What was actually said<input type="text" id="wfRight" maxlength="80" autocomplete="off" placeholder="e.g. Cavilon cream"></label>
    <label class="check"><input type="checkbox" id="wfLearn" checked><span>Remember this, so it's corrected next time I say it</span></label>
    <button class="btn primary block" id="wfSave">Add the correction</button>`);
  setTimeout(() => $(wrong ? "#wfRight" : "#wfWrong", s.root).focus(), 60);
  $("#wfSave", s.root).onclick = () => {
    const from = $("#wfWrong", s.root).value.trim(), to = $("#wfRight", s.root).value.trim();
    if (!from || !to) return toast("Fill in both boxes");
    if (from.toLowerCase() === to.toLowerCase()) return toast("The correction is the same as the word");
    const now = Date.now(), text = `Correction: "${from}" should read "${to}".`;
    S.notes.push({ id: uid(), ts: now, approvedTs: now, carerId: stampId(), amends: target, note: text, transcript: text, categories: [], source: "correction" });
    if ($("#wfLearn", s.root).checked) rememberFixes([{ from, to }]);
    save(); s.close(); render(); toast("Correction added to the note");
    if (after) after();
  };
}
function openSavedNote(id, { unclear = [], background = [], gaps = [], lostAt = 0, lockedAt = 0, tasksDone = [] } = {}) {
  const n = S.notes.find((x) => x.id === id); if (!n) return;
  const original = n.amends ? S.notes.find((x) => x.id === n.amends) : null;
  const fl = S.flags.filter((f) => f.noteId === id);
  const gapNames = { when: "when it happened", seen: "what you saw", done: "what you did", told: "who you told" };
  const s = sheet(`${sheetHead(n.amends ? "Addition saved" : "Saved")}
    <div class="source"><span class="dot"></span>Saved to the record at ${fmtTime(n.approvedTs || n.ts)}${original ? ` · added to the ${fmtTime(original.ts)} note` : ""}</div>
    <p class="note-text" style="white-space:pre-line">${esc(n.note)}</p>
    ${fl.length ? `<div style="display:grid;gap:6px"><div class="eyebrow">Flags raised</div>${fl.map((f) => `<div class="flag ${f.kind === "incident" ? "incident" : ""}"><div class="body"><strong>${esc(f.title)}</strong>${f.status === "resolved" ? ' <span class="muted small">(marked not needed)</span>' : ` <button class="link small" data-notneeded="${esc(f.id)}">Not needed</button>`}</div></div>`).join("")}</div>` : ""}
    ${(() => { const slot = careSlot(); const ts = tasksDone.map((title) => planTasks().find((t) => t.title === title)).filter((t) => t && !taskTick(t.id, slot.day));
      return ts.length ? `<div class="card" style="box-shadow:none;display:grid;gap:6px"><strong class="small">This note says these tasks were done. Tick them?</strong>${ts.map((t) => `<div class="row" style="justify-content:space-between;align-items:center;gap:8px"><span class="small">${esc(t.title)}</span><button class="btn secondary" data-svtask="${esc(t.id)}">Done</button></div>`).join("")}</div>` : ""; })()}
    ${noteMedsHTML(n)}
    ${noteObsHTML(n)}
    ${background.length ? `<div class="small" style="padding:10px 12px;border-radius:12px;background:var(--surface-2, #f3eff7)"><strong>Sounds like TV, radio or someone else in the background</strong>, so it was left out of the note: "${background.map(esc).join('", "')}". It's still in the words and the recording.</div>` : ""}
    ${lostAt || lockedAt ? `<div class="warn small">${lockedAt ? "The recording stopped early because the screen locked or you left the app." : "Only part of the recording was turned into words."} Play it back; tap <strong>Add to this note</strong> for anything missing.</div>` : ""}
    ${unclear.length ? `<div class="warn small" style="display:grid;gap:8px"><span>These words may have been misheard: <strong>${unclear.map(esc).join(", ")}</strong>. They're highlighted below. Play the recording; if something's wrong, tap <strong>Add to this note</strong> and say the correct version.</span>
      ${n.audioId ? `<audio controls preload="none" data-audio="${esc(n.audioId)}" style="width:100%"></audio>` : ""}
      <p class="note-text" style="margin:0;background:var(--surface, #fff);border-radius:8px;padding:10px 12px;font-size:17px;line-height:1.5">${markUnclear(n.transcript, unclear)}</p></div>` : ""}
    ${gaps.length ? `<div class="warn small">For a full incident record, you haven't said ${gaps.map((g) => gapNames[g] || g).map(esc).join(", ")}. Tap <strong>Add to this note</strong> to add it.</div>` : ""}
    ${unclear.length ? "" : `<details ${lostAt || lockedAt ? "open" : ""}><summary class="small">Recording and words</summary>${n.audioId ? `<audio controls preload="none" data-audio="${esc(n.audioId)}"></audio>` : ""}<p class="small muted" style="margin:8px 0 0">${esc(n.transcript)}</p></details>`}
    ${unclear.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span class="small"><strong>Correct:</strong></span>${unclear.map((w, i) => `<button class="btn secondary" data-wfix="${i}" style="min-height:40px;padding:6px 12px">${esc(w)}</button>`).join("")}</div>` : ""}
    <button class="link small" id="svFix" style="justify-self:start;min-height:40px">Correct a misheard word</button>
    <div class="row"><button class="btn secondary" id="svAdd">Add to this note</button><button class="btn ghost" id="svType">Type an addition</button></div>
    <button class="btn primary block" id="svDone">Done</button>
    <p class="tiny muted" style="margin:0;text-align:center">Saved notes aren't changed. Corrections and extra details are added underneath, with who added them and when.</p>`);
  // With misheard words (or a cut-short recording) the player is ready on this sheet; otherwise it loads when opened.
  const a = s.root.querySelector("audio[data-audio]");
  if (a && (unclear.length || lostAt || lockedAt)) loadAudio(a, true);
  else if (a) a.closest("details").addEventListener("toggle", () => loadAudio(a, true), { once: true });
  s.root.querySelectorAll("[data-obsfix]").forEach((b) => (b.onclick = () => { s.close(); openObsFix(b.dataset.obsfix, () => openSavedNote(id)); }));
  s.root.querySelectorAll("[data-notneeded]").forEach((b) => (b.onclick = () => confirmInline(b, () => {
    // Raised automatically but not needed: resolved with a reason (flags are never deleted).
    const f = S.flags.find((x) => x.id === b.dataset.notneeded); if (!f || f.status !== "open") return;
    Object.assign(f, { status: "resolved", resolvedTs: Date.now(), resolvedBy: stampId(), resolvedNote: "Raised automatically; the carer marked it not needed" }); touch(f); save();
    s.close(); openSavedNote(id, { unclear, gaps, lostAt, lockedAt, tasksDone }); render();
  }, "Tap again: not needed")));
  s.root.querySelectorAll("[data-svtask]").forEach((b) => (b.onclick = () => { const t = planTasks().find((x) => x.id === b.dataset.svtask); if (t) { tickTask({ t, day: careSlot().day }, "done", { noteId: id }); b.replaceWith(Object.assign(document.createElement("span"), { className: "small muted", textContent: "Ticked" })); } }));
  bindNoteMeds(s.root, n, () => { s.close(); openSavedNote(id, { unclear, gaps, lostAt, lockedAt, tasksDone }); });
  const target = n.amends || n.id; // additions always hang off the original note
  $("#svAdd", s.root).onclick = () => openRecorder({ amends: target });
  const again = () => openSavedNote(id, { unclear, gaps, lostAt, lockedAt, tasksDone });
  $("#svFix", s.root).onclick = () => { s.close(); openWordFix(n, "", again); };
  s.root.querySelectorAll("[data-wfix]").forEach((b) => (b.onclick = () => { s.close(); openWordFix(n, unclear[+b.dataset.wfix], again); }));
  $("#svType", s.root).onclick = () => openReview({ transcript: "", typed: true, amends: target });
  $("#svDone", s.root).onclick = () => s.close();
}
