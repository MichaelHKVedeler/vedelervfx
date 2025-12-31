import { createGradualBlur } from "./GradualBlur.js";

function setView(view) {
  document.querySelectorAll(".panel").forEach(p => {
    p.classList.toggle("is-active", p.dataset.panel === view);
  });

  document.querySelectorAll(".navbtn").forEach(b => {
    b.classList.toggle("is-active", b.dataset.view === view);
  });
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-view]");
  if (!btn) return;
  setView(btn.dataset.view);
});

setView("home");

/* ---------------------------
   FILM REEL (Infinite Loop + Kinetic Drag)
---------------------------- */

const track = document.getElementById("reel-track");
const viewport = document.querySelector(".reel-viewport");

// Manual Configuration
const RAW_DATA = [
  { 
    thumb: "01_karpeworld_thumbnail.jpg", 
    vid: "karpeworld_preview.webm", 
    title: "Karpe World",
    desc: "My contribution to Karpe World focused on asset creation and keying. This delivery was a collaboration with Alf Løvvold. <br><br> <a href='https://www.instagram.com/karpeworld/' target='_blank'>Read more on Instagram...</a>",
    yt: "" 
  },
  { 
    thumb: "02_flax_thumbnail.jpg",       
    vid: "flax_preview.webm",       
    title: "Flax",
    desc: "More info coming soon...",
    yt: "" 
  },
  { 
    thumb: "03_bossfight_thumbnail.jpg",  
    vid: "bossfight_preview.webm",  
    title: "Bossfight",
    desc: "My entry for the Boss Fight competition from CreateWithClint. Sound by Brage J Pedersen.",
    yt: "4BDR6Tx-zl8"
  },
  { 
    thumb: "04_coast_thumbnail.jpg",      
    vid: "coast_preview.webm",      
    title: "Coast",
    desc: "More info coming soon...",
    yt: "" 
  },
  { 
    thumb: "05_CCTV_thumbnail.jpg",       
    vid: "cctv_preview.webm",       
    title: "CCTV",
    desc: "A hobby project researching the use of ray portal shader in blender.",
    yt: "8qdRl0o8QBs"
  },
  { 
    thumb: "06_lego_thumbnail.jpg",       
    vid: "lego_preview.webm",       
    title: "Lego",
    desc: "A fun exercise in trying to make procedural lego tools for blender.",
    yt: "544oUGIO8uY"
  },
  { 
    thumb: "07_robotcitadel_thumbnail.jpg", 
    vid: "robotcitadel_preview.webm", 
    title: "Robot Citadel",
    desc: "Hard-surface modelling, large scale environment. Sound by Brage J Pedersen.",
    yt: "ZH79UuD8e6o"
  },
  { 
    thumb: "08_eternalascend_thumbnail.jpg", 
    vid: "eternalascend_preview.webm", 
    title: "Eternal Ascend",
    desc: "My entry for the Eternal Ascend competition from CreateWithClint.",
    yt: "S4hT78YlygY"
  },
  { 
    thumb: "09_hospital_thumbnail.jpg",   
    vid: "hospital_preview.webm",   
    title: "Tape_04",
    desc: "Small horror-themed hobby project.",
    yt: "f_4QprZOPUI"
  },
  { 
    thumb: "10_endlessengines_thumbnail.jpg", 
    vid: "endlessengines_preview.webm", 
    title: "Endless Engines",
    desc: "My entry for the Endless Engines community challenge, selected among the Top 100 submissions.",
    yt: "83_wCwVw_aU"
  }
];

const PROJECTS = RAW_DATA.map((p, i) => ({
  id: i,
  img: `assets/portfolio/${p.thumb}`,
  vid: `assets/portfolio/${p.vid}`,
  title: p.title,
  desc: p.desc,
  yt: p.yt
}));

// --- MODAL LOGIC ---
const modal = document.getElementById("modal-overlay");
const modalContent = document.querySelector(".modal-content"); 
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");
const modalIframe = document.getElementById("modal-iframe");
const modalVideoWrapper = document.querySelector(".modal-video-wrapper"); 
const modalCloseBtn = document.getElementById("modal-close");
const modalBg = document.getElementById("modal-bg");

function openModal(project) {
  modalTitle.innerText = project.title;
  modalDesc.innerHTML = project.desc;
  
  if (project.yt && project.yt !== "") {
    modalContent.classList.remove("no-video");
    modalVideoWrapper.style.display = "block";
    modalIframe.src = `https://www.youtube.com/embed/${project.yt}?autoplay=1&rel=0&modestbranding=1`;
  } else {
    modalContent.classList.add("no-video");
    modalVideoWrapper.style.display = "none";
    modalIframe.src = "";
  }
  
  modal.classList.add("is-active");
}

