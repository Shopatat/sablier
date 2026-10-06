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
  '<g transform="translate(-1 0)"><path d="M11 27.5C9.5 20 9 12 10.5 5C11.5 2.5 15 2.5 16.5 5.5C15 6 14 7 13.8 9C13.5 15 13 21 11 27.5z"/><path d="M11.4 24C11.2 18 11.4 12 12.2 7"/></g>',
  '<circle cx="12" cy="13" r="6.5"/><circle cx="12" cy="13" r="2" class="f"/><path d="M5 23h14"/>',
  '<path d="M2 11l2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5M2 16l2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5M2 21l2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5"/>',
  '<path d="M12 27V17"/><path d="M12 17C7 16.5 5 11 6.5 6.5c2 3 4.5 6 5.5 10.5c1-4.5 3.5-7.5 5.5-10.5C19 11 17 16.5 12 17z"/><path d="M12 16.5C10.8 12 11 8 12 4c1 4 1.2 8 0 12.5"/><path d="M8 27h8"/>',
  '<g transform="translate(-.5 0)"><path d="M11 27V9"/><path d="M11 9c0-3 2-4.5 4.5-4l1.5 3.5"/><path d="M11 27l-2.5-2.5M11 27l2.5-2.5"/></g>'
];
const svgOf = (w, h, body, col, sw) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><style>.f{fill:${col}}</style>${body}</svg>`);
// Frise des côtés : neuf signes séparés par de fins filets, entre deux traits
const BAND_W = GLYPHS.length * 28;
const bandBody = '<path d="M0 1.2H' + BAND_W + 'M0 28.8H' + BAND_W + '" stroke-width="1"/>' +
  GLYPHS.map((g, i) => `<g transform="translate(${2 + i * 28} 0)">${g}</g><path d="M${i * 28 + .3} 5v20" stroke-width=".6"/>`).join("") +
  `<path d="M${BAND_W - .3} 5v20" stroke-width=".6"/>`;
// Panneau du dessus : double cadre en creux et disque solaire ailé au centre
const wing = '<path d="M158 172C128 156 92 150 56 158c10 7 12 13 8 21c32-2 64 2 94 10"/>' +
  '<path d="M150 173C124 163 96 160 70 165M150 181C124 175 98 172 72 174M152 187C128 183 104 181 80 182"/>' +
  '<path d="M64 179l-6 7M80 182l-5 8M96 183l-4 8M112 185l-3 8M128 186l-2 8"/>';
const panelBody = '<rect x="26" y="26" width="308" height="308" rx="3" stroke-width="3"/><rect x="38" y="38" width="284" height="284" rx="2" stroke-width="1.4"/>' +
  '<g transform="translate(180 181.5) scale(1.3) translate(-180 -178)">' +
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

const cvs = $("#hg"), ctx0 = cvs.getContext("2d"), scene = $("#scene"), app = $("#app");
let ctx = ctx0; // contexte où l'on dessine : l'écran, ou l'un des deux calques (voir drawLayers)
const DEG = Math.PI / 180, K = Math.tan(32 * DEG), CN = 32, PERSP = 1100, TAU = 2 * Math.PI;
let G = null, MODEL = null, CW = 0, CH = 0, DPR = 1, strip = null, panel = null, grainTile = null;
let sandFrac = 1, flipT0 = 0, flipDir = 1, dprCap = 2;
// Filet : il coule depuis flowT0 ; s'il est coupé (pause, fin), il s'est arrêté à flowT1.
// airMs : durée d'écoulement du sable encore en l'air (il n'est pas encore arrivé dans le tas).
let flowOn = false, flowT0 = -1e9, flowT1 = -1e9, airMs = 0;

function build(){
  const r = scene.getBoundingClientRect();
  // 2 pixels réels par point (3 sur l'iPhone coûtait 2,25 fois plus cher pour une différence
  // invisible à l'œil) ; moins si l'appareil n'arrive pas à suivre (voir watchPerf)
  DPR = Math.min(dprCap, window.devicePixelRatio || 1); CW = r.width; CH = r.height;
  cvs.width = Math.max(1, Math.round(CW * DPR)); cvs.height = Math.max(1, Math.round(CH * DPR));
  makeLayers(); // changer la taille efface le canvas : calques refaits, image redessinée
  const S = Math.max(80, Math.min(CH * .36, CW * .5, 260));
  // S : côté de la base du verre, H : hauteur d'une ampoule, T : épaisseur d'un plateau, W : sa largeur
  G = { S, H:S * .8, T:S * .15, W:S * 1.06 };
  // halo dans le décor (plein écran), centré sur le sablier : rien ne le coupe, pas de cadre visible
  const hs = $("#halo").style;
  hs.setProperty("--halo", (S * 2.6) + "px"); hs.left = (r.left + CW / 2) + "px"; hs.top = (r.top + CH / 2) + "px";
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
  const c = strip.getContext("2d"); // juste les gravures : le reflet des arêtes est dessiné sur la face (voir drawFace)
  const bh = h * .62, bw = bh * BAND_W / 30, n = Math.max(1, Math.round(w / bw)), bw2 = w / n;
  for (let i = 0; i < n; i++) engrave(c, art.bandD, art.bandL, i * bw2, (h - bh) / 2, bw2, bh, sc * .45, .85);
  makePanel();
}
/* Panneau gravé du dessus des plateaux */
function makePanel(){
  const n = 540, p = document.createElement("canvas"); p.width = p.height = n;
  const c = p.getContext("2d");
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
  grainTile = c;
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
function area(Q){ let a = 0; for (let i = 0, n = Q.length; i < n; i++){ const p = Q[i], q = Q[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; }
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
  if (f.band){ // arête du haut qui accroche la lumière, arête du bas dans l'ombre
    const [a, , c] = f.band.map(p => proj(T(p))), g = ctx.createLinearGradient(a[0], a[1], c[0], c[1]);
    g.addColorStop(0, "rgba(255,246,205,.6)"); g.addColorStop(.12, "rgba(255,246,205,0)");
    g.addColorStop(.86, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(40,24,4,.5)");
    ctx.fillStyle = g; ctx.fill();
  }
  const big = area(f.Q) > 60; // face vue presque par la tranche : gravures invisibles, on les saute
  if (big && strip && f.band) texture(strip, f.band, 4, 1, .95);
  if (big && f.deco && panel) texture(panel, f.panel, 3, 3, 1); // panneau gravé sur la face extérieure
  path(f.Q); ctx.strokeStyle = "rgba(60,38,10,.55)"; ctx.lineWidth = .8; ctx.stroke();
}
/* Plaque une image sur une face en suivant la perspective. Le canvas ne sait faire que des
   déformations « plates » : on découpe donc la face en petits triangles, chacun placé
   exactement par ses trois coins. Sans ça, le décor glissait vers un bord. */
function texture(img, [o, px, py], nx, ny, alpha){
  const W = img.width, H = img.height, ex = sub(px, o), ey = sub(py, o), S = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++)
    S.push(proj(T(addv(o, addv(ex.map(v => v * i / nx), ey.map(v => v * j / ny))))));
  const at = (i, j) => S[j * (nx + 1) + i];
  ctx.save(); ctx.globalAlpha = alpha;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){
    const u0 = W * i / nx, u1 = W * (i + 1) / nx, v0 = H * j / ny, v1 = H * (j + 1) / ny;
    tri(img, at(i, j), at(i + 1, j), at(i, j + 1), [u0, v0], [u1, v0], [u0, v1], u0, v0, u1, v1);
    tri(img, at(i + 1, j + 1), at(i, j + 1), at(i + 1, j), [u1, v1], [u0, v1], [u1, v0], u0, v0, u1, v1);
  }
  ctx.restore();
}
function tri(img, s0, s1, s2, t0, t1, t2, u0, v0, u1, v1){
  // transformation image → écran qui envoie t0, t1, t2 sur s0, s1, s2
  const a = t1[0] - t0[0], b = t2[0] - t0[0], c = t1[1] - t0[1], d = t2[1] - t0[1], det = a * d - b * c;
  if (Math.abs(det) < 1e-9) return;
  const X1 = s1[0] - s0[0], X2 = s2[0] - s0[0], Y1 = s1[1] - s0[1], Y2 = s2[1] - s0[1];
  const m11 = (X1 * d - X2 * c) / det, m12 = (X2 * a - X1 * b) / det, m21 = (Y1 * d - Y2 * c) / det, m22 = (Y2 * a - Y1 * b) / det;
  // triangle de découpe un peu agrandi, pour ne pas laisser de fente entre deux morceaux
  const cx = (s0[0] + s1[0] + s2[0]) / 3, cy = (s0[1] + s1[1] + s2[1]) / 3;
  const grow = p => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * .6, p[1] + dy / l * .6]; };
  ctx.save(); path([s0, s1, s2].map(grow)); ctx.clip();
  ctx.transform(m11, m21, m12, m22, s0[0] - m11 * t0[0] - m12 * t0[1], s0[1] - m21 * t0[0] - m22 * t0[1]);
  const m = 2; // un peu de marge autour du morceau d'image
  const sx = Math.max(0, u0 - m), sy = Math.max(0, v0 - m), sw = Math.min(img.width, u1 + m) - sx, sh = Math.min(img.height, v1 + m) - sy;
  ctx.drawImage(img, sx, sy, sw, sh, sx, sy, sw, sh);
  ctx.restore();
}
function drawSolid(F){ const vis = []; for (const f of F){ prep(f); if (f.front){ drawFace(f); vis.push(f); } } return vis; }

/* Grain du sable : la texture est « collée » sur chaque face (elle suit sa position et son
   inclinaison), pour qu'elle ne glisse pas sur le sable quand le sablier tourne. */
const grainPats = new WeakMap();
function grainOn(F){
  if (!grainTile || !F.length) return;
  let grain = grainPats.get(ctx); // un motif par canvas (écran, calques)
  if (!grain){ grain = ctx.createPattern(grainTile, "repeat"); grainPats.set(ctx, grain); }
  ctx.save(); ctx.globalAlpha = .32;
  for (const f of F){
    const p0 = f.pts[0], U = nrm(sub(f.pts[1], p0)), V = cross(f.n, U), L = 8;
    const s0 = proj(T(p0)), su = proj(T(addv(p0, U.map(x => x * L)))), sv = proj(T(addv(p0, V.map(x => x * L))));
    try{ grain.setTransform(new DOMMatrix([(su[0]-s0[0]) / L, (su[1]-s0[1]) / L, (sv[0]-s0[0]) / L, (sv[1]-s0[1]) / L, s0[0], s0[1]])); }catch(e){}
    ctx.fillStyle = grain; f.path ? f.path() : path(f.Q);
    ctx.fill();
  }
  ctx.restore();
}
function drawSand(F, one){
  const vis = drawSolid(F);
  if (one && vis.length){ // cône : le grain d'une facette suffit pour toutes (personne ne voit la différence sur un tas)
    const f = vis[vis.length >> 1];
    grainOn([{ pts:f.pts, n:f.n, Q:null, path:() => { ctx.beginPath(); for (const v of vis) poly(v.Q); } }]);
  } else grainOn(vis);
  return vis;
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
   Le dessus reste plat, comme dans le jeu. */
function drawTopSand(){
  const frac = sandFrac;
  const lv = topLevel(frac), { S, H } = G;
  if (lv * H < .3) return; // moins d'un tiers de pixel : il n'y a plus rien à voir
  const y = -lv * H, hw = .925 * S / 2 * lv;
  drawSand(pyrFaces(y, hw, "sand"));
  const top = prep(face([[-hw, y, -hw], [hw, y, -hw], [hw, y, hw], [-hw, y, hw]], [0, 0, 0], "sand"));
  if (!top.front) return;
  drawFace(top);
  grainOn([top]);
}
/* Sable du bas : un cône qui grossit, puis le fond qui se remplit avec un dôme dessus */
function heapParts(frac){
  // Le sable encore en l'air n'est pas arrivé : on compte le tas comme il était il y a une chute.
  const landed = Math.min(1, frac + airMs / sessionLen()), b = 1 - sandLeft(landed);
  if (b <= 0) return { fr:[], cone:[], cap:null, apex:G.H };
  const { S, H } = G, Sb = .925 * S, shp = heap(b);
  const f = shp.y / (H / Sb), yl = H - f * H, hb = Sb / 2, ht = hb * (1 - f);
  const fr = []; let cap = null;
  if (f > .002){
    const b = [[-hb, H, -hb], [hb, H, -hb], [hb, H, hb], [-hb, H, hb]], t = b.map(p => [p[0] * (1 - f), yl, p[2] * (1 - f)]);
    const inside = [0, H - f * H / 2, 0];
    for (let i = 0; i < 4; i++) fr.push(face([b[i], b[(i + 1) % 4], t[(i + 1) % 4], t[i]], inside, "sand"));
    if (ht > .4){ cap = face(t, inside, "sand"); fr.push(cap); }
  }
  const rr = shp.R * Sb, hh = K * rr, cone = [];
  if (rr > .3){
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
/* Deux façons de couler (réglage « Écoulement »), r étant la part du temps qui reste :
   - régulière : le niveau du haut baisse à vitesse constante (hauteur r, il reste r³ du sable).
     Le haut est large au début : il en coule beaucoup, puis de moins en moins.
   - réaliste : comme un vrai sablier, le débit est constant (il reste r du sable, hauteur ∛r) :
     le niveau baisse doucement, puis de plus en plus vite à la fin.
   Dans les deux cas le sable est conservé : le tas du bas contient exactement ce qui est parti du haut. */
const realFlow = () => cfg.flow === "reel";
const topLevel = r => realFlow() ? Math.cbrt(r) : r;
const sandLeft = r => realFlow() ? r : r * r * r;
const FALL = 260; // durée de chute du goulot jusqu'au fond (ms)
function flowNow(){ // débit en px³ par ms
  const r = sandFrac, Vc = Math.pow(.925 * G.S, 2) * G.H / 3;
  return (realFlow() ? 1 : 3 * r * r) * Vc / sessionLen();
}
const NECK_V = .12; // vitesse des grains à la sortie du goulot (ils ne partent pas tout à fait de l'arrêt)
const fallY = (L, p) => L * p * (NECK_V + (1 - NECK_V) * p); // hauteur tombée après la part p de la chute
function drawStream(apexY, now){
  const L = apexY - 1; if (L < 3) return;
  const { S, H } = G, c = `rgba(${GRAINRGB},`, at = p => proj(T(p));
  const fall = FALL * Math.sqrt(L / H);
  // Tête du filet (elle descend en accélérant quand ça se met à couler) et queue (elle quitte
  // le goulot quand ça s'arrête), en part de la chute : 0 au goulot, 1 en bas.
  const pHead = Math.min(1, (now - flowT0) / fall), pTail = flowOn ? 0 : Math.min(1, Math.max(0, (now - flowT1) / fall));
  if (pHead <= pTail) return;
  const yHead = fallY(L, pHead), yTail = fallY(L, pTail);
  const k = PERSP / (PERSP - T([0, L / 2, 0])[2]), p0 = at([0, yTail, 0]), p1 = at([0, yHead, 0]);
  const q = flowNow(), vMid = (1 + NECK_V) * L / fall; // débit, vitesse à mi-hauteur
  /* Comme un robinet plus ou moins ouvert : moins de débit, c'est un filet plus fin ET moins de
     grains qui passent chaque seconde, mais ils tombent toujours aussi vite.
     Largeur : section = débit / vitesse, plafonnée pour les sessions très courtes.
     Grains en l'air en même temps : de quelques-uns (filet qui s'épuise, très longue session)
     à environ 220 (session d'une minute). */
  const w = Math.min(2 * Math.sqrt(q / vMid / Math.PI), .02 * S);
  const nAir = Math.min(220, 38 * Math.pow(q, .55)), DT = 4, per = nAir / fall * DT; // grains lâchés toutes les 4 ms
  ctx.save(); ctx.lineCap = "round";
  // corps du filet, ombré comme un petit cylindre : seulement quand les grains sont assez serrés pour former un trait continu
  const body = Math.min(1, Math.max(0, (nAir - 50) / 120)) * Math.min(1, Math.max(0, (w - .5) / 1.2));
  if (body > .02 && yHead - yTail > 1){
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, hw = w * k / 2;
    const g = ctx.createLinearGradient(p0[0] - nx * hw, p0[1] - ny * hw, p0[0] + nx * hw, p0[1] + ny * hw);
    g.addColorStop(0, c + (.25 * body).toFixed(3) + ")"); g.addColorStop(.45, c + (.9 * body).toFixed(3) + ")"); g.addColorStop(1, c + (.3 * body).toFixed(3) + ")");
    ctx.beginPath(); ctx.moveTo(p0[0] - nx * hw * .6, p0[1] - ny * hw * .6); ctx.lineTo(p0[0] + nx * hw * .6, p0[1] + ny * hw * .6);
    ctx.lineTo(p1[0] + nx * hw, p1[1] + ny * hw); ctx.lineTo(p1[0] - nx * hw, p1[1] - ny * hw); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
  }
  /* Grains : le temps est découpé en créneaux de 4 ms ; dans chaque créneau, le goulot lâche
     au hasard (tirage fixe) un nombre de grains qui suit le débit, à un instant au hasard du créneau.
     Chaque grain garde ainsi sa place d'une image à l'autre et tombe à la vraie vitesse. */
  const paths = [new Path2D(), new Path2D(), new Path2D()], M = Math.min(4, Math.ceil(per));
  const tMin = Math.max(now - fall, flowT0), tMax = flowOn ? now : Math.min(now, flowT1);
  for (let j = Math.floor(tMin / DT); j <= Math.floor(tMax / DT); j++){
    for (let m = 0; m < M; m++){
      const seed = j * 13.17 + m * 5023.3;
      if (rnd(seed + 3) >= per - m) continue;
      const te = (j + rnd(seed + 5)) * DT;
      if (te < tMin || te > tMax) continue;
      const p = (now - te) / fall, y = fallY(L, p);
      const r = (w / 2) * Math.sqrt(rnd(seed)) + S * .004 * rnd(seed + 4) * p * p, an = rnd(seed + 1) * TAU;
      const x = r * Math.cos(an), z = r * Math.sin(an), qd = at([x, y, z]);
      const tail = Math.max(.4, L * (NECK_V + 2 * (1 - NECK_V) * p) * 12 / fall); // traînée = vitesse × 12 ms
      const qt = at([x, Math.max(0, y - tail), z]);
      const P = paths[(rnd(seed + 2) * 3) | 0]; P.moveTo(qt[0], qt[1]); P.lineTo(qd[0], qd[1]);
    }
  }
  ["1", ".75", ".5"].forEach((al, j) => { ctx.strokeStyle = c + al + ")"; ctx.lineWidth = (.95 - j * .15) * k; ctx.stroke(paths[j]); });
  // rebonds sur le tas, en nombre proportionnel au débit (seulement quand le filet touche le tas)
  const B = pHead < 1 || pTail >= 1 ? 0 : Math.min(24, Math.round(nAir / 9)), life = 320;
  ctx.fillStyle = c + ".85)";
  for (let i = 0; i < B; i++){
    const u = now / life + i / B, cyc = Math.floor(u), t = u - cyc, seed = i * 2731 + cyc * 7193;
    const an = rnd(seed) * TAU, d = (w / 2 + S * (.006 + .02 * rnd(seed + 1))) * t, hgt = S * (.004 + .01 * rnd(seed + 2));
    const pt = at([d * Math.cos(an), L - hgt * Math.sin(t * Math.PI) + d * K * .6, d * Math.sin(an)]);
    ctx.globalAlpha = 1 - t; ctx.fillRect(pt[0] - .5 * k, pt[1] - .5 * k, k, k);
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
    if (above){ drawSand(hp.fr); drawSand(hp.cone, true); } else { drawSand(hp.cone, true); drawSand(hp.fr); }
    streamApex = hp.apex; ctx = layB; // le filet se dessine ici, entre les deux calques (voir render3d)
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

/* Si l'appareil n'arrive plus à suivre (plus d'une image sur deux en retard pendant
   quelques secondes), on baisse la définition d'un cran : mieux vaut fluide que net et saccadé. */
let perfLast = 0, perfSlow = 0;
function watchPerf(now){
  const dt = now - perfLast; perfLast = now;
  if (dt <= 0 || dt > 250) return; // retour d'arrière-plan : ça ne compte pas
  perfSlow += ((dt > 40 ? 1 : 0) - perfSlow) * .02;
  if (perfSlow > .5 && dprCap > 1.25){ dprCap = dprCap > 1.5 ? 1.5 : 1.25; perfSlow = 0; build(); }
}
/* Angle de vue : le sablier ne bouge pas tout seul, on le fait tourner du doigt (voir interface.js).
   tx : inclinaison (négatif : vu d'en haut), ry : rotation autour de l'axe. spin : élan après un lancer (rad/ms). */
const VIEW0 = { tx:-14 * DEG, ry:-24 * DEG }, TX_MIN = -50 * DEG, TX_MAX = 20 * DEG;
const view = Object.assign({}, VIEW0);
(() => { const v = store.get("sablier.view", null);
  if (v && isFinite(v.tx) && isFinite(v.ry)){ view.tx = Math.max(TX_MIN, Math.min(TX_MAX, v.tx)); view.ry = v.ry; } })();
let spin = 0, spinLast = 0;
const saveView = () => store.set("sablier.view", { tx:view.tx, ry:view.ry % TAU });
function stepView(now){
  const dt = Math.min(50, Math.max(0, now - spinLast)); spinLast = now;
  if (!spin) return;
  view.ry += spin * dt; spin *= Math.exp(-dt / 420);
  if (Math.abs(spin) < 2e-5){ spin = 0; saveView(); }
}

/* Pour dépenser le moins possible, l'image est faite en deux calques : tout ce qui est derrière le
   filet (layA) et tout ce qui est devant (layB, la face avant du verre du bas, etc.).
   Ils ne sont refaits que si quelque chose a bougé d'au moins 0,2 pixel (angle, niveau du sable,
   tas) : environ une fois par seconde pendant une session. À chaque image, on ne fait que poser
   les deux calques et dessiner le filet entre les deux. Sablier à l'arrêt : plus rien à faire. */
let layA = null, layB = null, layKey = "", streamApex = 0, hadStream = false;
function makeLayers(){
  [layA, layB] = [0, 0].map(() => { const c = document.createElement("canvas"); c.width = cvs.width; c.height = cvs.height; return c.getContext("2d"); });
  layKey = "";
}
function drawLayers(now, eyeM){
  for (const c of [layA, layB]){ c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cvs.width, cvs.height); c.setTransform(DPR, 0, 0, DPR, 0, 0); }
  ctx = layA; streamApex = G.H; // drawChamber passe sur layB une fois le tas dessiné
  let chambers = 0;
  for (const o of drawOrder(eyeM)){
    if (o.chamber){ drawChamber(o.chamber, now); if (++chambers === 2) neckGlint(); } // reflet au goulot
    else o.draw();
  }
  ctx = ctx0;
}
function render3d(now){
  if (!CW || !MODEL || !layA) return;
  watchPerf(now); stepView(now);
  let flip = 0;
  if (flipT0){
    const u = Math.min(1, (now - flipT0) / 1500);
    flip = flipDir * Math.PI * (u < .5 ? 4*u*u*u : 1 - Math.pow(-2*u + 2, 3) / 2);
    if (u >= .5) sandFrac = 0; // à l'horizontale, le sable passe dans l'ampoule qui finira en haut
  }
  const want = st.running && !turning && sandFrac > 0;
  if (want && !flowOn){ flowOn = true; flowT0 = now; }
  else if (!want && flowOn){ flowOn = false; flowT1 = now; }
  if (turning) flowT1 = flowT0 = -1e9; // on retourne le sablier : plus de filet
  airMs = flowOn ? Math.min(now - flowT0, FALL) : Math.max(0, Math.min(FALL - (now - flowT1), flowT1 - flowT0));

  // Ce que montrent les calques, au cinquième de pixel près : s'il n'a pas changé, on ne les refait pas.
  const Sb = .925 * G.S, shp = heap(1 - sandLeft(Math.min(1, sandFrac + airMs / sessionLen())));
  const q5 = v => Math.round(v * 5);
  const key = [view.tx.toFixed(4), view.ry.toFixed(4), flip.toFixed(4), q5(topLevel(sandFrac) * G.H), q5(shp.y * Sb), q5(shp.R * Sb),
    CW, CH, DPR, cfg.sandColor, cfg.flow, !!strip, !!panel].join();
  const streaming = flowOn || now - flowT1 < 700; // 700 ms : la fin du filet finit de tomber
  if (key === layKey && !streaming && !hadStream) return; // rien n'a bougé : on garde l'image
  hadStream = streaming;

  const M = p => rX(rY(rZ(p, flip), view.ry), view.tx);
  const ex = M([1, 0, 0]), ey = M([0, 1, 0]), ez = M([0, 0, 1]);
  T = p => [ex[0]*p[0] + ey[0]*p[1] + ez[0]*p[2], ex[1]*p[0] + ey[1]*p[1] + ez[1]*p[2], ex[2]*p[0] + ey[2]*p[1] + ez[2]*p[2]];
  const vx = CW / 2, vy = CH * .42, ox = CW / 2, oy = CH / 2;
  eye = [vx - ox, vy - oy, PERSP];
  proj = p => { const k = PERSP / (PERSP - p[2]); return [vx + (ox + p[0] - vx) * k, vy + (oy + p[1] - vy) * k]; };
  if (key !== layKey){ layKey = key; drawLayers(now, [dot(ex, eye), dot(ey, eye), dot(ez, eye)]); } // l'œil dans le repère du sablier

  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cvs.width, cvs.height);
  ctx.drawImage(layA.canvas, 0, 0);
  if (streaming){ ctx.setTransform(DPR, 0, 0, DPR, 0, 0); drawStream(streamApex, now); ctx.setTransform(1, 0, 0, 1, 0, 0); }
  ctx.drawImage(layB.canvas, 0, 0);
}

/* Volume tombé (0 → 1, en part d'une ampoule) → forme du tas, en unités où le fond fait 1.
   Phase 1 : un cône (pente naturelle du sable, 32°) grossit au centre jusqu'à toucher les parois.
   Phase 2 : le fond se remplit à plat (niveau y) avec le cône posé dessus, jusqu'au goulot. */
function heap(b){
  const Hu = G.H / (.925 * G.S), V = Hu / 3, vol = Math.max(0, b) * V;
  const coneV = r => Math.PI * K * r * r * r / 3;
  if (vol <= coneV(.5)) return { y:0, R:Math.cbrt(3 * vol / (Math.PI * K)) };
  let lo = 0, hi = Hu;
  for (let i = 0; i < 40; i++){
    const y = (lo + hi) / 2, v = V * (1 - Math.pow(1 - y / Hu, 3)) + coneV(.5 * (1 - y / Hu));
    if (v < vol) lo = y; else hi = y;
  }
  const y = (lo + hi) / 2;
  return { y, R:.5 * (1 - y / Hu) };
}
