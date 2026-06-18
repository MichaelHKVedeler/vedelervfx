/* ---------------------------
   1. GLOBAL DOM ELEMENTS
---------------------------- */
const modal = document.getElementById("modal-overlay");
const modalContent = document.querySelector(".modal-content");
const modalVideoWrapper = document.querySelector(".modal-video-wrapper");
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");
const modalCloseBtn = document.getElementById("modal-close");
const modalBg = document.getElementById("modal-bg");

const progressFill = document.getElementById("progress-fill");
const progressContainer = document.getElementById("progress-container");

const track = document.getElementById("reel-track");
const viewport = document.querySelector(".reel-viewport");

/* ---------------------------
   2. NATIVE VIDEO & CACHE SETUP
---------------------------- */
let activeVideoNode = null;
let progressInterval = null;
let globalMutedState = false; // Remembers audio preference across navigation

const videoCache = new Map();
let totalCacheSize = 0;
const MAX_CACHE_BYTES = 128 * 1024 * 1024; // 128 MB cache limit to protect iOS

async function fetchAndCacheVideo(url) {
  // Catch both dropbox.com and any modified dropbox streaming links
  if (url.includes("dropbox")) {
    return url;
  }

  if (videoCache.has(url)) return videoCache.get(url).objectUrl;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    
    const blob = await response.blob();
    const size = blob.size;
    
    // Evict oldest videos until we have enough space
    while (totalCacheSize + size > MAX_CACHE_BYTES && videoCache.size > 0) {
      const firstKey = videoCache.keys().next().value;
      const oldest = videoCache.get(firstKey);
      URL.revokeObjectURL(oldest.objectUrl);
      totalCacheSize -= oldest.size;
      videoCache.delete(firstKey);
    }
    
    const objectUrl = URL.createObjectURL(blob);
    videoCache.set(url, { objectUrl, size });
    totalCacheSize += size;
    
    return objectUrl;
  } catch (error) {
    console.warn("Failed to cache video, falling back to direct URL:", error);
    return url; // Fallback to raw URL if download fails
  }
}

// --- CLICK TO TOGGLE PLAY/PAUSE ---
if (modalVideoWrapper) {
  modalVideoWrapper.addEventListener("click", (e) => {
    if (!modal.classList.contains("is-active") || !activeVideoNode) return;
    if (e.target.closest('.video-toggles')) return; // Ignore clicks natively bubbling up from our custom toggles
    
    if (activeVideoNode.paused) {
      activeVideoNode.play();
    } else {
      activeVideoNode.pause();
    }
  });
}

/* ---------------------------
   3. PROGRESS BAR LOGIC
---------------------------- */
function startProgressLoop() {
  stopProgressLoop();
  progressInterval = requestAnimationFrame(updateProgress);
}

function stopProgressLoop() {
  if (progressInterval) cancelAnimationFrame(progressInterval);
}

function updateProgress() {
  if (!activeVideoNode) return;

  const current = activeVideoNode.currentTime;
  const duration = activeVideoNode.duration;

  if (duration > 0) {
    const percent = (current / duration) * 100;
    const fillNode = document.getElementById("ctrl-progress");
    if (fillNode) fillNode.style.width = `${percent}%`;
  }
  progressInterval = requestAnimationFrame(updateProgress);
}

// Scrubbing logic is now bound dynamically inside openModal to the new control bar

/* ---------------------------
   4. MODAL & NAVIGATION LOGIC
---------------------------- */

async function playVideoType(url) {
    if (!url) return;
    modalVideoWrapper.classList.add("is-loading");
    
    if (!activeVideoNode) {
        activeVideoNode = document.createElement("video");
        activeVideoNode.className = "native-modal-video";
        activeVideoNode.loop = true;
        activeVideoNode.playsInline = true;
        
        activeVideoNode.addEventListener("play", () => {
            modalVideoWrapper.classList.add("is-playing");
            startProgressLoop();
        });
        activeVideoNode.addEventListener("pause", () => {
            modalVideoWrapper.classList.remove("is-playing");
            stopProgressLoop();
        });
        
        modalVideoWrapper.appendChild(activeVideoNode);
    } else {
        activeVideoNode.pause();
    }

    try {
        const objectUrl = await fetchAndCacheVideo(url);
        activeVideoNode.src = objectUrl;
        modalVideoWrapper.classList.remove("is-loading");
        activeVideoNode.play();
    } catch(e) {
        console.error("Video load failed", e);
        modalVideoWrapper.classList.remove("is-loading");
    }
}