function closeModal() {
  modal.classList.remove("is-active");
  setTimeout(() => {
    modalIframe.src = ""; 
    modalContent.classList.remove("no-video"); 
  }, 300);
}

modalCloseBtn.addEventListener("click", closeModal);
modalBg.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("is-active")) closeModal();
});


// State to differentiate between a "Drag" and a "Click"
let isDragging = false;

function makeItem(p) {
  const d = document.createElement("div");
  d.className = "reel-item";
  
  d.style.backgroundImage = `url("${p.img}")`;
  d.style.backgroundSize = "cover";
  d.style.backgroundPosition = "center";
  d.style.backgroundColor = "#e0e0e0"; // Light placeholder

  const title = document.createElement("div");
  title.className = "reel-title";
  title.innerText = p.title;
  d.appendChild(title);
  
  // Click Handler: Checks the global isDragging flag
  d.addEventListener("click", (e) => {
    // If we just finished a drag, block the click.
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    openModal(p);
  });
  
  let video = null;

  d.addEventListener("mouseenter", () => {
    // Don't play video if dragging
    if (isDragging) return;

    title.style.opacity = "1";
    title.style.transform = "translateY(0)";

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
    title.style.opacity = "0";
    title.style.transform = "translateY(10px)";

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

// --- SCROLL / DRAG PHYSICS ---

let setWidth = 0;
let scrollPos = 0;
let targetPos = 0;

function measureSetWidth() {
  const items = track.querySelectorAll(".reel-item");
  
  if (!viewport || !items.length) return;

  const firstItemOfSecondSet = items[PROJECTS.length];
  if (!firstItemOfSecondSet) return;

  let currentRatio = 0;
  if (setWidth > 0) {
    currentRatio = scrollPos / setWidth;
  }

  const newSetWidth = firstItemOfSecondSet.offsetLeft; 
  
  if (setWidth === 0) {
    const viewportCenter = viewport.clientWidth * 0.5;
    const itemWidth = items[0].offsetWidth;
    const initialPos = newSetWidth - (viewportCenter - itemWidth / 2);
    
    scrollPos = initialPos;
    targetPos = initialPos;
  } else {
    scrollPos = currentRatio * newSetWidth;
    targetPos = scrollPos;
  }
  
  setWidth = newSetWidth;
}

window.addEventListener("load", measureSetWidth);
window.addEventListener("resize", measureSetWidth);

// 1. MOUSE WHEEL
window.addEventListener("wheel", (e) => {
  if (e.target.closest(".reel") || window.innerWidth < 768) {
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    targetPos += delta * 1.0; 
  }
}, { passive: false });

// 2. KINETIC DRAG (Mouse + Touch)
let dragStartX = 0;
let dragLastX = 0;
let isPointerDown = false;
let velocity = 0;

viewport.addEventListener("pointerdown", (e) => {
  isPointerDown = true;
  isDragging = false; 
  dragStartX = e.clientX;
  dragLastX = e.clientX;
  velocity = 0; 
  
  targetPos = scrollPos; 
  
  viewport.style.cursor = "grabbing";
  e.preventDefault(); 
});

window.addEventListener("pointermove", (e) => {
  if (!isPointerDown) return;

  const x = e.clientX;
  const diff = dragLastX - x;
  
  if (Math.abs(x - dragStartX) > 5) {
    isDragging = true;
  }

  targetPos += diff * 1.5; 
  
  velocity = diff;
  dragLastX = x;
});

window.addEventListener("pointerup", handleDragEnd);
window.addEventListener("pointercancel", handleDragEnd);

function handleDragEnd() {
  if (!isPointerDown) return;
  isPointerDown = false;
  viewport.style.cursor = "grab";

  targetPos += velocity * 15; 
  
  setTimeout(() => {
    isDragging = false;
  }, 50);
}

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

if (window.innerWidth > 768) {
  createGradualBlur(document.body, { 
    position: 'left',
    fixed: true,
    strength: 2,
    divCount: 5,
    size: '150px',
    zIndex: 5          
  });

  createGradualBlur(document.body, {
    position: 'right',
    fixed: true,
    strength: 2,
    divCount: 5,
    size: '150px',
    zIndex: 5
  });
}