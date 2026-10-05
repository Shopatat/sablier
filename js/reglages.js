// Réglages, sauvegarde et état partagé
"use strict";

const $ = s => document.querySelector(s);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- Stockage ---------------- */
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
const DEF = { focus:25, short:5, long:15, timer:10, every:4, autoBreak:true, autoFocus:false, sound:true, sandAmb:false, showTime:false, flow:"regulier", sandColor:"white", volume:70, vibrate:true, wake:true };
const cfg = Object.assign({}, DEF, store.get("sablier.settings", {}));
const today = () => { const d = new Date(); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); };
let stats = store.get("sablier.stats", { date:today(), sessions:0, minutes:0 });
if (stats.date !== today()) stats = { date:today(), sessions:0, minutes:0 };
// timer : minuteur simple, hors cycle pomodoro (pas de pause derrière, pas compté dans les statistiques)
const MODES = { focus:"Travail", short:"Pause courte", long:"Pause longue", timer:"Minuteur" };
const total = m => cfg[m] * 60000;
// len : durée de la session en cours, figée à son lancement (changer un réglage pendant
// une session ne doit pas faire sauter le sable ni fausser les statistiques).
let st = Object.assign({ mode:"focus", running:false, endAt:0, remaining:null, done:0, len:0 }, store.get("sablier.state", {}));
if (!MODES[st.mode]) st.mode = "focus";
if (!(st.len > 0)) st.len = total(st.mode);
if (st.remaining == null || st.remaining > st.len) st.remaining = st.len;
const sessionLen = () => st.len || total(st.mode);
const saveState = () => store.set("sablier.state", st);
const saveCfg = () => store.set("sablier.settings", cfg);
const saveStats = () => store.set("sablier.stats", stats);
const remainingNow = () => st.running ? Math.max(0, st.endAt - Date.now()) : st.remaining;

/* ---------------- Couleur du sable ---------------- */
const SANDS = {
  white:{ sand:"#e9ecef", dk:"#8f98a4", hi:"#ffffff", rgb:"238,240,244" },
  gold: { sand:"#e4c070", dk:"#a77c35", hi:"#f6dc9a", rgb:"240,205,125" }
};
let SANDRGB = [233,236,239], GRAINRGB = "238,240,244";
function applySand(){
  const c = SANDS[cfg.sandColor] || SANDS.white, r = document.documentElement.style;
  SANDRGB = [1, 3, 5].map(i => parseInt(c.sand.slice(i, i + 2), 16)); GRAINRGB = c.rgb;
  r.setProperty("--sand", c.sand); r.setProperty("--sand-dk", c.dk); r.setProperty("--sand-hi", c.hi); r.setProperty("--grain-rgb", c.rgb);
  document.querySelectorAll(".sandpick").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.c === cfg.sandColor)));
}
