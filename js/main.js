import { initColorBends } from "./ColorBends.js";

const el = document.getElementById("color-bends");

const bg = initColorBends(el, {
  // HOME default vibe
  colors: [],
  rotation: 0.0,
  speed: 0.2,
  scale: 1,
  frequency: 1.0,
  warpStrength: 1.0,
  mouseInfluence: 1.0,
  parallax: 0.0,
  noise: 0.0,

  transparent: false,
  vignette: 0.85,
  aberration: 1.6,
});

const moods = {
  home:      { speed: 0.22, warpStrength: 1.2,  aberration: 1.6, noise: 0.03, mouseInfluence: 1.1, vignette: 0.85 },
  portfolio: { speed: 0.14, warpStrength: 1.05, aberration: 1.2, noise: 0.02, mouseInfluence: 0.8, vignette: 0.90 },
  about:     { speed: 0.10, warpStrength: 0.95, aberration: 0.9, noise: 0.015, mouseInfluence: 0.6, vignette: 0.92 },
  contact:   { speed: 0.08, warpStrength: 0.9,  aberration: 0.75, noise: 0.012, mouseInfluence: 0.5, vignette: 0.94 },
};

function setView(view) {
  document.querySelectorAll(".panel").forEach(p => {
    p.classList.toggle("is-active", p.dataset.panel === view);
  });

  document.querySelectorAll(".navbtn").forEach(b => {
    b.classList.toggle("is-active", b.dataset.view === view);
  });

  bg.setParams(moods[view] || moods.home);
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-view]");
  if (!btn) return;
  setView(btn.dataset.view);
});

setView("home");
