// Panneau de réglages, boutons et raccourcis
"use strict";

/* ---------------- Réglages ---------------- */
const RANGES = [
  ["focus", "Durée du travail", 5, 180, 1, v => v + " min"],
  ["short", "Pause courte", 1, 30, 1, v => v + " min"],
  ["long", "Pause longue", 5, 60, 1, v => v + " min"],
  ["every", "Sessions avant la pause longue", 2, 8, 1, v => v],
];
const dur = $("#durations");
RANGES.forEach(([k, label, min, max, step, show]) => {
  const w = document.createElement("div"); w.className = "range";
  w.innerHTML = `<label for="r-${k}">${label}</label><output id="o-${k}"></output><input type="range" id="r-${k}" min="${min}" max="${max}" step="${step}">`;
  dur.appendChild(w);
  const inp = w.querySelector("input"), out = w.querySelector("output");
  const paint = () => { out.textContent = show(+inp.value); inp.style.setProperty("--p", ((inp.value - min) / (max - min) * 100) + "%"); };
  inp.value = cfg[k]; paint();
  inp.addEventListener("input", () => {
    cfg[k] = +inp.value; paint(); saveCfg();
    // sablier pas encore lancé : il prend la nouvelle durée ; session entamée : elle garde la sienne
    if (k === st.mode && !st.running && st.remaining >= st.len - 1){ st.len = total(st.mode); st.remaining = st.len; saveState(); draw(true); }
    if (k === "every") { st.done = Math.min(st.done, cfg.every); saveState(); }
    render();
  });
});
["showTime","autoBreak","autoFocus","wake","vibrate","sound","sandAmb"].forEach(k => {
  const el = $("#" + k); el.checked = !!cfg[k];
  el.addEventListener("change", () => {
    cfg[k] = el.checked; saveCfg();
    if (k === "sandAmb" && st.running){ ensureAudio(); ambient(cfg.sandAmb); }
    if (k === "showTime") applyTimeVis();
    if (k === "wake"){ cfg.wake && st.running ? wakeOn() : wakeOff(); }
  });
});
document.querySelectorAll(".sandpick").forEach(b => b.addEventListener("click", () => { cfg.sandColor = b.dataset.c; saveCfg(); applySand(); }));
/* Écoulement régulier (le niveau baisse à vitesse constante) ou réaliste (débit constant, comme un vrai sablier) */
const FLOW_HINTS = {
  regulier:"Le niveau baisse à vitesse constante : tu vois d'un coup d'œil le temps qui reste",
  reel:"Comme un vrai sablier : le sable coule toujours au même débit, le niveau descend de plus en plus vite à la fin"
};
function paintFlow(){
  if (!FLOW_HINTS[cfg.flow]) cfg.flow = "regulier";
  document.querySelectorAll(".flowpick").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === cfg.flow)));
  $("#flowHint").textContent = FLOW_HINTS[cfg.flow];
}
document.querySelectorAll(".flowpick").forEach(b => b.addEventListener("click", () => { cfg.flow = b.dataset.f; saveCfg(); paintFlow(); }));
paintFlow();
const vol = $("#volume"), volOut = $("#volumeOut");
const paintVol = () => { volOut.textContent = vol.value + " %"; vol.style.setProperty("--p", vol.value + "%"); };
vol.value = cfg.volume; paintVol();
vol.addEventListener("input", () => { cfg.volume = +vol.value; paintVol(); saveCfg(); if (master) master.gain.value = cfg.volume / 100; });
$("#testSound").addEventListener("click", () => { ensureAudio(); gong(); });
$("#resetStats").addEventListener("click", () => { stats = { date:today(), sessions:0, minutes:0 }; saveStats(); renderStats(); });

const body = document.body;
let lastFocus = null;
function openSheet(){ lastFocus = document.activeElement; body.classList.add("open"); setTimeout(() => $("#closeSettings").focus(), 50); }
function closeSheet(){ body.classList.remove("open"); lastFocus && lastFocus.focus && lastFocus.focus(); }
$("#openSettings").addEventListener("click", openSheet);
$("#closeSettings").addEventListener("click", closeSheet);
$("#veil").addEventListener("click", closeSheet);

/* ---------------- Commandes ---------------- */
toggleBtn.addEventListener("click", () => st.running ? pause() : start());
$("#reset").addEventListener("click", reset);
$("#skip").addEventListener("click", () => finish(false));
document.querySelectorAll(".mode").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
/* Glisser le doigt vers le haut ou le bas sur le sablier le retourne et relance la session.
   Le sens de rotation suit le geste : vers le bas à droite, il tourne dans le sens des aiguilles d'une montre. */
let swipe = null;
scene.addEventListener("pointerdown", e => {
  swipe = { x:e.clientX, y:e.clientY, t:performance.now() };
  try{ scene.setPointerCapture(e.pointerId); }catch(err){} // le geste compte même si le doigt sort du sablier
});
scene.addEventListener("pointerup", e => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y, quick = performance.now() - swipe.t < 900;
  const r = scene.getBoundingClientRect(), right = swipe.x > r.left + r.width / 2;
  swipe = null;
  if (quick && Math.abs(dy) > 50 && Math.abs(dy) > 1.5 * Math.abs(dx)) flipRestart((dy > 0) === right ? 1 : -1);
});
scene.addEventListener("pointercancel", () => { swipe = null; });
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && body.classList.contains("open")) return closeSheet();
  if (body.classList.contains("open") || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === "Space"){
    if (e.target.closest && e.target.closest("button, input")) return; // Espace sur un bouton : le bouton s'en charge (sinon double action)
    e.preventDefault(); st.running ? pause() : start();
  }
  else if (e.key === "r" || e.key === "R") reset();
  else if (e.key === "n" || e.key === "N") finish(false);
});
