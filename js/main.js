/* ---------------------------
   YOUTUBE API SETUP
---------------------------- */
// We need to load the API asynchronously
let player = null;
let isPlayerReady = false;
let progressInterval = null;

// 1. Inject API Script
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 2. Define global callback
window.onYouTubeIframeAPIReady = function() {
  // Wait for calls
};

function initPlayer(videoId) {
  if (player) {
    player.loadVideoById(videoId);
    return;
  }

  player = new YT.Player('player-placeholder', {
    height: '100%',
    width: '100%',
    videoId: videoId,
    playerVars: {
      'autoplay': 1,
      'controls': 0, 
      'disablekb': 1, // Disable keyboard controls
      'fs': 0,        // Disable fullscreen button
      'rel': 0,
      'modestbranding': 1,
      'loop': 1,       // Try native loop
      'playlist': videoId 
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  isPlayerReady = true;
  event.target.playVideo();
  startProgressLoop();
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    startProgressLoop();
  } 
  // CHANGED: Force loop if native loop fails
  else if (event.data === YT.PlayerState.ENDED) {
    player.playVideo(); 
  }
  else {
    stopProgressLoop();
  }
}

// 3. Progress Bar Logic
const progressFill = document.getElementById("progress-fill");
const progressContainer = document.getElementById("progress-container");

function startProgressLoop() {
  stopProgressLoop();
  progressInterval = requestAnimationFrame(updateProgress);
}

function stopProgressLoop() {
  if (progressInterval) cancelAnimationFrame(progressInterval);
}

function updateProgress() {
  if (!player || !isPlayerReady) return;
  
  if (typeof player.getCurrentTime !== 'function' || typeof player.getDuration !== 'function') return;

  const current = player.getCurrentTime();
  const duration = player.getDuration();

  if (duration > 0) {
    const percent = (current / duration) * 100;
    progressFill.style.width = `${percent}%`;
  }
  
  progressInterval = requestAnimationFrame(updateProgress);
}

// 4. Scrubbing Logic
progressContainer.addEventListener("click", (e) => {
  if (!player || !isPlayerReady) return;
  
  const rect = progressContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const width = rect.width;
  const clickPercent = x / width; 
  
  const duration = player.getDuration();
  if (duration > 0) {
    const seekTime = duration * clickPercent;
    player.seekTo(seekTime, true);
  }
});

/* ---------------------------
   APP LOGIC
---------------------------- */

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
    title: "KARPE WORLD",
    work: "Assets, Key, Camera track",
    desc: "My contribution to Karpe World focused on asset creation and keying. This delivery was a collaboration with Alf Løvvold. <br><br> <a href='https://www.instagram.com/karpeworld/' target='_blank'>Read more on Instagram...</a>",
    yt: "" 
  },
  { 
    thumb: "02_flax_thumbnail.jpg",       
    vid: "flax_preview.webm",       
    title: "FLAX",
    work: "CG, Key",
    desc: "More info coming soon...",
    yt: "" 
  },
  { 
    thumb: "03_bossfight_thumbnail.jpg",  
    vid: "bossfight_preview.webm",  
    title: "BOSSFIGHT",
    work: "All aspects",
    desc: "My entry for the Boss Fight competition from CreateWithClint. Sound by Brage J Pedersen.",
    yt: "4BDR6Tx-zl8"
  },
  { 
    thumb: "04_coast_thumbnail.jpg",      
    vid: "coast_preview.webm",      
    title: "COAST",
    work: "All aspects",
    desc: "More info coming soon...",
    yt: "" 
  },
  { 
    thumb: "05_CCTV_thumbnail.jpg",       
    vid: "cctv_preview.webm",       
    title: "CCTV",
    work: "All aspects",
    desc: "A hobby project researching the use of ray portal shader in blender.",
    yt: "8qdRl0o8QBs"
  },
  { 
    thumb: "06_lego_thumbnail.jpg",       
    vid: "lego_preview.webm",       
    title: "LEGO",
    work: "All aspects",
    desc: "A fun exercise in trying to make procedural lego tools for blender.",
    yt: "544oUGIO8uY"
  },
  { 
    thumb: "07_robotcitadel_thumbnail.jpg", 
    vid: "robotcitadel_preview.webm", 
    title: "ROBOT CITADEL",
    work: "All aspects",
    desc: "Hard-surface modelling, large scale environment. Sound by Brage J Pedersen.",
    yt: "ZH79UuD8e6o"
  },
  { 
    thumb: "08_eternalascend_thumbnail.jpg", 
    vid: "eternalascend_preview.webm", 
    title: "ETERNAL ASCEND",
    work: "All aspects",
    desc: "My entry for the Eternal Ascend competition from CreateWithClint.",
    yt: "S4hT78YlygY"
  },
  { 
    thumb: "09_hospital_thumbnail.jpg",   
    vid: "hospital_preview.webm",   
    title: "TAPE_04",
    work: "All aspects",
    desc: "Small horror-themed hobby project.",
    yt: "f_4QprZOPUI"
  },
  { 
    thumb: "10_endlessengines_thumbnail.jpg", 
    vid: "endlessengines_preview.webm", 
    title: "ENDLESS ENGINES",
    work: "All aspects",
    desc: "My entry for the Endless Engines community challenge, selected among the Top 100 submissions.",
    yt: "83_wCwVw_aU"
  }
];

