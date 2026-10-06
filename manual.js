// Dignity Notes user manual: contents, search and Ask. Kept out of the page for the content policy.
if (window.top !== window.self) { document.documentElement.innerHTML = ""; throw new Error("framed"); }
// On a phone, start with the contents folded so the guide is the first thing you see; close it after picking a section.
const toc = document.querySelector("nav.toc details");
const narrow = matchMedia("(max-width:860px)");
if (narrow.matches) toc.open = false;
toc.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => { if (narrow.matches) toc.open = false; }));

/* Search and ask. Searching happens on this device. Ask sends only the question (no notes or client
   details) to the Dignity Notes relay, which answers from this manual using AI. */
const RELAY_URL = "https://dignity-notes-relay.workgroup-works.workers.dev";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const STOP = new Set("the a an and or to of in on at for is it do does how can i my me we you your what when where why which who with this that be are was if not from by as".split(" "));
const words = (q) => q.toLowerCase().split(/[^a-z0-9']+/).filter((w) => w.length > 1 && !STOP.has(w));
// Every section and every question in "Problems and questions" is a search result.
const items = [];
document.querySelectorAll("section.s").forEach((sec) => {
  const title = sec.querySelector("h2").textContent.replace(/^\d+/, "").trim();
  if (sec.id === "faq") sec.querySelectorAll("details.faq").forEach((d) => items.push({ el: d, id: sec.id, title: d.querySelector("summary").textContent.trim(), text: d.textContent }));
  else items.push({ el: sec, id: sec.id, title, text: sec.textContent });
});
items.forEach((it) => { it.lt = it.title.toLowerCase(); it.lx = it.text.toLowerCase().replace(/\s+/g, " "); });
function search(q) {
  const ws = words(q); if (!ws.length) return [];
  return items.map((it) => {
    let score = 0, hit = 0;
    for (const w of ws) { const re = new RegExp("\\b" + w.replace(/'/g, "")), inT = re.test(it.lt), inX = re.test(it.lx); if (inT || inX) hit++; score += (inT ? 3 : 0) + (inX ? 1 : 0); }
    return { it, score: hit >= Math.ceil(ws.length / 2) ? score + hit * 2 : 0 };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 5).map((r) => r.it);
}
function snippet(it, q) {
  const ws = words(q), t = it.text.replace(/\s+/g, " ").trim();
  const i = Math.max(0, ws.map((w) => t.toLowerCase().indexOf(w)).filter((x) => x >= 0).sort((a, b) => a - b)[0] || 0);
  let s = t.slice(Math.max(0, i - 50), i + 110);
  s = esc((i > 50 ? "…" : "") + s + "…");
  for (const w of ws) s = s.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"), "<mark>$1</mark>");
  return s;
}
function goTo(it) {
  if (it.el.tagName === "DETAILS") it.el.open = true;
  it.el.scrollIntoView({ behavior: "smooth", block: "start" });
}
const q = document.getElementById("askQ"), hits = document.getElementById("askHits"), ans = document.getElementById("askAnswer"), go = document.getElementById("askGo");
function showHits() {
  const found = search(q.value);
  hits.innerHTML = found.map((it, i) => `<li><a href="#${esc(it.id)}" data-hit="${i}"><strong>${esc(it.title)}</strong><span class="snip">${snippet(it, q.value)}</span></a></li>`).join("");
  hits.querySelectorAll("[data-hit]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); goTo(found[+a.dataset.hit]); }));
}
let t; q.addEventListener("input", () => { clearTimeout(t); t = setTimeout(showHits, 150); ans.innerHTML = ""; });
const sectionTitle = (id) => { const h = document.querySelector(`#${CSS.escape(id)} h2`); return h ? h.textContent.replace(/^\d+/, "").trim() : id; };
document.getElementById("askForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = q.value.trim(); if (question.length < 3) return;
  showHits();
  let session = null; try { session = JSON.parse(localStorage.getItem("nanacare.session") || "null"); } catch {}
  if (!session || !session.token || session.local) { ans.innerHTML = `<p class="note">To get an AI answer, <a href="./">open the app</a> and sign in, then come back to the manual. The matches above are from this manual.</p>`; return; }
  go.disabled = true; go.textContent = "Asking…"; ans.innerHTML = `<p class="note">Looking through the manual…</p>`;
  try {
    const r = await fetch(RELAY_URL + "/manual/ask", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.token }, body: JSON.stringify({ question }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) throw new Error("Your sign-in has ended. Open the app and sign in again.");
    if (r.status === 428) throw new Error("Open the app and accept the privacy notice first.");
    if (!r.ok) throw new Error(j.error || "Couldn't get an answer right now.");
    const links = (j.sections || []).filter((id) => document.getElementById(id)).map((id) => `<a href="#${esc(id)}">${esc(sectionTitle(id))}</a>`).join(" · ");
    ans.innerHTML = `<div class="answer">${esc(j.answer)}${links ? `<div class="src">Read more: ${links}</div>` : ""}</div><p class="note">Written by AI from this manual. If it doesn't look right, follow the links or use Help in the app.</p>`;
  } catch (err) {
    ans.innerHTML = `<p class="note">${esc(err.message === "Failed to fetch" ? "No connection. The matches above are from this manual." : err.message)}</p>`;
  } finally { go.disabled = false; go.textContent = "Ask"; }
});
