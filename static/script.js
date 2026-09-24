/* NOTE: never name a global variable "history" — it clashes with window.history
   and throws a SyntaxError that stops the whole script (this was your main bug). */

const $ = id => document.getElementById(id);
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const POOL = ["10:00 AM","11:00 AM","2:00 PM","3:00 PM","4:00 PM","5:00 PM"];

let today = new Date(); today.setHours(0,0,0,0);
let chatHistory = [];
let SLOTS = [];                          // loaded from the server (/slots)
let viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selDate = null, selTime = null;

const iso = d => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
const short = d => MONTHS[d.getMonth()].slice(0,3) + " " + d.getDate();
const esc = s => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const slotsFor = d => SLOTS.filter(s => s.iso === iso(d)).map(s => ({ t: s.time, booked: s.booked }));
const firstFree = d => slotsFor(d).find(s => !s.booked);
const isAvail = d => !!firstFree(d);
const parseDate = i => { const [y,m,dd] = i.split("-").map(Number); return new Date(y, m-1, dd); };

async function loadSlots(){
  try{ SLOTS = await (await fetch("/slots")).json(); }
  catch(e){ console.error(e); SLOTS = []; }
  if(selDate && !isAvail(selDate)) selDate = null;
  if(!selDate){ const s = SLOTS.find(x => !x.booked); if(s){ selDate = parseDate(s.iso); viewMonth = new Date(selDate.getFullYear(), selDate.getMonth(), 1); } }
  const f = selDate && firstFree(selDate);
  if(!selTime || !slotsFor(selDate || new Date(0)).some(x => x.t === selTime && !x.booked)) selTime = f ? f.t : null;
  renderAll();
}

/* ---------- calendar ---------- */
function renderCalendar(){
  const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
  const label = MONTHS[m] + " " + y;
  $("month-label").textContent = label;
  $("month-label-top").textContent = label;
  let html = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => `<div class="dow">${d}</div>`).join("");
  const start = new Date(y, m, 1 - new Date(y, m, 1).getDay());
  for(let i = 0; i < 42; i++){
    const d = new Date(start); d.setDate(start.getDate() + i);
    const out = d.getMonth() !== m;
    const cls = ["day"];
    if(out) cls.push("out");
    if(!isAvail(d)) cls.push("off"); else cls.push("has");
    if(selDate && iso(d) === iso(selDate)) cls.push("sel");
    const ok = isAvail(d);
    html += `<button class="${cls.join(" ")}" ${ok ? `data-ts="${d.getTime()}"` : "disabled"}>${d.getDate()}</button>`;
  }
  $("calendar").innerHTML = html;
  $("calendar").querySelectorAll("[data-ts]").forEach(b =>
    b.onclick = () => pickDate(new Date(+b.dataset.ts)));
}
function changeMonth(n){ viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + n, 1); renderCalendar(); }
function goToday(){ viewMonth = new Date(today.getFullYear(), today.getMonth(), 1); renderCalendar(); }

function pickDate(d){
  selDate = d;
  const f = firstFree(d); selTime = f ? f.t : null;
  viewMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  renderAll();
}

/* ---------- side slot list ---------- */
function renderSlotList(){
  if(!selDate){ $("sel-date").textContent = ""; $("slot-list").innerHTML = `<div class="empty">Pick a date to see times</div>`; return; }
  $("sel-date").textContent = WEEKDAYS[selDate.getDay()].slice(0,3) + ", " + short(selDate);
  $("slot-list").innerHTML = slotsFor(selDate).map(s => `
    <button class="slot-row ${s.booked ? "booked" : ""} ${s.t === selTime && !s.booked ? "sel" : ""}" data-t="${s.t}" ${s.booked ? "disabled" : ""}>
      <span class="dot"></span>${s.t}
      <span class="pill ${s.booked ? "bk" : "av"}">${s.booked ? "Booked" : "Available"}</span>
    </button>`).join("");
  $("slot-list").querySelectorAll("[data-t]").forEach(b =>
    b.onclick = () => { selTime = b.dataset.t; renderAll(); bookSlot(selDate, selTime); });
}