function getNextId(currentId, direction, skipEmpty) {
    let next = (currentId + direction + PROJECTS.length) % PROJECTS.length;
    if (skipEmpty) {
        while (!PROJECTS[next].final && next !== currentId) {
            next = (next + direction + PROJECTS.length) % PROJECTS.length;
        }
    }
    return next;
}

function openModal(project) {
  modalTitle.innerText = project.title;
  modalDesc.innerHTML = project.desc;
  
  // Cleanup old dynamic elements
  const existingToggles = modalContent.querySelector('.video-toggles');
  if (existingToggles) existingToggles.remove();
  const existingBar = modalContent.querySelector('.modal-control-bar');
  if (existingBar) existingBar.remove();

  // Hide the legacy progress container completely
  if (progressContainer) progressContainer.style.display = "none";

  if (project.final && project.final !== "") {
    modalContent.classList.remove("no-video");
    modalVideoWrapper.style.display = "block";
    modalVideoWrapper.classList.remove("is-playing");

    // Create the new unified Control Bar inside the active video logic
    // This ensures it never appears on non-video projects
    const controlBar = document.createElement("div");
    controlBar.className = "modal-control-bar";

    const btnPrev = document.createElement("button");
    btnPrev.className = "ctrl-btn ctrl-prev";
    btnPrev.innerText = "PREVIOUS";
    btnPrev.onclick = (e) => {
        e.stopPropagation();
        openModal(PROJECTS[getNextId(project.id, -1, true)]); // Force true to always skip empty projects
    };

    const middleSection = document.createElement("div");
    middleSection.className = "ctrl-middle";
    middleSection.innerHTML = `
      <div class="ctrl-progress-fill" id="ctrl-progress"></div>
      <span class="ctrl-index">${(project.id + 1).toString().padStart(2, '0')}/${PROJECTS.length.toString().padStart(2, '0')}</span>
    `;
    
    middleSection.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!activeVideoNode) return;
        const rect = middleSection.getBoundingClientRect();
        const clickPercent = (e.clientX - rect.left) / rect.width;
        if (activeVideoNode.duration > 0) {
            activeVideoNode.currentTime = activeVideoNode.duration * clickPercent;
            activeVideoNode.play();
        }
    });

    const btnAudio = document.createElement("button");
    btnAudio.className = "ctrl-btn ctrl-icon ctrl-audio";
    btnAudio.onclick = (e) => {
        e.stopPropagation();
        if (activeVideoNode) {
            activeVideoNode.muted = !activeVideoNode.muted;
            globalMutedState = activeVideoNode.muted; // Save user preference
            updateControlIcons();
        }
    };

    const btnFs = document.createElement("button");
    btnFs.className = "ctrl-btn ctrl-icon ctrl-fs";
    btnFs.onclick = (e) => {
        e.stopPropagation();
        modalContent.classList.toggle("is-fullscreen");
        updateControlIcons();
    };

    const btnNext = document.createElement("button");
    btnNext.className = "ctrl-btn ctrl-next";
    btnNext.innerText = "NEXT";
    btnNext.onclick = (e) => {
        e.stopPropagation();
        openModal(PROJECTS[getNextId(project.id, 1, true)]); // Force true to always skip empty projects
    };

    function updateControlIcons() {
        const isMuted = activeVideoNode ? activeVideoNode.muted : false;
        const isFs = modalContent.classList.contains("is-fullscreen");
        btnAudio.innerHTML = `<img src="assets/speaker-${isMuted ? 'simple-x' : 'high'}.svg" alt="Audio">`;
        btnFs.innerHTML = `<img src="assets/arrows-${isFs ? 'in' : 'out'}-simple.svg" alt="Fullscreen">`;
    }

    controlBar.appendChild(btnPrev);
    controlBar.appendChild(middleSection);
    controlBar.appendChild(btnAudio);
    controlBar.appendChild(btnFs);
    controlBar.appendChild(btnNext);
    
    modalVideoWrapper.insertAdjacentElement('afterend', controlBar);
    
    if (activeVideoNode) activeVideoNode.muted = globalMutedState; // Apply remembered state
    updateControlIcons();
    
    if (project.breakdown && project.breakdown !== "") {
        const toggleContainer = document.createElement("div");
        toggleContainer.className = "video-toggles";
        
        const btnFinal = document.createElement("button");
        btnFinal.innerText = "FINAL";
        btnFinal.className = "toggle-btn active";
        
        const btnBreakdown = document.createElement("button");
        btnBreakdown.innerText = "BREAKDOWN";
        btnBreakdown.className = "toggle-btn";
        
        btnFinal.onclick = (e) => {
            e.stopPropagation();
            btnBreakdown.classList.remove("active");
            btnFinal.classList.add("active");
            playVideoType(project.final);
        };
        btnBreakdown.onclick = (e) => {
            e.stopPropagation();
            btnFinal.classList.remove("active");
            btnBreakdown.classList.add("active");
            playVideoType(project.breakdown);
        };
        
        toggleContainer.appendChild(btnFinal);
        toggleContainer.appendChild(btnBreakdown);
        modalContent.insertBefore(toggleContainer, modalVideoWrapper);
    }
    
    playVideoType(project.final);
  } else {
    modalContent.classList.add("no-video");
    modalVideoWrapper.style.display = "none";
    
    if (activeVideoNode) activeVideoNode.pause();
  }
  
  modal.classList.add("is-active");
}

