import { initColorBends } from "./ColorBends.js";

import { createGradualBlur } from "./GradualBlur.js";

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
  home:    { warpStrength: 1.18, aberration: 1.7, noise: 0.02, mouseInfluence: 1.05, vignette: 0.90 },
  about:   { warpStrength: 0.95, aberration: 0.9, noise: 0.015, mouseInfluence: 0.6, vignette: 0.92 },
  contact: { warpStrength: 0.9,  aberration: 0.75, noise: 0.012, mouseInfluence: 0.5, vignette: 0.94 },
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

// Specific filenames from your assets/portfolio folder
const thumbnails = [
  "01_karpeworld_thumbnail.jpg",
  "02_flax_thumbnail.jpg",
  "03_bossfight_thumbnail.jpg",
  "04_coast_thumbnail.jpg",
  "05_CCTV_thumbnail.jpg",
  "06_lego_thumbnail.jpg",
  "07_robotcitadel_thumbnail.jpg",
  "08_eternalascend_thumbnail.jpg",
  "09_hospital_thumbnail.jpg",
  "10_endlessengines_thumbnail.jpg"
];

const PROJECTS = thumbnails.map((filename, i) => ({
  id: i,
  img: `assets/portfolio/${filename}`, // Path relative to index.html
  title: filename.replace(/_/g, " ").replace(".jpg", "") // Clean up name for hover title
}));

function makeItem(p) {
  const d = document.createElement("div");
  d.className = "reel-item";
  
  // Apply image as background
  d.style.backgroundImage = `url("${p.img}")`;
  d.style.backgroundSize = "cover";
  d.style.backgroundPosition = "center";
  d.style.backgroundColor = "#111"; // Fallback color while loading
  
  d.title = p.title;
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
let scrollPos = 0;
let targetPos = 0;

function measureSetWidth() {
  const viewport = document.querySelector(".reel-viewport");
  const items = track.querySelectorAll(".reel-item");
  
  if (!viewport || !items.length) return;

  // 1. Measure the width of one full set of projects
  const firstItemOfSecondSet = items[PROJECTS.length];
  
  // Safety check in case images load slowly or DOM isn't ready
  if (!firstItemOfSecondSet) return;

  setWidth = firstItemOfSecondSet.offsetLeft; 

  const viewportCenter = viewport.clientWidth * 0.5;
  const itemWidth = items[0].offsetWidth;
  
  // 2. Center the FIRST item of the SECOND set
  const targetInitialPos = firstItemOfSecondSet.offsetLeft - (viewportCenter - itemWidth / 2);
  
  // Only set scale positions if this is the first measurement
  if (scrollPos === 0) {
      scrollPos = targetInitialPos;
      targetPos = targetInitialPos;
  }
}

// Call it after load to ensure layout is settled
window.addEventListener("load", measureSetWidth);
window.addEventListener("resize", measureSetWidth);

// Wheel controls
window.addEventListener("wheel", (e) => {
  e.preventDefault();
  const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  targetPos += delta * 1.0; 
}, { passive: false });

function animate() {
  scrollPos += (targetPos - scrollPos) * 0.08;

  if (setWidth > 0) {
    const wrapped = ((scrollPos % setWidth) + setWidth) % setWidth;
    const x = -wrapped - setWidth;
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

/* ---------------------------
   GRADUAL BLUR (Edges)
---------------------------- */
// We don't even strictly need the viewport variable anymore for placement
// since we are attaching to body, but we can leave it for reference.

// Left Blur
createGradualBlur(document.body, { // Target can be body now
  position: 'left',
  fixed: true,
  strength: 2,
  divCount: 5,
  size: '150px',
  zIndex: 5          // Keep below UI (Brand/Nav) but above Reel
});

// Right Blur
createGradualBlur(document.body, {
  position: 'right',
  fixed: true,
  strength: 2,
  divCount: 5,
  size: '150px',
  zIndex: 5
});