/* ---------- chat slot cards (next 5 open days) ---------- */
function renderCards(){
  const cards = [], seen = new Set();
  for(const s of SLOTS){
    if(s.booked || seen.has(s.iso)) continue;
    seen.add(s.iso); cards.push({ d: parseDate(s.iso), t: s.time });
    if(cards.length === 5) break;
  }
  $("slot-cards").innerHTML = cards.map((c,i) => `
    <div class="slot-card ${selDate && iso(c.d) === iso(selDate) && c.t === selTime ? "sel" : ""}">
      <h3>${WEEKDAYS[c.d.getDay()]}</h3><div class="d">${short(c.d)}</div>
      <div class="t">${c.t}</div>
      <button data-i="${i}">Select Slot</button>
    </div>`).join("") || `<div class="empty">No open slots right now</div>`;
  $("slot-cards").querySelectorAll("button").forEach(b => b.onclick = () => {
    const c = cards[+b.dataset.i]; selDate = c.d; selTime = c.t;
    viewMonth = new Date(c.d.getFullYear(), c.d.getMonth(), 1);
    renderAll(); bookSlot(c.d, c.t);
  });
}
function renderAll(){ renderCalendar(); renderSlotList(); renderCards(); }

/* ---------- chat ---------- */
function scrollDown(){ const a = $("chat-area"); a.scrollTop = a.scrollHeight; }
function addUser(text){
  $("chat-area").insertAdjacentHTML("beforeend",
    `<div class="msg user"><div class="bubble">${esc(text)}</div>
     <div class="user-av"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg></div></div>`);
  scrollDown();
}
function addAI(text, id){
  const clean = esc(String(text).replaceAll("**",""));
  $("chat-area").insertAdjacentHTML("beforeend",
    `<div class="msg ai" ${id ? `id="${id}"` : ""}><div class="orb orb-sm"></div><div class="bubble">${clean}</div></div>`);
  scrollDown();
}
async function askBot(message){
  addAI("Typing…", "typing");
  try{
    const r = await fetch("/chat", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ message, history: chatHistory })
    });
    if(!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    $("typing")?.remove();
    const reply = data.reply ?? data.response ?? data.message ?? "";
    chatHistory.push({ role:"user", content:message }, { role:"assistant", content:reply });
    if(reply) addAI(reply);
    if(data.booking){ showConfirm(data.booking); await loadSlots(); }
    return data;
  }catch(e){
    console.error(e);
    $("typing")?.remove();
    addAI("Sorry, I couldn't reach the server. Please try again.");
    return null;
  }
}
async function sendMessage(){
  const input = $("user-input"), msg = input.value.trim();
  if(!msg) return;
  input.value = ""; addUser(msg);
  if(LEAD_WORDS.test(msg)) showLead();
  await askBot(msg);
}
$("user-input").addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); sendMessage(); } });

