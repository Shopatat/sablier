// Logique du pomodoro et affichage du temps
"use strict";

/* ---------------- Écran allumé ---------------- */
let lock = null;
async function wakeOn(){ if (!cfg.wake || !("wakeLock" in navigator) || lock) return; try{ lock = await navigator.wakeLock.request("screen"); lock.addEventListener("release", () => lock = null); }catch(e){} }
function wakeOff(){ try{ lock && lock.release(); }catch(e){} lock = null; }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && st.running) wakeOn(); });

/* ---------------- Logique du minuteur ---------------- */
let turning = false;
function start(){
  if (turning) return;
  ensureAudio(); swish();
  if (st.remaining <= 0) st.remaining = total(st.mode);
  st.endAt = Date.now() + st.remaining; st.running = true;
  ambient(cfg.sandAmb); wakeOn(); saveState(); render();
}
function pause(){
  st.remaining = remainingNow(); st.running = false;
  ambient(false); wakeOff(); saveState(); render();
}
function reset(){
  if (turning) return;
  st.running = false; st.remaining = total(st.mode);
  ambient(false); wakeOff(); saveState(); render(); draw(true);
}
function setMode(m){
  if (turning) return;
  st.mode = m; st.running = false; st.remaining = total(m);
  ambient(false); wakeOff(); saveState(); render(); draw(true);
}
function finish(natural){
  if (turning) return;
  const was = st.mode;
  st.running = false; st.remaining = 0; ambient(false);
  if (natural){
    if (cfg.sound){ ensureAudio(); was === "focus" ? gong() : chime(); }
    if (cfg.vibrate && navigator.vibrate){ try{ navigator.vibrate(was === "focus" ? [180,90,180,90,320] : [120,80,120]); }catch(e){} }
    if (was === "focus"){ stats.sessions++; stats.minutes += cfg.focus; saveStats(); renderStats(); }
  }
  let next;
  if (was === "focus"){ st.done++; next = st.done >= cfg.every ? "long" : "short"; }
  else { if (was === "long") st.done = 0; next = "focus"; }
  sandFrac = 0;
  turnOver(1, () => {
    st.mode = next; st.remaining = total(next); saveState();
    draw(true); render();
    if (next === "focus" ? cfg.autoFocus : cfg.autoBreak) start(); else wakeOff();
  });
}
/* On retourne le sablier (dir : 1 sens des aiguilles d'une montre, -1 l'autre sens).
   À mi-course, tout le sable passe dans l'ampoule qui va se retrouver en haut (voir render3d). */
function turnOver(dir, done){
  turning = true; flipDir = dir; render(); app.classList.add("idle");
  const end = () => { flipT0 = 0; turning = false; done(); };
  if (reduced){ sandFrac = 0; setTimeout(end, 300); }
  else { flipT0 = performance.now(); setTimeout(end, 1560); }
}
/* Retourner le sablier d'un glissé : la session en cours repart du début. */
function flipRestart(dir){
  if (turning) return;
  ensureAudio(); // pendant le geste, sinon l'iPhone bloque le son
  st.running = false; ambient(false);
  turnOver(dir, () => { st.remaining = total(st.mode); saveState(); draw(true); start(); });
}

/* ---------------- Affichage ---------------- */
const timeEl = $("#time"), statusEl = $("#status"), toggleBtn = $("#toggle"), pipsEl = $("#pips");
let lastSec = -1;
function fmt(ms){ const s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return String(m).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
function draw(force){
  const rem = remainingNow();
  if (!turning) sandFrac = Math.min(1, rem / total(st.mode));
  const sec = Math.ceil(rem / 1000);
  if (force || sec !== lastSec){
    lastSec = sec;
    const t = fmt(rem);
    timeEl.innerHTML = [...t].map(c => `<span${c === ":" ? ' class="colon"' : ""}>${c}</span>`).join("");
    timeEl.setAttribute("aria-label", t.replace(":", " minutes ") + " secondes");
    document.title = cfg.showTime ? `${t} · ${MODES[st.mode]}` : MODES[st.mode];
  }
}
function render(){
  document.querySelectorAll(".mode").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === st.mode)));
  app.classList.toggle("idle", !st.running);
  const fresh = st.remaining >= total(st.mode) && !st.running;
  app.classList.toggle("paused", !st.running && !fresh && !turning);
  toggleBtn.textContent = st.running ? "Pause" : (fresh ? "Démarrer" : "Reprendre");
  toggleBtn.disabled = turning;
  if (turning) statusEl.textContent = "On retourne le sablier…";
  else if (st.mode === "focus") statusEl.textContent = st.running ? "Concentration en cours" : (fresh ? "Prêt pour une session de travail" : "En pause");
  else statusEl.textContent = st.running ? (st.mode === "long" ? "Longue pause, profite" : "Petite pause, souffle un coup") : (fresh ? "La pause t'attend" : "Pause suspendue");
  let p = "";
  for (let i = 0; i < cfg.every; i++) p += `<div class="pip${i < st.done ? " on" : ""}"></div>`;
  pipsEl.innerHTML = p;
  pipsEl.setAttribute("aria-label", `${Math.min(st.done, cfg.every)} sessions sur ${cfg.every} avant la longue pause`);
}
// Minuteur affiché ou non : sans les chiffres, le sablier prend la place libérée.
function applyTimeVis(){ app.classList.toggle("notime", !cfg.showTime); build(); lastSec = -1; draw(true); }
function renderStats(){ $("#statSessions").textContent = stats.sessions; $("#statMinutes").textContent = stats.minutes; }

function loop(now){
  if (st.running && !turning){
    if (stats.date !== today()){ stats = { date:today(), sessions:0, minutes:0 }; saveStats(); renderStats(); }
    if (remainingNow() <= 0) finish(true);
  }
  draw(false);
  render3d(now || performance.now());
  requestAnimationFrame(loop);
}
