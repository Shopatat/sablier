// Panneau de réglages, boutons et raccourcis
"use strict";

/* ---------------- Réglages ---------------- */
const RANGES = [
  ["focus", "Durée du travail", 5, 90, 1, v => v + " min"],
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
    const old = total(st.mode);
    cfg[k] = +inp.value; paint(); saveCfg();
    if (k === st.mode && !st.running && st.remaining >= old - 1) { st.remaining = total(st.mode); saveState(); draw(true); }
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
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && body.classList.contains("open")) return closeSheet();
  if (body.classList.contains("open") || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === "Space"){ e.preventDefault(); st.running ? pause() : start(); }
  else if (e.key === "r" || e.key === "R") reset();
  else if (e.key === "n" || e.key === "N") finish(false);
});
