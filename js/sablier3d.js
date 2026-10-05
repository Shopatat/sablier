// Moteur 3D du sablier (canvas)
"use strict";

/* ---------------- Rendu du sablier ----------------
   Dessiné sur un canvas avec un petit moteur 3D maison : chaque face est projetée,
   éclairée et dessinée dans le bon ordre. Plus de faces qui passent les unes à travers
   les autres, quel que soit le navigateur.
   Le cadre : deux gros plateaux dorés gravés, comme le sablier du jeu Atmosfear (Khufu).
   Le verre : une paroi épaisse (surface extérieure + intérieure), plus brillante vue de biais,
   avec des reflets qui glissent quand le sablier tourne.
   Le sable : grain visible, dessus plat en haut comme dans le jeu, tas en cône en bas. */
/* Hiéroglyphes, dessinés dans une case de 24 × 30 : ankh, œil oudjat, pilier djed, scarabée,
   plume de Maât, disque solaire, eau, lotus, sceptre ouas. */
const GLYPHS = [
  '<ellipse cx="12" cy="9" rx="3.6" ry="5"/><path d="M5 15.5h14M12 14v13M9 27h6"/>',
  '<path d="M3 7.5Q12 3.5 21 6.5"/><path d="M3 12Q12 6.5 21 12Q12 16 3 12z"/><circle cx="12" cy="11.6" r="2.3" class="f"/><path d="M10.5 15.5L8.5 24M14 15.5q1.5 7 6 6.5q2-.6.6-2.6"/>',
  '<path d="M8 4.5q4-3 8 0M7 7.5h10M7 10.5h10M7 13.5h10M10 13.5v12M14 13.5v12M7.5 26.5h9"/>',
  '<path d="M9.5 8q2.5-4 5 0z"/><ellipse cx="12" cy="17.5" rx="5.5" ry="7.5"/><path d="M12 10v15M6.5 13.5l-4-2.5M6.3 18.5l-4 1.5M7.5 23l-3.5 3M17.5 13.5l4-2.5M17.7 18.5l4 1.5M16.5 23l3.5 3"/>',
  '<path d="M11 27.5C9.5 20 9 12 10.5 5C11.5 2.5 15 2.5 16.5 5.5C15 6 14 7 13.8 9C13.5 15 13 21 11 27.5z"/><path d="M11.4 24C11.2 18 11.4 12 12.2 7"/>',
  '<circle cx="12" cy="13" r="6.5"/><circle cx="12" cy="13" r="2" class="f"/><path d="M5 23h14"/>',
  '<path d="M2 11l2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5M2 16l2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5M2 21l2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5"/>',
  '<path d="M12 27V17"/><path d="M12 17C7 16.5 5 11 6.5 6.5c2 3 4.5 6 5.5 10.5c1-4.5 3.5-7.5 5.5-10.5C19 11 17 16.5 12 17z"/><path d="M12 16.5C10.8 12 11 8 12 4c1 4 1.2 8 0 12.5"/><path d="M8 27h8"/>',
  '<path d="M11 27V9"/><path d="M11 9c0-3 2-4.5 4.5-4l1.5 3.5"/><path d="M11 27l-2.5-2.5M11 27l2.5-2.5"/>'
];
const svgOf = (w, h, body, col, sw) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><style>.f{fill:${col}}</style>${body}</svg>`);
// Frise des côtés : neuf signes séparés par de fins filets, entre deux traits
const BAND_W = 4 + GLYPHS.length * 28;
const bandBody = '<path d="M0 1.2H' + BAND_W + 'M0 28.8H' + BAND_W + '" stroke-width="1"/>' +
  GLYPHS.map((g, i) => `<g transform="translate(${4 + i * 28} 0)">${g}</g><path d="M${2 + i * 28} 5v20" stroke-width=".6"/>`).join("");
// Panneau du dessus : double cadre en creux et disque solaire ailé au centre
const wing = '<path d="M158 172C128 156 92 150 56 158c10 7 12 13 8 21c32-2 64 2 94 10"/>' +
  '<path d="M150 173C124 163 96 160 70 165M150 181C124 175 98 172 72 174M152 187C128 183 104 181 80 182"/>' +
  '<path d="M64 179l-6 7M80 182l-5 8M96 183l-4 8M112 185l-3 8M128 186l-2 8"/>';
const panelBody = '<rect x="26" y="26" width="308" height="308" rx="3" stroke-width="3"/><rect x="38" y="38" width="284" height="284" rx="2" stroke-width="1.4"/>' +
  '<g transform="translate(180 178) scale(1.3) translate(-180 -178)">' +
  wing + '<g transform="translate(360 0) scale(-1 1)">' + wing + '</g>' +
  '<circle cx="180" cy="176" r="20" stroke-width="2.6"/><circle cx="180" cy="176" r="12" stroke-width="1.6"/>' +
  '<path d="M166 192q-3 8 2 12M194 192q3 8-2 12" stroke-width="2"/></g>';
// Gravé dans l'or : un trait sombre (le creux) doublé d'un liseré clair décalé (le bord qui prend la lumière)
const ENGRAVE = { dark:"#5a3a0a", light:"#fff3c2" };
const art = {};
[["bandD", BAND_W, 30, bandBody, ENGRAVE.dark, 1.7], ["bandL", BAND_W, 30, bandBody, ENGRAVE.light, 1.7],
 ["panelD", 360, 360, panelBody, ENGRAVE.dark, 2.4], ["panelL", 360, 360, panelBody, ENGRAVE.light, 2.4]].forEach(([k, w, h, b, c, sw]) => {
  const im = new Image(); im.onload = () => { art[k] = im; if (Object.keys(art).length === 4) makeBand(); }; im.src = svgOf(w, h, b, c, sw);
});
function engrave(c, d, l, x, y, w, h, off, a){
  c.globalAlpha = a * .8; c.drawImage(l, x + off, y + off, w, h);
  c.globalAlpha = a; c.drawImage(d, x, y, w, h); c.globalAlpha = 1;
}

const cvs = $("#hg"), ctx = cvs.getContext("2d"), scene = $("#scene"), app = $("#app");
const DEG = Math.PI / 180, K = Math.tan(32 * DEG), CN = 32, PERSP = 1100, TAU = 2 * Math.PI;
let G = null, MODEL = null, CW = 0, CH = 0, DPR = 1, strip = null, panel = null, grain = null;
let sandFrac = 1, flipT0 = 0, streamA = 0;

function build(){
  const r = scene.getBoundingClientRect();
  DPR = Math.min(2, window.devicePixelRatio || 1); CW = r.width; CH = r.height;
  cvs.width = Math.max(1, Math.round(CW * DPR)); cvs.height = Math.max(1, Math.round(CH * DPR));
  const S = Math.max(80, Math.min(CH * .36, CW * .5, 260));
  // S : côté de la base du verre, H : hauteur d'une ampoule, T : épaisseur d'un plateau, W : sa largeur
  G = { S, H:S * .8, T:S * .15, W:S * 1.06 };
  $("#halo").style.setProperty("--halo", (S * 2.6) + "px");
  MODEL = { glass:[-1, 1].map(sg => ({ out:pyrFaces(sg * G.H, S / 2, "glass"), inn:pyrFaces(sg * G.H, S / 2 * .935, "glass") })) };
  /* Les morceaux du sablier, de haut en bas, triés à chaque image (voir drawOrder).
     y0/y1 : tranche de hauteur occupée. */
  const { H, T } = G, objs = [];
  [-1, 1].forEach(sg => {
    const F = plate(sg);
    objs.push({ y0:Math.min(sg * H, sg * (H + T)), y1:Math.max(sg * H, sg * (H + T)), draw:() => drawSolid(F) });
    objs.push({ y0:Math.min(0, sg * H), y1:Math.max(0, sg * H), chamber:sg });
  });
  MODEL.objs = objs;
  makeBand();
}
function makeBand(){
  if (Object.keys(art).length < 4 || !G) return;
  const sc = 3, w = Math.round(G.W * sc), h = Math.round(G.T * sc);
  strip = document.createElement("canvas"); strip.width = w; strip.height = h;
  const c = strip.getContext("2d");
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(255,246,205,.6)"); g.addColorStop(.12, "rgba(255,246,205,0)");
  g.addColorStop(.86, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(40,24,4,.5)");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const bh = h * .62, bw = bh * BAND_W / 30, n = Math.max(1, Math.round(w / bw)), bw2 = w / n;
  for (let i = 0; i < n; i++) engrave(c, art.bandD, art.bandL, i * bw2, (h - bh) / 2, bw2, bh, sc * .45, .85);
  makePanel();
}
/* Panneau gravé du dessus des plateaux */
function makePanel(){
  const n = 540, p = document.createElement("canvas"); p.width = p.height = n;
  const c = p.getContext("2d");
  c.fillStyle = "rgba(90,60,18,.07)"; c.fillRect(n * 38 / 360, n * 38 / 360, n * 284 / 360, n * 284 / 360);
  engrave(c, art.panelD, art.panelL, 0, 0, n, n, 2, .8);
  panel = p;
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
  F.push(face(q(y0), inside, "gold", { flat:true, deco, panel:[q(y0)[0], q(y0)[1], q(y0)[3]] }),
         face(q(y1), inside, "gold", { flat:true, deco, panel:[q(y1)[0], q(y1)[1], q(y1)[3]] }));
  return F;
}
function pyrFaces(yb, hw, mat){ // pointe au goulot (0,0,0), base au niveau yb
  const c = [[-hw, yb, -hw], [hw, yb, -hw], [hw, yb, hw], [-hw, yb, hw]], inside = [0, yb * .6, 0], F = [];
  for (let i = 0; i < 4; i++) F.push(face([[0, 0, 0], c[i], c[(i + 1) % 4]], inside, mat, { base:[c[i], c[(i + 1) % 4]] }));
  return F;
}
/* Un plateau : un gros bloc doré, hiéroglyphes sur les côtés, panneau gravé dessus. sg = -1 en haut, 1 en bas. */
function plate(sg){
  const { H, T, W } = G, F = boxFaces(sg * H, sg * (H + T), W, true, true);
  F[sg < 0 ? 5 : 4].deco = false; // pas de gravure sur la face collée au verre
  return F;
}

/* -- éclairage : lumière blanche en haut à gauche + torche orangée à droite -- */
const LK = nrm([-.5, -.78, .6]), LT = nrm([.9, -.2, .4]);
const GOLD = [222, 192, 70], GOLDT = [240, 214, 100]; // jaune doré, comme dans le jeu
const L_PLATE = { amb:.3, kd:.7, torch:.3, kf:.18, ks:.35, sh:14 };
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
  if (f.mat === "sand"){
    const col = shade(SANDRGB, f, L_SAND);
    ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = .8; ctx.stroke(); // bouche les micro-fentes
    return;
  }
  ctx.fillStyle = shade(f.flat ? GOLDT : GOLD, f, L_PLATE); ctx.fill();
  if (strip && f.band){
    const [a, b, c] = f.band.map(p => proj(T(p)));
    ctx.save(); path(f.Q); ctx.clip();
    ctx.transform((b[0]-a[0]) / strip.width, (b[1]-a[1]) / strip.width, (c[0]-a[0]) / strip.height, (c[1]-a[1]) / strip.height, a[0], a[1]);
    ctx.globalAlpha = .95; ctx.drawImage(strip, 0, 0); ctx.restore();
    path(f.Q);
  }
  ctx.strokeStyle = "rgba(60,38,10,.55)"; ctx.lineWidth = .8; ctx.stroke();
  if (f.deco && panel){ // panneau gravé sur la face extérieure
    const [a, b, c] = f.panel.map(p => proj(T(p)));
    ctx.save(); path(f.Q); ctx.clip();
    ctx.transform((b[0]-a[0]) / panel.width, (b[1]-a[1]) / panel.width, (c[0]-a[0]) / panel.height, (c[1]-a[1]) / panel.height, a[0], a[1]);
    ctx.drawImage(panel, 0, 0); ctx.restore();
  }
}
function drawSolid(F){ const vis = []; for (const f of F){ prep(f); if (f.front){ drawFace(f); vis.push(f); } } return vis; }

/* Grain du sable : la texture est « collée » sur chaque face (elle suit sa position et son
   inclinaison), pour qu'elle ne glisse pas sur le sable quand le sablier tourne. */
function grainOn(F){
  if (!grain || !F.length) return;
  ctx.save(); ctx.globalAlpha = .32;
  for (const f of F){
    const p0 = f.pts[0], U = nrm(sub(f.pts[1], p0)), V = cross(f.n, U), L = 8;
    const s0 = proj(T(p0)), su = proj(T(addv(p0, U.map(x => x * L)))), sv = proj(T(addv(p0, V.map(x => x * L))));
    try{ grain.setTransform(new DOMMatrix([(su[0]-s0[0]) / L, (su[1]-s0[1]) / L, (sv[0]-s0[0]) / L, (sv[1]-s0[1]) / L, s0[0], s0[1]])); }catch(e){}
    ctx.fillStyle = grain; path(f.Q);
    ctx.fill();
  }
  ctx.restore();
}
function drawSand(F){ const vis = drawSolid(F); grainOn(vis); return vis; }

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
   Le dessus reste plat, comme dans le jeu. */
function drawTopSand(){
  const frac = sandFrac;
  if (frac < .002) return;
  const { S, H } = G, y = -frac * H, hw = .925 * S / 2 * frac;
  drawSand(pyrFaces(y, hw, "sand"));
  const top = prep(face([[-hw, y, -hw], [hw, y, -hw], [hw, y, hw], [-hw, y, hw]], [0, 0, 0], "sand"));
  if (!top.front) return;
  drawFace(top);
  grainOn([top]);
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

/* Filet de sable : des grains qui tombent en chute libre (lents au goulot, rapides en bas),
   serrés au départ et un peu dispersés à l'arrivée, avec quelques rebonds sur le tas.
   Tout se calcule à partir de l'heure : rien à retenir d'une image à l'autre. */
const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function drawStream(apexY, now){
  if (streamA < .02) return;
  const L = apexY - 1; if (L < 3) return;
  const { S, H } = G, c = `rgba(${GRAINRGB},`, at = p => proj(T(p));
  const k = PERSP / (PERSP - T([0, L / 2, 0])[2]), p0 = at([0, 0, 0]), p1 = at([0, L, 0]);
  const fall = 520 * Math.sqrt(L / H), N = 110;           // durée de la chute (ms), nombre de grains en l'air
  ctx.save(); ctx.globalAlpha = streamA; ctx.lineCap = "round";
  // cœur du filet : très fin, plus dense en haut
  const g = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
  g.addColorStop(0, c + ".85)"); g.addColorStop(.35, c + ".45)"); g.addColorStop(1, c + ".12)");
  ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.strokeStyle = g; ctx.lineWidth = .9 * k; ctx.stroke();
  // grains : chacun laisse une petite traînée proportionnelle à sa vitesse
  const paths = [new Path2D(), new Path2D(), new Path2D()];
  for (let i = 0; i < N; i++){
    const u = now / fall + i / N, cyc = Math.floor(u), p = u - cyc, seed = i * 7919 + cyc * 104729;
    const y = L * p * p, r = S * (.003 + .016 * rnd(seed)) * Math.pow(p, 1.6), an = rnd(seed + 1) * TAU;
    const x = r * Math.cos(an), z = r * Math.sin(an), q = at([x, y, z]), tail = Math.max(.6, 2 * L * p * 16 / fall);
    const qt = at([x, Math.max(0, y - tail), z]);
    const P = paths[(rnd(seed + 2) * 3) | 0]; P.moveTo(qt[0], qt[1]); P.lineTo(q[0], q[1]);
  }
  ["1", ".7", ".45"].forEach((al, j) => { ctx.strokeStyle = c + al + ")"; ctx.lineWidth = (1.25 - j * .2) * k; ctx.stroke(paths[j]); });
  // rebonds sur le tas
  const B = 14, life = 380;
  ctx.fillStyle = c + ".8)";
  for (let i = 0; i < B; i++){
    const u = now / life + i / B, cyc = Math.floor(u), q = u - cyc, seed = i * 2731 + cyc * 7193;
    const an = rnd(seed) * TAU, d = S * (.01 + .03 * rnd(seed + 1)) * q, hgt = S * (.006 + .014 * rnd(seed + 2));
    const pt = at([d * Math.cos(an), L - hgt * Math.sin(q * Math.PI) + d * K * .6, d * Math.sin(an)]);
    ctx.globalAlpha = streamA * (1 - q); ctx.fillRect(pt[0] - .6 * k, pt[1] - .6 * k, 1.2 * k, 1.2 * k);
  }
  ctx.restore();
}

/* Une ampoule de verre et son sable (sg = -1 en haut, 1 en bas) */
function drawChamber(sg, now){
  const gl = MODEL.glass[sg < 0 ? 0 : 1];
  gl.out.forEach(prep); gl.inn.forEach(prep);
  drawGlass(gl, false);
  if (sg < 0) drawTopSand();
  else {
    const hp = heapParts(sandFrac), above = hp.cap ? prep(hp.cap).front : true;
    if (above){ drawSand(hp.fr); drawSand(hp.cone); } else { drawSand(hp.cone); drawSand(hp.fr); }
    drawStream(hp.apex, now);
  }
  drawGlass(gl, true);
}
/* Ordre de dessin, du plus loin au plus proche : les morceaux sont empilés (plateau, ampoule,
   ampoule, plateau), séparés par des plans horizontaux. De chaque côté de l'œil, on dessine
   en partant du bout le plus éloigné. Ça reste juste même quand l'œil passe à hauteur d'un plateau. */
function sep(A, B, eyeM){ // plan [n, d] avec A du côté n·p < d et B du côté n·p > d
  // L'œil entre les deux morceaux : ils ne peuvent pas se cacher l'un l'autre, pas de contrainte.
  if (A.y1 <= B.y0 + .01) return eyeM[1] > A.y1 && eyeM[1] < B.y0 ? null : [[0, 1, 0], (A.y1 + B.y0) / 2];
  if (B.y1 <= A.y0 + .01) return eyeM[1] > B.y1 && eyeM[1] < A.y0 ? null : [[0, -1, 0], -(B.y1 + A.y0) / 2];
  return null;
}
function drawOrder(eyeM){
  const before = (A, B) => { const p = sep(A, B, eyeM); return !!p && dot(p[0], eyeM) > p[1]; }; // A passe avant B
  const left = MODEL.objs.slice(), out = [];
  while (left.length){
    // le morceau qu'aucun autre ne doit précéder (en secours : celui qui en a le moins)
    const waits = left.map(a => left.filter(b => b !== a && before(b, a)).length);
    out.push(left.splice(waits.indexOf(Math.min(...waits)), 1)[0]);
  }
  return out;
}
function neckGlint(){
  const n = proj(T([0, 0, 0])), g = ctx.createRadialGradient(n[0], n[1], 0, n[0], n[1], 9);
  g.addColorStop(0, "rgba(255,252,235,.95)"); g.addColorStop(.4, "rgba(255,225,160,.35)"); g.addColorStop(1, "rgba(255,210,140,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n[0], n[1], 9, 0, 7); ctx.fill();
}

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
  const eyeM = [dot(ex, eye), dot(ey, eye), dot(ez, eye)]; // l'œil dans le repère du sablier
  let chambers = 0;
  for (const o of drawOrder(eyeM)){
    if (o.chamber){ drawChamber(o.chamber, now); if (++chambers === 2) neckGlint(); } // reflet au goulot
    else o.draw();
  }
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