const PROJECTS = RAW_DATA.map((p, i) => ({
  id: i,
  img: `assets/portfolio/${p.thumb}`,
  vid: `assets/portfolio/${p.vid}`,
  title: p.title,
  work: p.work,
  desc: p.desc,
  yt: p.yt
}));

// --- MODAL LOGIC ---
const modal = document.getElementById("modal-overlay");
const modalContent = document.querySelector(".modal-content"); 
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");
const modalVideoWrapper = document.querySelector(".modal-video-wrapper"); 
const modalCloseBtn = document.getElementById("modal-close");
const modalBg = document.getElementById("modal-bg");

function openModal(project) {
  modalTitle.innerText = project.title;
  modalDesc.innerHTML = project.desc;
  
  if (project.yt && project.yt !== "") {
    modalContent.classList.remove("no-video");
    modalVideoWrapper.style.display = "block";
    progressContainer.style.display = "block"; 
    
    initPlayer(project.yt);
    
  } else {
    modalContent.classList.add("no-video");
    modalVideoWrapper.style.display = "none";
    progressContainer.style.display = "none"; 
    
    if (player) player.stopVideo();
  }
  
  modal.classList.add("is-active");
}

function closeModal() {
  modal.classList.remove("is-active");
  stopProgressLoop();
  
  setTimeout(() => {
    if (player) {
      player.stopVideo();
    }
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
  d.style.backgroundColor = "#e0e0e0"; 

  // --- Info Container for Title + Work ---
  const info = document.createElement("div");
  info.className = "reel-info";

  const title = document.createElement("div");
  title.className = "reel-title";
  title.innerText = p.title;

  const work = document.createElement("div");
  work.className = "reel-work";
  work.innerText = p.work || ""; 

  info.appendChild(title);
  info.appendChild(work);
  d.appendChild(info);
  // -----------------------------------------------------
  
  // Click Handler: Checks the global isDragging flag
  d.addEventListener("click", (e) => {
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

    // Show the whole info container (Title + Work)
    info.style.opacity = "1";
    info.style.transform = "translateY(0)";

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
      
      d.insertBefore(video, info);
      
      video.play()
        .then(() => { video.style.opacity = "1"; })
        .catch(e => console.log("Autoplay blocked", e));
    } else {
      video.play();
      video.style.opacity = "1";
    }
  });

  d.addEventListener("mouseleave", () => {
    // Hide info
    info.style.opacity = "0";
    info.style.transform = "translateY(10px)";

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