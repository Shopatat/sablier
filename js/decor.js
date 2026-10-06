// Décor animé : poussière qui flotte
"use strict";

/* ---------------- Poussière ---------------- */
const dust = $("#dust"), dctx = dust.getContext("2d");
let motes = [], DW = 0, DH = 0, dpr = 1;
function sizeDust(){
  dpr = Math.min(2, window.devicePixelRatio || 1); DW = innerWidth; DH = innerHeight;
  dust.width = DW * dpr; dust.height = DH * dpr; dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = reduced ? 0 : Math.round(Math.min(90, DW * DH / 9000));
  motes = Array.from({ length:n }, () => ({ x:Math.random()*DW, y:Math.random()*DH, r:.4 + Math.random()*1.6, vx:(Math.random()-.5)*.12, vy:-.03 - Math.random()*.14, p:Math.random()*6.28 }));
}
/* Appelé par la boucle principale. La poussière bouge 30 fois par seconde : assez pour l'œil,
   deux fois moins de travail pour le téléphone. */
let ambT = 0;
function ambient2d(t){
  if (t - ambT < 32) return;
  const k = Math.min(3, (t - ambT) / 16.7); ambT = t;
  dctx.clearRect(0, 0, DW, DH);
  for (const m of motes){
    m.x += (m.vx + Math.sin(t/2400 + m.p) * .08) * k; m.y += m.vy * k; m.p += .01 * k;
    if (m.y < -4){ m.y = DH + 4; m.x = Math.random()*DW; }
    if (m.x < -4) m.x = DW + 4; if (m.x > DW + 4) m.x = -4;
    const tw = .35 + .65 * Math.abs(Math.sin(m.p));
    dctx.fillStyle = `rgba(255,214,150,${(.12 + .35 * tw).toFixed(3)})`;
    dctx.beginPath(); dctx.arc(m.x, m.y, m.r, 0, 6.283); dctx.fill();
  }
}
