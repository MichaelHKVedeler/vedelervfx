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

// Explicit mapping of Thumbnail -> Preview Video
const PROJECTS = [
  { img: "01_karpeworld_thumbnail.jpg", vid: "karpeworld_preview.webm" },
  { img: "02_flax_thumbnail.jpg",       vid: "flax_preview.webm" },
  { img: "03_bossfight_thumbnail.jpg",  vid: "bossfight_preview.webm" },
  { img: "04_coast_thumbnail.jpg",      vid: "coast_preview.webm" },
  { img: "05_CCTV_thumbnail.jpg",       vid: "cctv_preview.webm" },
  { img: "06_lego_thumbnail.jpg",       vid: "lego_preview.webm" },
  { img: "07_robotcitadel_thumbnail.jpg", vid: "robotcitadel_preview.webm" },
  { img: "08_eternalascend_thumbnail.jpg", vid: "eternalascend_preview.webm" },
  { img: "09_hospital_thumbnail.jpg",   vid: "hospital_preview.webm" },
  { img: "10_endlessengines_thumbnail.jpg", vid: "endlessengines_preview.webm" }
].map((p, i) => ({
  id: i,
  img: `assets/portfolio/${p.img}`,
  vid: `assets/portfolio/${p.vid}`,
}));

function makeItem(p) {
  const d = document.createElement("div");
  d.className = "reel-item";
  
  // Background Image (Static)
  d.style.backgroundImage = `url("${p.img}")`;
  d.style.backgroundSize = "cover";
  d.style.backgroundPosition = "center";
  d.style.backgroundColor = "#111";
  
  // NOTE: We removed 'd.title = ...' so no popup text appears
  
  // HOVER LOGIC: Create video only when needed to save bandwidth
  let video = null;

  d.addEventListener("mouseenter", () => {
    // If video doesn't exist, create it
    if (!video) {
      video = document.createElement("video");
      video.src = p.vid;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.className = "reel-video";
      
      // Ensure it covers the item
      video.style.position = "absolute";
      video.style.inset = "0";
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      video.style.opacity = "0"; // Start invisible
      video.style.transition = "opacity 0.4s ease";
      
      d.appendChild(video);
      
      // Force play then fade in
      video.play()
        .then(() => { video.style.opacity = "1"; })
        .catch(e => console.log("Autoplay blocked", e));
    } else {
      // If cached, just play and fade in
      video.play();
      video.style.opacity = "1";
    }
  });

  d.addEventListener("mouseleave", () => {
    if (video) {
      video.style.opacity = "0";
      setTimeout(() => {
        if (video) {
          video.pause();
          // Optional: Remove entirely to save RAM if you have many large videos
          video.remove(); 
          video = null;
        }
      }, 400); // Wait for fade out
    }
  });

  return d;
}

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

  const firstItemOfSecondSet = items[PROJECTS.length];
  if (!firstItemOfSecondSet) return;

  setWidth = firstItemOfSecondSet.offsetLeft; 

  const viewportCenter = viewport.clientWidth * 0.5;
  const itemWidth = items[0].offsetWidth;
  
  const targetInitialPos = firstItemOfSecondSet.offsetLeft - (viewportCenter - itemWidth / 2);
  
  if (scrollPos === 0) {
      scrollPos = targetInitialPos;
      targetPos = targetInitialPos;
  }
}

window.addEventListener("load", measureSetWidth);
window.addEventListener("resize", measureSetWidth);

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