/* ---------- booking ---------- */
async function bookSlot(d, t){
  addUser(`Can you book ${WEEKDAYS[d.getDay()]} ${short(d)} at ${t}?`);
  try{
    const r = await fetch("/book", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ iso: iso(d), time: t }) });
    const data = await r.json();
    if(!data.ok){ addAI(data.error || "That slot isn't available."); await loadSlots(); return; }
    const b = data.booking, msg = `Done! Your consultation call is booked for ${b.day}, ${b.date} at ${b.time}.`;
    chatHistory.push({ role:"user", content:`Book ${b.day} ${b.date} ${b.time}` }, { role:"assistant", content:msg });
    addAI(msg); showConfirm(b); await loadSlots();
  }catch(e){ console.error(e); addAI("Sorry, I couldn't reach the server. Please try again."); }
}
function showConfirm(b){
  const id = b.id, full = `${b.day}, ${b.date}`, t = b.time;
  const dd = parseDate(b.iso), tm = t.match(/(\d+):(\d+) (AM|PM)/);
  dd.setHours(+tm[1] % 12 + (tm[3] === "PM" ? 12 : 0), +tm[2]);
  $("chat-area").insertAdjacentHTML("beforeend", `
    <div class="msg ai"><div class="orb orb-sm"></div>
    <div class="confirm">
      <div class="top"><div class="tick"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <div><h3>Booking Confirmed 🎉</h3><p>Your consultation call has been scheduled successfully.</p></div></div>
      <div class="facts">
        <div class="fact"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg><div>Date<b>${full}</b></div></div>
        <div class="fact"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><div>Time<b>${t}</b></div></div>
      </div>
      <div class="actions">
        <button class="btn primary" data-ics>Add to Calendar</button>
      </div></div></div>`);
  const box = $("chat-area").lastElementChild;
  box.querySelector("[data-ics]").onclick = () => downloadICS(dd, id);
  scrollDown();
}
function downloadICS(start, id){
  const f = d => d.toISOString().replace(/[-:]/g,"").split(".")[0] + "Z";
  const end = new Date(start.getTime() + 30 * 60000);
  const ics = ["BEGIN:VCALENDAR","VERSION:2.0","BEGIN:VEVENT",`UID:${id}@booking`,`DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(start)}`,`DTEND:${f(end)}`,"SUMMARY:Consultation call","DESCRIPTION:Consultation call with Jaseir Technology","END:VEVENT","END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type:"text/calendar" }));
  a.download = `consultation-${id}.ics`; a.click();
}
function resetChat(){
  chatHistory = [];
  document.querySelectorAll("#chat-area > .msg:not(:first-child)").forEach(n => n.remove());
}

/* ---------- header buttons ---------- */
function flash(el){ el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
function showToday(){                       // calendar icon: jump to the first open day
  viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const s = SLOTS.find(x => !x.booked);
  if(s) pickDate(parseDate(s.iso)); else renderCalendar();
  const card = $("calendar").closest(".card");
  card.scrollIntoView({ behavior:"smooth", block:"nearest" }); flash(card);
}
function toggleMenu(e){ e.stopPropagation(); $("more-menu").hidden = !$("more-menu").hidden; }
document.addEventListener("click", () => { $("more-menu").hidden = true; });
function menuAction(a){
  $("more-menu").hidden = true;
  if(a === "refresh"){ loadSlots(); flash($("slot-list")); }
  if(a === "demo"){ leadShownNow = true; $("lead-card").style.display = "block"; }
  if(a === "download"){
    const lines = [...document.querySelectorAll("#chat-area .msg")].map(m => {
      const t = m.querySelector(".bubble, .confirm h3"); if(!t) return "";
      return (m.classList.contains("user") ? "You: " : "Agent: ") + t.textContent.trim();
    }).filter(Boolean).join("\n\n");
    const a2 = document.createElement("a");
    a2.href = URL.createObjectURL(new Blob([lines], { type:"text/plain" }));
    a2.download = "chat.txt"; a2.click();
  }
}

/* ---------- lead card ---------- */
const LEAD_WORDS = /demo|(get|want|need|build|buy|create|make|order).{0,25}(agent|bot|chatbot)|pric(e|ing)|how much|for my (business|company|website|clinic|shop)/i;
let leadShownNow = false;
function showLead(){ leadShownNow = true; $("lead-card").style.display = "block"; }
function closeLead(){ $("lead-card").style.display = "none"; }
async function requestDemo(){
  const form = $("lead-form"), btn = $("demo-btn"), note = $("lead-msg");
  if(form.hidden){ form.hidden = false; btn.textContent = "Send request"; $("lead-email").focus(); return; }
  const email = $("lead-email").value.trim(), name = $("lead-name").value.trim();
  if(!/^\S+@\S+\.\S+$/.test(email)){ note.textContent = "Please enter a valid email."; return; }
  btn.disabled = true;
  try{
    const r = await fetch("/lead", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ name, email }) });
    if(!r.ok) throw new Error();
    form.hidden = true; btn.hidden = true; note.textContent = "Thanks! We'll contact you shortly.";
    setTimeout(closeLead, 3500);
  }catch(e){ note.textContent = "Couldn't send. Please try again."; btn.disabled = false; }
}
// popup opens on every visit, a few seconds after the page loads
const LEAD_DELAY_MS = 8000;
setTimeout(showLead, LEAD_DELAY_MS);

/* ---------- init ---------- */
loadSlots();
// keep the calendar current while the page stays open (new day, passed time slots, bookings by others)
setInterval(() => {
  const n = new Date(); n.setHours(0,0,0,0);
  if(n.getTime() !== today.getTime()){ today = n; viewMonth = new Date(n.getFullYear(), n.getMonth(), 1); }
  loadSlots();
}, 60000);