// Moteur 3D du sablier (canvas)
"use strict";

/* ---------------- Rendu du sablier ----------------
   Dessiné sur un canvas avec un petit moteur 3D maison : chaque face est projetée,
   éclairée et dessinée dans le bon ordre. Plus de faces qui passent les unes à travers
   les autres, quel que soit le navigateur.
   Le cadre : deux plateaux à gradins reliés par quatre colonnettes tournées.
   Le verre : une paroi épaisse (surface extérieure + intérieure), plus brillante vue de biais,
   avec des reflets qui glissent quand le sablier tourne.
   Le sable : grain visible, cratère qui se creuse en haut, tas en cône en bas. */
const bandSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='170' height='30' viewBox='0 0 170 30' fill='none' stroke='#4a3210' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>
<path d='M0 2h170M0 28h170' stroke-width='1.2' opacity='.7'/><path d='M2 5v20M168 5v20' opacity='.6'/>
<ellipse cx='14' cy='9' rx='3.6' ry='4.4'/><path d='M14 13.4v12M8.5 15.5h11'/>
<path d='M26 13q10-8 20 0q-10 6-20 0z'/><circle cx='36' cy='13' r='2.2' fill='#4a3210'/><path d='M36 16l-2 8M40 16q3 6 7 5'/>
<path d='M54 16l3-3 3 3 3-3 3 3 3-3 3 3'/><path d='M54 21l3-3 3 3 3-3 3 3 3-3 3 3' opacity='.7'/>
<path d='M90 25q-5-11 2-21q3 11-2 21z'/>
<circle cx='106' cy='14' r='6.5'/><circle cx='106' cy='14' r='1.6' fill='#4a3210'/>
<path d='M120 24h14M122 24v-9h10v9M121 15q6-9 12 0'/>
<ellipse cx='150' cy='15' rx='5' ry='7'/><path d='M150 8v14M145 12l-4-2M145 18l-4 2M155 12l4-2M155 18l4 2'/>
</svg>`;
const bandImg = new Image(); let bandReady = false;
bandImg.onload = () => { bandReady = true; makeBand(); };
bandImg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(bandSvg);

const cvs = $("#hg"), ctx = cvs.getContext("2d"), scene = $("#scene"), app = $("#app");
const DEG = Math.PI / 180, K = Math.tan(32 * DEG), CN = 32, PERSP = 1100, TAU = 2 * Math.PI;
let G = null, MODEL = null, CW = 0, CH = 0, DPR = 1, strip = null, grain = null;
let sandFrac = 1, flipT0 = 0, streamA = 0;

/* Profil d'une colonnette, du plateau jusqu'au milieu (l'autre moitié est le miroir).
   [position le long de la colonne 0 → 0,5, rayon en multiples de G.R] */
const PROFILE = [[0,1.55],[.02,1.55],[.03,1.15],[.042,1.15],[.052,1.42],[.066,1.42],[.08,.92],[.105,.74],[.37,.66],[.42,.76],[.448,1.22],[.468,1.38],[.5,1.38]];

function build(){
  const r = scene.getBoundingClientRect();
  DPR = Math.min(2, window.devicePixelRatio || 1); CW = r.width; CH = r.height;
  cvs.width = Math.max(1, Math.round(CW * DPR)); cvs.height = Math.max(1, Math.round(CH * DPR));
  const S = Math.max(80, Math.min(CH * .36, CW * .42, 250));
  // S : côté de la base du verre, H : hauteur d'une ampoule, Ts/Tm/Tc : gradin, plateau, chapeau
  G = { S, H:S * .8, Ts:S * .035, Tm:S * .11, Tc:S * .024, W:S * 1.26, P:S * .565, R:S * .024 };
  $("#halo").style.setProperty("--halo", (S * 2.6) + "px");
  MODEL = {
    top:plate(-1), bot:plate(1),
    posts:[[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([a, b]) => post(a * G.P, b * G.P)),
    glass:[-1, 1].map(sg => ({ out:pyrFaces(sg * G.H, S / 2, "glass"), inn:pyrFaces(sg * G.H, S / 2 * .935, "glass") }))
  };
  makeBand();
}
function makeBand(){
  if (!bandReady || !G) return;
  const sc = 2, w = Math.round(G.W * sc), h = Math.round(G.Tm * sc);
  strip = document.createElement("canvas"); strip.width = w; strip.height = h;
  const c = strip.getContext("2d");
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(255,246,205,.6)"); g.addColorStop(.16, "rgba(255,246,205,0)");
  g.addColorStop(.84, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(40,24,4,.5)");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const bh = h * .74, bw = bh * 170 / 30, n = Math.ceil(w / bw);
  for (let i = 0, x = (w - n * bw) / 2; i < n; i++, x += bw) c.drawImage(bandImg, x, (h - bh) / 2, bw, bh);
}
/* Texture de grains : des points sombres et des points qui accrochent la lumière */
function makeGrain(){
  const n = 96, c = document.createElement("canvas"); c.width = c.height = n;
  const g = c.getContext("2d"), img = g.createImageData(n, n), d = img.data;
  for (let i = 0; i < d.length; i += 4){
    const r = Math.random();
    if (r < .1){ d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = 70 + Math.random() * 70; }
    else if (r < .16){ d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 90 + Math.random() * 110; }
  }
  g.putImageData(img, 0, 0);
  grain = ctx.createPattern(c, "repeat");
}
makeGrain();

/* -- petites maths 3D (repère CSS : x à droite, y vers le bas, z vers toi) -- */
const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const addv = (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
const rX = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1]*c - p[2]*s, p[1]*s + p[2]*c]; };
const rY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0]*c + p[2]*s, p[1], -p[0]*s + p[2]*c]; };
const rZ = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0]*c - p[1]*s, p[0]*s + p[1]*c, p[2]]; };
const mid = P => { let x = 0, y = 0, z = 0; for (const p of P){ x += p[0]; y += p[1]; z += p[2]; } return [x/P.length, y/P.length, z/P.length]; };

/* Une face, orientée automatiquement vers l'extérieur de son volume */
function face(pts, inside, mat, extra){
  let n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
  if (dot(n, sub(mid(pts), inside)) < 0){ pts = pts.slice().reverse(); n = [-n[0], -n[1], -n[2]]; }
  return Object.assign({ pts, n:nrm(n), mat }, extra || {});
}
function boxFaces(yA, yB, W, band, deco){
  const h = W / 2, y0 = Math.min(yA, yB), y1 = Math.max(yA, yB), inside = [0, (y0 + y1) / 2, 0], F = [];
  for (let i = 0; i < 4; i++){
    const a = i * Math.PI / 2;
    const tl = rY([-h, y0, h], a), tr = rY([h, y0, h], a), br = rY([h, y1, h], a), bl = rY([-h, y1, h], a);
    F.push(face([tl, tr, br, bl], inside, "gold", band ? { band:[tl, tr, bl] } : null));
  }
  const q = y => [[-h, y, -h], [h, y, -h], [h, y, h], [-h, y, h]];
  F.push(face(q(y0), inside, "gold", { flat:true, deco }), face(q(y1), inside, "gold", { flat:true, deco }));
  return F;
}
function pyrFaces(yb, hw, mat){ // pointe au goulot (0,0,0), base au niveau yb
  const c = [[-hw, yb, -hw], [hw, yb, -hw], [hw, yb, hw], [-hw, yb, hw]], inside = [0, yb * .6, 0], F = [];
  for (let i = 0; i < 4; i++) F.push(face([[0, 0, 0], c[i], c[(i + 1) % 4]], inside, mat, { base:[c[i], c[(i + 1) % 4]] }));
  return F;
}
/* Un plateau : gradin contre le verre, plateau gravé, chapeau à l'extérieur. sg = -1 en haut, 1 en bas. */
function plate(sg){
  const { S, H, Ts, Tm, Tc, W } = G, y0 = sg * H, y1 = y0 + sg * Ts, y2 = y1 + sg * Tm, y3 = y2 + sg * Tc;
  return { sg, yOut:y3, step:boxFaces(y0, y1, S), slab:boxFaces(y1, y2, W, true), cap:boxFaces(y2, y3, W * .82, false, true) };
}
/* Une colonnette tournée, découpée en anneaux pour les dessiner du plus loin au plus proche */
function post(cx, cz){
  const { H, Ts, R } = G, y0 = -(H + Ts), L = 2 * (H + Ts), N = 14;
  const prof = PROFILE.concat(PROFILE.slice(0, -1).reverse().map(([t, r]) => [1 - t, r]));
  const at = (r, y, a) => [cx + r * Math.cos(a), y, cz + r * Math.sin(a)], rings = [];
  for (let i = 0; i < prof.length - 1; i++){
    const ya = y0 + prof[i][0] * L, yb = y0 + prof[i + 1][0] * L, ra = prof[i][1] * R, rb = prof[i + 1][1] * R;
    const inside = [cx, (ya + yb) / 2, cz], F = [];
    for (let j = 0; j < N; j++){
      const a1 = j / N * TAU, a2 = (j + 1) / N * TAU;
      F.push(face([at(ra, ya, a1), at(ra, ya, a2), at(rb, yb, a2), at(rb, yb, a1)], inside, "post"));
    }
    rings.push({ c:inside, F });
  }
  return { c:[cx, 0, cz], rings };
}

/* -- éclairage : lumière blanche en haut à gauche + torche orangée à droite -- */
const LK = nrm([-.5, -.78, .6]), LT = nrm([.9, -.2, .4]);
const GOLD = [201, 162, 78], GOLDT = [228, 194, 112];
const L_PLATE = { amb:.3, kd:.7, torch:.3, kf:.18, ks:.35, sh:14 };
const L_POST = { amb:.24, kd:.7, torch:.35, kf:.22, ks:.95, sh:26 };
const L_SAND = { amb:.46, kd:.5, torch:.16, kf:.2, ks:0, sh:1 };
function shade(base, f, L){
  const N = f.N, V = nrm(sub(eye, f.C));
  const d = Math.max(0, dot(N, LK)), t = Math.max(0, dot(N, LT)) * L.torch;
  const k = L.amb + L.kd * d + L.kf * Math.max(0, dot(N, V));
  let s = 0, s2 = 0;
  if (L.ks){ // reflet du métal : blanc pour la lumière, orangé pour la torche
    s = L.ks * Math.pow(Math.max(0, dot(N, nrm(addv(LK, V)))), L.sh);
    s2 = L.ks * .7 * Math.pow(Math.max(0, dot(N, nrm(addv(LT, V)))), L.sh * .6);
  }
  const c = (b, w, o) => Math.min(255, b * k + w * s + o * (t + s2)) | 0;
  return `rgb(${c(base[0], 255, 255)},${c(base[1], 240, 155)},${c(base[2], 200, 70)})`;
}

/* -- rendu d'une image -- */
let T, proj, eye;
function prep(f){
  f.P = f.pts.map(T); f.N = T(f.n); f.C = mid(f.P);
  f.front = dot(f.N, sub(eye, f.C)) > 0;
  f.Q = f.P.map(proj);
  return f;
}
function poly(Q){ ctx.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) ctx.lineTo(Q[i][0], Q[i][1]); ctx.closePath(); }
function path(Q){ ctx.beginPath(); poly(Q); }
function drawFace(f){
  path(f.Q);
  if (f.mat === "sand" || f.mat === "post"){
    const col = f.mat === "sand" ? shade(SANDRGB, f, L_SAND) : shade(GOLD, f, L_POST);
    ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = .8; ctx.stroke(); // bouche les micro-fentes
    return;
  }
  ctx.fillStyle = shade(f.flat ? GOLDT : GOLD, f, L_PLATE); ctx.fill();
  if (strip && f.band){
    const [a, b, c] = f.band.map(p => proj(T(p)));
    ctx.save(); path(f.Q); ctx.clip();
    ctx.transform((b[0]-a[0]) / strip.width, (b[1]-a[1]) / strip.width, (c[0]-a[0]) / strip.height, (c[1]-a[1]) / strip.height, a[0], a[1]);
    ctx.globalAlpha = .9; ctx.drawImage(strip, 0, 0); ctx.restore();
    path(f.Q);
  }
  ctx.strokeStyle = "rgba(60,38,10,.55)"; ctx.lineWidth = .8; ctx.stroke();
  if (f.deco){ // double filet gravé sur la face extérieure
    const c = mid(f.Q.map(q => [q[0], q[1], 0]));
    [[.1, "rgba(90,60,18,.5)", 1.2], [.15, "rgba(255,238,185,.28)", 1]].forEach(([t, s, w]) => {
      path(f.Q.map(q => [q[0] + (c[0] - q[0]) * t, q[1] + (c[1] - q[1]) * t])); ctx.strokeStyle = s; ctx.lineWidth = w; ctx.stroke();
    });
  }
}
function drawSolid(F){ const vis = []; for (const f of F){ prep(f); if (f.front){ drawFace(f); vis.push(f.Q); } } return vis; }

/* Grain du sable, posé en une fois sur toutes les faces visibles d'un tas */
function grainOver(polys, at){
  if (!grain || !polys.length) return;
  ctx.beginPath(); polys.forEach(poly);
  try{ grain.setTransform(new DOMMatrix([1, 0, 0, 1, Math.round(at[0]), Math.round(at[1])])); }catch(e){}
  ctx.save(); ctx.globalAlpha = .32; ctx.fillStyle = grain; ctx.fill(); ctx.restore();
}

/* Reflets de fenêtre sur une face de verre : ils glissent quand la face tourne */
function streaks(f){
  let b0 = proj(T(f.base[0])), b1 = proj(T(f.base[1]));
  if (b1[0] < b0[0]) [b0, b1] = [b1, b0];
  const dx = b1[0] - b0[0], dy = b1[1] - b0[1], u = .3 + .9 * f.N[0];
  const at = v => Math.min(1, Math.max(0, (v + 1) / 3));
  const g = ctx.createLinearGradient(b0[0] - dx, b0[1] - dy, b1[0] + dx, b1[1] + dy);
  g.addColorStop(at(u - .15), "rgba(255,255,255,0)");
  g.addColorStop(at(u - .05), "rgba(255,255,255,.16)");
  g.addColorStop(at(u), "rgba(255,255,255,.3)");
  g.addColorStop(at(u + .025), "rgba(255,255,255,.04)");
  g.addColorStop(at(u + .1), "rgba(255,228,190,.13)");
  g.addColorStop(at(u + .14), "rgba(255,228,190,0)");
  ctx.fillStyle = g; path(f.Q); ctx.fill();
}
function drawGlass(gl, front){
  // paroi intérieure : juste un liseré, c'est lui qui donne l'épaisseur du verre
  for (const f of gl.inn){
    if (f.front !== front) continue;
    path(f.Q); ctx.strokeStyle = front ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.07)"; ctx.lineWidth = .7; ctx.stroke();
  }
  for (const f of gl.out){
    if (f.front !== front) continue;
    const V = nrm(sub(eye, f.C)), fr = Math.pow(1 - Math.abs(dot(f.N, V)), 3);
    path(f.Q);
    if (front){
      const sp = Math.pow(Math.max(0, dot(f.N, nrm(addv(LK, V)))), 60), tsp = Math.pow(Math.max(0, dot(f.N, nrm(addv(LT, V)))), 40);
      ctx.fillStyle = `rgba(222,230,242,${(.02 + .26 * fr + .5 * sp).toFixed(3)})`; ctx.fill();
      if (tsp > .01){ ctx.fillStyle = `rgba(255,175,100,${(.3 * tsp).toFixed(3)})`; ctx.fill(); }
      streaks(f);
      path(f.Q); ctx.strokeStyle = "rgba(12,7,2,.3)"; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${(.32 + .4 * fr).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke();
    } else {
      ctx.fillStyle = `rgba(190,200,215,${(.03 + .1 * fr).toFixed(3)})`; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.17)"; ctx.lineWidth = .8; ctx.stroke();
    }
  }
}

/* Sable du haut. Son niveau baisse à vitesse constante (et non comme un vrai sablier,
   qui se vide de plus en plus vite à la fin) : on lit le temps restant d'un coup d'œil.
   Dès que ça coule, un cratère se creuse au centre. */
function drawTopSand(){
  const frac = sandFrac;
  if (frac < .002) return [];
  const { S, H } = G, y = -frac * H, hw = .925 * S / 2 * frac;
  const vis = drawSolid(pyrFaces(y, hw, "sand"));
  const top = prep(face([[-hw, y, -hw], [hw, y, -hw], [hw, y, hw], [-hw, y, hw]], [0, 0, 0], "sand"));
  if (!top.front) return vis;
  const rc = .62 * hw, dc = Math.min(rc * K * Math.min(1, (1 - frac) * 30), frac * H * .8);
  if (dc > .4){
    const n = 28, ring = [], F = [], sink = [0, y + dc, 0], under = [0, y + dc + H, 0];
    for (let i = 0; i < n; i++) ring.push([rc * Math.cos(i / n * TAU), y, rc * Math.sin(i / n * TAU)]);
    for (let i = 0; i < n; i++) F.push(face([ring[i], ring[(i + 1) % n], sink], under, "sand"));
    ctx.save(); path(top.Q); ctx.clip(); drawSolid(F); ctx.restore();
    ctx.beginPath(); poly(top.Q); poly(ring.map(p => proj(T(p))));
    ctx.fillStyle = shade(SANDRGB, top, L_SAND); ctx.fill("evenodd");
  } else drawFace(top);
  vis.push(top.Q);
  return vis;
}
/* Sable du bas : un cône qui grossit, puis le fond qui se remplit avec un dôme dessus */
function heapParts(frac){
  if (frac > .999) return { fr:[], cone:[], cap:null, apex:G.H };
  const { S, H } = G, shp = heap(1 - frac);
  const f = shp.y / (H / S), yl = H - f * H, hb = .925 * S / 2, ht = hb * (1 - f);
  const fr = []; let cap = null;
  if (f > .002){
    const b = [[-hb, H, -hb], [hb, H, -hb], [hb, H, hb], [-hb, H, hb]], t = b.map(p => [p[0] * (1 - f), yl, p[2] * (1 - f)]);
    const inside = [0, H - f * H / 2, 0];
    for (let i = 0; i < 4; i++) fr.push(face([b[i], b[(i + 1) % 4], t[(i + 1) % 4], t[i]], inside, "sand"));
    if (ht > .4){ cap = face(t, inside, "sand"); fr.push(cap); }
  }
  const rr = shp.R * S * .925, hh = K * shp.R * S, cone = [];
  if (rr > .6){
    const apex = [0, yl - hh, 0], inside = [0, yl - hh / 4, 0];
    for (let i = 0; i < CN; i++){
      const a1 = i / CN * TAU, a2 = (i + 1) / CN * TAU;
      cone.push(face([apex, [rr * Math.cos(a1), yl, rr * Math.sin(a1)], [rr * Math.cos(a2), yl, rr * Math.sin(a2)]], inside, "sand"));
    }
  }
  return { fr, cone, cap, apex:yl - hh };
}

function drawStream(apexY, now, k){
  if (streamA < .02) return;
  const p0 = proj(T([0, 0, 0])), p1 = proj(T([0, apexY - 1, 0]));
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy);
  if (len < 3) return;
  const px = -dy / len, py = dx / len, c = `rgba(${GRAINRGB},`;
  ctx.save(); ctx.globalAlpha = streamA; ctx.lineCap = "round";
  ctx.shadowColor = c + ".9)"; ctx.shadowBlur = 6;
  for (let j = 0; j < 2; j++){ // deux brins qui s'enroulent
    ctx.beginPath();
    for (let i = 0; i <= 40; i++){
      const s = i / 40, w = 1.1 * k * Math.sin(s * len / 5 - now / 55 + j * Math.PI) * Math.min(1, s * 8);
      const x = p0[0] + dx * s + px * w, y = p0[1] + dy * s + py * w;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = c + (j ? ".75)" : ".95)"); ctx.lineWidth = 1.5 * k; ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]);
  ctx.setLineDash([1.5, 7]); ctx.lineDashOffset = -now * .16;
  ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = 1.3 * k; ctx.stroke(); ctx.setLineDash([]);
  const r = 8 * k * (.85 + .15 * Math.sin(now / 40)), g = ctx.createRadialGradient(p1[0], p1[1], 0, p1[0], p1[1], r);
  g.addColorStop(0, c + ".85)"); g.addColorStop(1, c + "0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p1[0], p1[1], r, r * .55, 0, 0, 7); ctx.fill();
  ctx.restore();
}

/* Une ampoule de verre et son sable (sg = -1 en haut, 1 en bas) */
function drawChamber(sg, now){
  const gl = MODEL.glass[sg < 0 ? 0 : 1];
  gl.out.forEach(prep); gl.inn.forEach(prep);
  drawGlass(gl, false);
  const anchor = proj(T([0, sg * G.H / 2, 0]));
  if (sg < 0) grainOver(drawTopSand(), anchor);
  else {
    const hp = heapParts(sandFrac), above = hp.cap ? prep(hp.cap).front : true;
    const vis = above ? drawSolid(hp.fr).concat(drawSolid(hp.cone)) : drawSolid(hp.cone).concat(drawSolid(hp.fr));
    grainOver(vis, anchor);
    drawStream(hp.apex, now, PERSP / (PERSP - T([0, G.H / 2, 0])[2]));
  }
  drawGlass(gl, true);
}
function drawPost(p){
  for (const r of p.rings) r.z = T(r.c)[2];
  p.rings.sort((a, b) => a.z - b.z).forEach(r => drawSolid(r.F));
}
/* Le plateau est-il vu par sa face extérieure ? */
function outerVisible(p){ return dot(T([0, p.sg, 0]), sub(eye, T([0, p.yOut, 0]))) > 0; }

function render3d(now){
  if (!CW || !MODEL) return;
  const t = now / 1000 + 4, P2 = 2 * Math.PI;
  const ang = reduced ? { bob:0, tx:-14 * DEG, ry:-24 * DEG, rz:0, rx:0 } : {
    bob: 7 * Math.sin(t * P2 / 11),
    tx: (-7.5 + 16.5 * Math.sin(t * P2 / 14.6)) * DEG,
    ry: 38 * Math.sin(t * P2 / 22) * DEG,
    rz: 6.5 * Math.sin(t * P2 / 17.8 + 1) * DEG,
    rx: 4.5 * Math.sin(t * P2 / 12.9 + 2) * DEG
  };
  let flip = 0;
  if (flipT0){ const u = Math.min(1, (now - flipT0) / 1500); flip = Math.PI * (u < .5 ? 4*u*u*u : 1 - Math.pow(-2*u + 2, 3) / 2); }
  const M = p => rX(rY(rZ(rX(rZ(p, flip), ang.rx), ang.rz), ang.ry), ang.tx);
  const ex = M([1, 0, 0]), ey = M([0, 1, 0]), ez = M([0, 0, 1]);
  T = p => [ex[0]*p[0] + ey[0]*p[1] + ez[0]*p[2], ex[1]*p[0] + ey[1]*p[1] + ez[1]*p[2], ex[2]*p[0] + ey[2]*p[1] + ez[2]*p[2]];
  const vx = CW / 2, vy = CH * .42, ox = CW / 2, oy = CH / 2 + ang.bob;
  eye = [vx - ox, vy - oy, PERSP];
  proj = p => { const k = PERSP / (PERSP - p[2]); return [vx + (ox + p[0] - vx) * k, vy + (oy + p[1] - vy) * k]; };

  const target = (st.running && !turning && sandFrac > .001) ? 1 : 0;
  streamA += (target - streamA) * .12;

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, CW, CH);
  const byZ = (a, b) => a.z - b.z;
  // Ordre de dessin, du plus loin au plus proche :
  // plateau vu de l'intérieur, colonnettes de derrière, verre et sable, colonnettes de devant, plateau vu de l'extérieur.
  const plates = [MODEL.top, MODEL.bot].map(p => ({ p, out:outerVisible(p) }));
  for (const { p, out } of plates){ if (out) drawSolid(p.step); else { drawSolid(p.cap); drawSolid(p.slab); drawSolid(p.step); } }
  const posts = MODEL.posts.map(p => ({ p, z:T(p.c)[2] })).sort(byZ);
  posts.filter(o => o.z < 0).forEach(o => drawPost(o.p));
  [-1, 1].map(sg => ({ sg, z:T([0, sg * G.H / 2, 0])[2] })).sort(byZ).forEach(c => drawChamber(c.sg, now));

  // reflet au goulot
  const n = proj(T([0, 0, 0])), g = ctx.createRadialGradient(n[0], n[1], 0, n[0], n[1], 9);
  g.addColorStop(0, "rgba(255,252,235,.95)"); g.addColorStop(.4, "rgba(255,225,160,.35)"); g.addColorStop(1, "rgba(255,210,140,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n[0], n[1], 9, 0, 7); ctx.fill();

  posts.filter(o => o.z >= 0).forEach(o => drawPost(o.p));
  for (const { p, out } of plates) if (out){ drawSolid(p.slab); drawSolid(p.cap); }
}

/* Temps écoulé (0 → 1) → forme du tas, en unités où la base fait 1.
   La hauteur du sable suit le temps, quelle que soit la largeur du verre.
   Phase 1 : un cône grossit au centre jusqu'à toucher les parois.
   Phase 2 : le fond se remplit à plat (niveau y) avec le cône posé dessus, jusqu'au goulot. */
function heap(e){
  const Hu = G.H / G.S, target = e * Hu;
  if (target <= K * .5) return { y:0, R:target / K };
  const y = Math.min(Hu, (target - K / 2) / (1 - K / (2 * Hu)));
  return { y, R:.5 * (1 - y / Hu) };
}