function closeModal() {
  modal.classList.remove("is-active");
  stopProgressLoop();
  
  // Reset fullscreen state when closing modal
  modalContent.classList.remove("is-fullscreen");
  
  setTimeout(() => {
    if (activeVideoNode) {
        activeVideoNode.pause();
        activeVideoNode.removeAttribute('src');
        activeVideoNode.load(); // Forces garbage collection of the stream buffer
    }
    modalContent.classList.remove("no-video"); 
    modalVideoWrapper.classList.remove("is-playing");
  }, 300);
}

modalCloseBtn.addEventListener("click", closeModal);
modalBg.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("is-active")) closeModal();
});

// Navigation Views
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
   5. REEL LOGIC & DATA
---------------------------- */
const RAW_DATA = [
  { 
    thumb: "01_karpeworld_thumbnail.jpg", 
    vid: "karpeworld_preview.webm", 
    final: "karpeworld.webm",
    breakdown: "",
    title: "KARPE WORLD",
    work: "Assets, Key, Camera track",
    desc: "My contribution to Karpe World focused on asset creation and keying. This delivery was a collaboration with Alf Løvvold.",
  },
  { 
    thumb: "02_flax_thumbnail.jpg",       
    vid: "flax_preview.webm",
    final: "flax.webm",
    breakdown: "flax_breakdown.webm",     
    title: "FLAX",
    work: "CG, Key",
    desc: "A shot for a commercial for FLAX' christmas calendar.",
  },
  { 
    thumb: "11_dreamsequence_thumbnail.jpg", 
    vid: "dreamsequence_preview.webm", 
    final: "dreamsequence.webm",
    breakdown: "dreamsequence_breakdown.webm",
    title: "DREAM SEQUENCE",
    work: "All aspects",
    desc: "My entry for the Dream Sequence community challenge.",
  },
  { 
    thumb: "10_endlessengines_thumbnail.jpg", 
    vid: "endlessengines_preview.webm", 
    final: "endlessengines.webm",
    breakdown: "endlessengines_breakdown.webm",
    title: "ENDLESS ENGINES",
    work: "All aspects",
    desc: "My entry for the Endless Engines community challenge, selected among the Top 100 submissions.",
  },
  { 
    thumb: "07_robotcitadel_thumbnail.jpg", 
    vid: "robotcitadel_preview.webm", 
    final: "robotcitadel.webm",
    breakdown: "robotcitadel_breakdown.webm",
    title: "ROBOT CITADEL",
    work: "All aspects",
    desc: "Hard-surface modelling, large scale environment. Sound by Brage J Pedersen.",
  },
  { 
    thumb: "04_coast_thumbnail.jpg",      
    vid: "coast_preview.webm",      
    final: "",
    breakdown: "",  
    title: "COAST",
    work: "All aspects",
    desc: "More info coming soon...",
  },
  { 
    thumb: "05_CCTV_thumbnail.jpg",       
    vid: "cctv_preview.webm",       
    final: "cctv.webm",
    breakdown: "cctv_breakdown.webm",  
    title: "CCTV",
    work: "All aspects",
    desc: "A hobby project researching the use of ray portal shader in blender.",
  },
  { 
    thumb: "06_lego_thumbnail.jpg",       
    vid: "lego_preview.webm",       
    final: "lego.webm",
    breakdown: "lego_breakdown.webm",
    title: "LEGO",
    work: "All aspects",
    desc: "A fun exercise in trying to make procedural lego tools for blender.",
  },
  { 
    thumb: "09_hospital_thumbnail.jpg",   
    vid: "hospital_preview.webm",   
    final: "hospital.webm",
    breakdown: "hospital_breakdown.webm",
    title: "TAPE_04",
    work: "All aspects",
    desc: "Small horror-themed hobby project.",
  },
  { 
    thumb: "08_eternalascend_thumbnail.jpg", 
    vid: "eternalascend_preview.webm", 
    final: "eternalascend.webm",
    breakdown: "eternalascend_breakdown.webm",
    title: "ETERNAL ASCEND",
    work: "All aspects",
    desc: "My entry for the Eternal Ascend competition from CreateWithClint.",
  },
  { 
    thumb: "03_bossfight_thumbnail.jpg",  
    vid: "bossfight_preview.webm",  
    final: "bossfight.webm",
    breakdown: "bossfight_breakdown.webm",
    title: "BOSSFIGHT",
    work: "All aspects",
    desc: "My entry for the Boss Fight competition from CreateWithClint. Sound by Brage J Pedersen.",
  },
  { 
    thumb: "13_weavegenerator_thumbnail.jpg", 
    vid: "weavegenerator_preview.webm", 
    final: "https://dl.dropboxusercontent.com/scl/fi/l4y5xt5mtv9wzvvsos7aa/weavegenerator.webm?rlkey=was0i3rdkmpflw2q9fq65nllc&st=n43pqu6r&dl=0",
    breakdown: "",
    title: "WEAVE GENERATOR",
    work: "All aspects",
    desc: "A research project, creating a realistic weave pattern generator.",
  },
  { 
    thumb: "12_playstation_thumbnail.jpg", 
    vid: "playstation_preview.webm", 
    final: "playstation.webm",
    breakdown: "",
    title: "PLAYSTATION",
    work: "All aspects",
    desc: "A hobby project, trying to make a promo video for a fictional event/reveal at playstation.",
  }
];

