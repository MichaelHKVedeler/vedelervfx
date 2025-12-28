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

// Manual Configuration: Image file, Video file, and Display Title
const RAW_DATA = [
  { 
    thumb: "01_karpeworld_thumbnail.jpg", 
    vid: "karpeworld_preview.webm", 
    title: "Karpe World" 
  },
  { 
    thumb: "02_flax_thumbnail.jpg",       
    vid: "flax_preview.webm",       
    title: "Flax" 
  },
  { 
    thumb: "03_bossfight_thumbnail.jpg",  
    vid: "bossfight_preview.webm",  
    title: "Bossfight" 
  },
  { 
    thumb: "04_coast_thumbnail.jpg",      
    vid: "coast_preview.webm",      
    title: "Coast" 
  },
  { 
    thumb: "05_CCTV_thumbnail.jpg",       
    vid: "cctv_preview.webm",       
    title: "CCTV" 
  },
  { 
    thumb: "06_lego_thumbnail.jpg",       
    vid: "lego_preview.webm",       
    title: "Lego" 
  },
  { 
    thumb: "07_robotcitadel_thumbnail.jpg", 
    vid: "robotcitadel_preview.webm", 
    title: "Robot Citadel" 
  },
  { 
    thumb: "08_eternalascend_thumbnail.jpg", 
    vid: "eternalascend_preview.webm", 
    title: "Eternal Ascend" 
  },
  { 
    thumb: "09_hospital_thumbnail.jpg",   
    vid: "hospital_preview.webm",   
    title: "Hospital" 
  },
  { 
    thumb: "10_endlessengines_thumbnail.jpg", 
    vid: "endlessengines_preview.webm", 
    title: "Endless Engines" 
  }
];

// Map raw data to the internal project structure
const PROJECTS = RAW_DATA.map((p, i) => ({
  id: i,
  img: `assets/portfolio/${p.thumb}`,
  vid: `assets/portfolio/${p.vid}`,
  title: p.title
}));

function makeItem(p) {
  const d = document.createElement("div");
  d.className = "reel-item";
  
  // Background Image
  d.style.backgroundImage = `url("${p.img}")`;
  d.style.backgroundSize = "cover";
  d.style.backgroundPosition = "center";
  d.style.backgroundColor = "#111";

  // Text Overlay
  const title = document.createElement("div");
  title.className = "reel-title";
  title.innerText = p.title;
  d.appendChild(title);
  
  // Hover Logic (Video & Title)
  let video = null;

  d.addEventListener("mouseenter", () => {
    // Show Title
    title.style.opacity = "1";
    title.style.transform = "translateY(0)";

    // Lazy Load Video
    if (!video) {
      video = document.createElement("video");
      video.src = p.vid;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.className = "reel-video";
      
      video.style.position = "absolute";
      video.style.inset = "0";
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      video.style.opacity = "0";
      video.style.transition = "opacity 0.4s ease";
      
      // Insert video BEHIND the title so text stays on top
      d.insertBefore(video, title);
      
      video.play()
        .then(() => { video.style.opacity = "1"; })
        .catch(e => console.log("Autoplay blocked", e));
    } else {
      video.play();
      video.style.opacity = "1";
    }
  });

  d.addEventListener("mouseleave", () => {
    // Hide Title
    title.style.opacity = "0";
    title.style.transform = "translateY(10px)";

    // Hide Video
    if (video) {
      video.style.opacity = "0";
      setTimeout(() => {
        if (video) {
          video.pause();
          video.remove(); 
          video = null;
        }
      }, 400);
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