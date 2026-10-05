// Sons synthétisés (gong, carillon, sable)
"use strict";

/* ---------------- Son (synthétisé) ---------------- */
let ac = null, master = null, amb = null;
function ensureAudio(){
  try{
    if (!ac){ ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.connect(ac.destination); }
    if (ac.state === "suspended") ac.resume();
    master.gain.value = cfg.volume / 100;
  }catch(e){ ac = null; }
}
function partials(base, list, dur, when = 0, level = .35){
  if (!ac) return;
  const t0 = ac.currentTime + when;
  list.forEach(([m, g, d = 1]) => {
    const o = ac.createOscillator(), v = ac.createGain();
    o.type = "sine"; o.frequency.value = base * m;
    v.gain.setValueAtTime(0, t0); v.gain.linearRampToValueAtTime(level * g, t0 + .012);
    v.gain.exponentialRampToValueAtTime(.0001, t0 + dur * d);
    o.connect(v); v.connect(master); o.start(t0); o.stop(t0 + dur * d + .05);
  });
}
function noiseBuffer(sec){
  const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), d = b.getChannelData(0);
  let last = 0; for (let i = 0; i < d.length; i++){ const w = Math.random()*2-1; last = (last + .04*w) / 1.04; d[i] = last * 3 + w * .25; }
  return b;
}
const gong = () => { partials(98, [[1,1,1],[2.02,.55,.8],[2.76,.5,.7],[4.07,.28,.5],[5.43,.18,.4],[6.8,.09,.3]], 5.5, 0, .32); partials(196, [[1,.25,1]], 3, .02, .3); };
const chime = () => { partials(523.25, [[1,1],[2,.35,.7],[3.01,.2,.5],[4.17,.15,.4]], 2.4, 0, .22); partials(659.25, [[1,1],[2,.3,.7],[4.2,.12,.4]], 2.6, .22, .2); partials(783.99, [[1,1],[2,.3,.6]], 3, .44, .18); };
function swish(){
  if (!ac) return;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime;
  s.buffer = noiseBuffer(.8); f.type = "bandpass"; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(5200, t + .6); f.Q.value = .8;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18, t + .08); g.gain.exponentialRampToValueAtTime(.001, t + .7);
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
function ambient(on){
  if (!ac) return;
  if (on && !amb){
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    s.buffer = noiseBuffer(3); s.loop = true; f.type = "bandpass"; f.frequency.value = 4200; f.Q.value = .6;
    g.gain.value = 0; g.gain.linearRampToValueAtTime(.05, ac.currentTime + 1.2);
    lfo.frequency.value = .23; lg.gain.value = .015; lfo.connect(lg); lg.connect(g.gain);
    s.connect(f); f.connect(g); g.connect(master); s.start(); lfo.start();
    amb = { s, g, lfo };
  } else if (!on && amb){
    const a = amb; amb = null;
    try{ a.g.gain.cancelScheduledValues(ac.currentTime); a.g.gain.setTargetAtTime(0, ac.currentTime, .25); setTimeout(() => { try{ a.s.stop(); a.lfo.stop(); }catch(e){} }, 1200); }catch(e){}
  }
}