const PROJECTS = RAW_DATA.map((p, i) => {
  // Check if final or breakdown are full web URLs (like Dropbox)
  const finalPath = p.final && p.final.startsWith("http") 
    ? p.final 
    : (p.final ? `assets/portfolio/${p.final}` : "");

  const breakdownPath = p.breakdown && p.breakdown.startsWith("http") 
    ? p.breakdown 
    : (p.breakdown ? `assets/portfolio/${p.breakdown}` : "");

  return {
    id: i,
    img: `assets/portfolio/${p.thumb}`,
    vid: `assets/portfolio/${p.vid}`,
    title: p.title,
    work: p.work,
    desc: p.desc,
    final: finalPath,
    breakdown: breakdownPath
  };
});

// State for drag vs click
let isDragging = false;

function makeItem(p) {
  const d = document.createElement("div");
  d.className = "reel-item";
  
  d.style.backgroundImage = `url("${p.img}")`;
  d.style.backgroundSize = "cover";
  d.style.backgroundPosition = "center";
  d.style.backgroundColor = "#e0e0e0"; 

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
    if (isDragging) return;

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

/* ---------------------------
   6. SCROLL / DRAG PHYSICS
---------------------------- */
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

// Mouse Wheel
window.addEventListener("wheel", (e) => {
  if (e.target.closest(".reel") || window.innerWidth < 768) {
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    targetPos += delta * 1.0; 
  }
}, { passive: false });

// Kinetic Drag
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
  if (Math.abs(x - dragStartX) > 5) isDragging = true;

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