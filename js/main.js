import { initColorBends } from "./ColorBends.js";

const el = document.getElementById("color-bends");

const bg = initColorBends(el, {
  // HOME default vibe (dark, lensy)
  colors: [],
  rotation: 0.0,
  speed: 0.18,
  scale: 1,
  frequency: 1.0,
  warpStrength: 1.18,
  mouseInfluence: 1.0,
  parallax: 0.0,
  noise: 0.02,
  transparent: false,
  vignette: 0.90,
  aberration: 1.7,
});

const moods = {
  home:    { speed: 0.18, warpStrength: 1.18, aberration: 1.7, noise: 0.02, mouseInfluence: 1.05, vignette: 0.90 },
  about:   { speed: 0.10, warpStrength: 0.95, aberration: 0.9, noise: 0.015, mouseInfluence: 0.6, vignette: 0.92 },
  contact: { speed: 0.08, warpStrength: 0.9,  aberration: 0.75, noise: 0.012, mouseInfluence: 0.5, vignette: 0.94 },
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

/* ---------------------------
   FILM REEL (infinite loop)
---------------------------- */

const track = document.getElementById("reel-track");

// 10 dummy projects (random colors)
const PROJECTS = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  color: randomNiceColor(),
}));

function makeItem(p) {
  const d = document.createElement("div");
  d.className = "reel-item";
  d.style.background = p.color;
  d.title = `Project ${p.id + 1}`;
  return d;
}

// Build 3 copies so we can always render the “middle” seamlessly
function buildReel() {
  track.innerHTML = "";
  for (let copy = 0; copy < 3; copy++) {
    PROJECTS.forEach(p => track.appendChild(makeItem(p)));
  }
}
buildReel();

let setWidth = 0;

// scroll state (does not get wrapped — only the render does)
let scrollPos = 0;
let targetPos = 0;

function measureSetWidth() {
  const viewport = document.querySelector(".reel-viewport");
  const items = track.querySelectorAll(".reel-item");
  
  if (!viewport || !items.length) return;

  // 1. Measure the width of one full set of projects
  // We use the first item of the second set to find where the "loop" starts
  const firstItemOfSecondSet = items[PROJECTS.length];
  setWidth = firstItemOfSecondSet.offsetLeft; 

  const viewportCenter = viewport.clientWidth * 0.5;
  const itemWidth = items[0].offsetWidth;
  const gap = 22; // Matching your CSS gap

  // 2. To center the FIRST item of the SECOND set:
  // We need the track to move so that (ItemLeft - scrollPos) = (ViewportCenter - ItemWidth/2)
  const targetInitialPos = firstItemOfSecondSet.offsetLeft - (viewportCenter - itemWidth / 2);
  
  scrollPos = targetInitialPos;
  targetPos = targetInitialPos;
}

// Call it after a tiny delay to ensure CSS transitions/fonts are ready
window.addEventListener("load", () => {
  measureSetWidth();
});

requestAnimationFrame(measureSetWidth);
window.addEventListener("resize", () => requestAnimationFrame(measureSetWidth));

// Wheel controls horizontal movement (infinite)
window.addEventListener("wheel", (e) => {
  e.preventDefault();
  const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  targetPos += delta * 1.0; // scroll direction feel (flip sign if you want)
}, { passive: false });

function animate() {
  // smooth easing
  scrollPos += (targetPos - scrollPos) * 0.08;

  if (setWidth > 0) {
    // render offset wraps, but scrollPos never “jumps”
    const wrapped = ((scrollPos % setWidth) + setWidth) % setWidth;

    // place the middle copy in view:
    // -wrapped moves left, and -setWidth shifts to the middle set
    const x = -wrapped - setWidth;

    track.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

function randomNiceColor() {
  const h = Math.floor(Math.random() * 360);
  const s = 70 + Math.floor(Math.random() * 20);
  const l = 45 + Math.floor(Math.random() * 10);
  return `hsl(${h} ${s}% ${l}%)`;
}