// Lancement de l'appli
"use strict";

/* ---------------- Démarrage ---------------- */
/* iPhone, appli lancée depuis l'écran d'accueil : iOS raccourcit parfois la page de la hauteur
   de l'encoche (bande noire en bas). On cale la page sur la hauteur réelle de l'écran.
   Même piège et même correctif que sur Mot de passe. */
function fitStandalone(){
  if (!navigator.standalone) return;
  const land = innerWidth > innerHeight, h = land ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
  document.documentElement.style.height = h + "px";
}
fitStandalone();
let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { fitStandalone(); build(); sizeDust(); }, 120); });
// La zone du sablier change aussi de taille sans que la fenêtre bouge (minuteur affiché ou non,
// appli ouverte en arrière-plan puis affichée) : on la surveille directement.
if ("ResizeObserver" in window){
  let lastW = 0, lastH = 0;
  new ResizeObserver(([e]) => {
    const { width, height } = e.contentRect;
    if (Math.abs(width - lastW) > .5 || Math.abs(height - lastH) > .5){ lastW = width; lastH = height; build(); }
  }).observe(scene);
}
applySand(); applyTimeVis(); sizeDust(); renderStats(); render();
if (st.running){
  if (st.endAt <= Date.now()) finish(true, true); // finie appli fermée : comptée, sans gong en retard
  else { app.classList.remove("idle"); wakeOn(); }
}
requestAnimationFrame(loop); requestAnimationFrame(ambientLoop);

/* Mode hors ligne : une fois ouverte une première fois, l'appli marche sans réseau. */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")){
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
