import * as THREE from "./vendor/three.module.js";

const MAX_COLORS = 8;

const frag = `
#define MAX_COLORS ${MAX_COLORS}
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];
uniform int uTransparent;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform vec2 uPointer; // in NDC [-1,1]
uniform float uMouseInfluence;
uniform float uParallax;
uniform float uNoise;

// new
uniform float uVignette;
uniform float uAberration;

varying vec2 vUv;

float hash(vec2 p){
  return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453123);
}

// Returns (rgb, alpha) packed as vec4
vec4 shade(vec2 uv) {
  float t = uTime * uSpeed;
  vec2 p = uv * 2.0 - 1.0;
  p += uPointer * uParallax * 0.1;

  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);

  q /= max(uScale, 0.0001);
  q /= 0.5 + 0.2 * dot(q, q);
  q += 0.2 * cos(t) - 7.56;

  vec2 toward = (uPointer - rp);
  q += toward * uMouseInfluence * 0.2;

  vec3 col = vec3(0.0);
  float a = 1.0;

  if (uColorCount > 0) {
    vec2 s = q;
    vec3 sumCol = vec3(0.0);
    float cover = 0.0;
    for (int i = 0; i < MAX_COLORS; ++i) {
      if (i >= uColorCount) break;
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float m = mix(m0, m1, kMix);
      float w = 1.0 - exp(-6.0 / exp(6.0 * m));
      sumCol += uColors[i] * w;
      cover = max(cover, w);
    }
    col = clamp(sumCol, 0.0, 1.0);
    a = uTransparent > 0 ? cover : 1.0;
  } else {
    vec2 s = q;
    for (int k = 0; k < 3; ++k) {
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float m = mix(m0, m1, kMix);
      col[k] = 1.0 - exp(-6.0 / exp(6.0 * m));
    }
    a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;
  }

  // grain/noise
  if (uNoise > 0.0001) {
    float n = hash(gl_FragCoord.xy + vec2(uTime));
    col += (n - 0.5) * uNoise;
    col = clamp(col, 0.0, 1.0);
  }

  return vec4(col, a);
}

void main() {
  // Barrel distortion (lens)
  vec2 uv = vUv;
  vec2 p = uv * 2.0 - 1.0;
  float r2 = dot(p, p);
  float k = 0.12; // distortion strength
  vec2 uvLens = (p * (1.0 + k * r2)) * 0.5 + 0.5;

  // Chromatic aberration (rainbow lens split)
  vec2 dir = normalize(p + 1e-6);
  float amt = uAberration * (0.002 + 0.010 * r2);
  vec2 offs = dir * amt;

  vec4 baseG = shade(uvLens);
  vec4 baseR = shade(uvLens + offs);
  vec4 baseB = shade(uvLens - offs);

  vec3 col = vec3(baseR.r, baseG.g, baseB.b);
  float a = baseG.a;

  // Darker, filmic-ish grade
  col *= 0.85;
  col = pow(col, vec3(1.08)); // slightly deeper mids

  // Vignette
  float vig = smoothstep(1.15, 0.2, length(p));
  col *= mix(1.0, vig, clamp(uVignette, 0.0, 1.0));

  // Optional premultiplied alpha behavior
  vec3 rgb = (uTransparent > 0) ? col * a : col;
  gl_FragColor = vec4(rgb, a);
}
`;

const vert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

function hexToVec3(hex) {
  const h = hex.replace("#", "").trim();
  const v =
    h.length === 3
      ? [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
      : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return new THREE.Vector3(v[0] / 255, v[1] / 255, v[2] / 255);
}

export function initColorBends(container, opts = {}) {
  const options = {
    rotation: 30,
    speed: 0.3,
    colors: ["#ff5c7a", "#8a5cff", "#00ffd1"],
    transparent: true,
    autoRotate: 0,
    scale: 1.2,
    frequency: 1.4,
    warpStrength: 1.2,
    mouseInfluence: 0.8,
    parallax: 0.6,
    noise: 0.08,
    vignette: 0.75,
    aberration: 1.0,
    ...opts,
  };

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);

  const uColorsArray = Array.from({ length: MAX_COLORS }, () => new THREE.Vector3(0, 0, 0));

  const material = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      uCanvas: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uSpeed: { value: options.speed },
      uRot: { value: new THREE.Vector2(1, 0) },
      uColorCount: { value: 0 },
      uColors: { value: uColorsArray },
      uTransparent: { value: options.transparent ? 1 : 0 },
      uScale: { value: options.scale },
      uFrequency: { value: options.frequency },
      uWarpStrength: { value: options.warpStrength },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uMouseInfluence: { value: options.mouseInfluence },
      uParallax: { value: options.parallax },
      uNoise: { value: options.noise },
      uVignette: { value: options.vignette },
      uAberration: { value: options.aberration },
    },
    premultipliedAlpha: true,
    transparent: true,
  });

  // Set colors
  const arr = (options.colors || []).filter(Boolean).slice(0, MAX_COLORS).map(hexToVec3);
  for (let i = 0; i < MAX_COLORS; i++) {
    const vec = material.uniforms.uColors.value[i];
    if (i < arr.length) vec.copy(arr[i]);
    else vec.set(0, 0, 0);
  }
  material.uniforms.uColorCount.value = arr.length;

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: "high-performance",
    alpha: true,
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, options.transparent ? 0 : 1);

  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  container.appendChild(renderer.domElement);

  const pointerTarget = new THREE.Vector2(0, 0);
  const pointerCurrent = new THREE.Vector2(0, 0);
  const pointerSmooth = 8;

  const clock = new THREE.Clock();

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    material.uniforms.uCanvas.value.set(w, h);
  }

  resize();

  let ro = null;
  if ("ResizeObserver" in window) {
    ro = new ResizeObserver(resize);
    ro.observe(container);
  } else {
    window.addEventListener("resize", resize);
  }

    function onPointerMove(e) {
    const x = (e.clientX / (window.innerWidth || 1)) * 2 - 1;
    const y = -((e.clientY / (window.innerHeight || 1)) * 2 - 1);

    pointerTarget.set(
        Math.max(-1, Math.min(1, x)),
        Math.max(-1, Math.min(1, y))
    );
    }

  window.addEventListener("pointermove", onPointerMove);

  let raf = 0;

  // --- preset transition (linger) ---
  const transition = {
    active: false,
    elapsed: 0,
    dur: 0.65,
    start: null,
    end: null,
  };

  function smoothstep(x) {
    x = Math.max(0, Math.min(1, x));
    return x < 0.5
      ? 4 * x * x * x
      : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function setParams(p = {}) {
    const u = material.uniforms;

    // snapshot current -> start
    transition.start = {
      speed: u.uSpeed.value,
      warpStrength: u.uWarpStrength.value,
      mouseInfluence: u.uMouseInfluence.value,
      parallax: u.uParallax.value,
      noise: u.uNoise.value,
      vignette: u.uVignette.value,
      aberration: u.uAberration.value,
      scale: u.uScale.value,
      frequency: u.uFrequency.value,
    };

    // build end using provided values (fallback = current)
    transition.end = {
      speed: (typeof p.speed === "number") ? p.speed : transition.start.speed,
      warpStrength: (typeof p.warpStrength === "number") ? p.warpStrength : transition.start.warpStrength,
      mouseInfluence: (typeof p.mouseInfluence === "number") ? p.mouseInfluence : transition.start.mouseInfluence,
      parallax: (typeof p.parallax === "number") ? p.parallax : transition.start.parallax,
      noise: (typeof p.noise === "number") ? p.noise : transition.start.noise,
      vignette: (typeof p.vignette === "number") ? p.vignette : transition.start.vignette,
      aberration: (typeof p.aberration === "number") ? p.aberration : transition.start.aberration,
      scale: (typeof p.scale === "number") ? p.scale : transition.start.scale,
      frequency: (typeof p.frequency === "number") ? p.frequency : transition.start.frequency,
    };

    // Optional: allow overriding linger duration from main.js
    if (typeof p.linger === "number") transition.dur = Math.max(0.05, p.linger);

    transition.elapsed = 0;
    transition.active = true;
  }


  function loop() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    material.uniforms.uTime.value = elapsed;

    // --- apply linger transition ---
    if (transition.active && transition.start && transition.end) {
      transition.elapsed += dt;
      const t = Math.min(1, transition.elapsed / transition.dur);

      // true ease-in / ease-out
      const k = smoothstep(t);
      const u = material.uniforms;

      u.uSpeed.value          = transition.start.speed          + (transition.end.speed          - transition.start.speed)          * k;
      u.uWarpStrength.value   = transition.start.warpStrength   + (transition.end.warpStrength   - transition.start.warpStrength)   * k;
      u.uMouseInfluence.value = transition.start.mouseInfluence + (transition.end.mouseInfluence - transition.start.mouseInfluence) * k;
      u.uParallax.value       = transition.start.parallax       + (transition.end.parallax       - transition.start.parallax)       * k;
      u.uNoise.value          = transition.start.noise          + (transition.end.noise          - transition.start.noise)          * k;
      u.uVignette.value       = transition.start.vignette       + (transition.end.vignette       - transition.start.vignette)       * k;
      u.uAberration.value     = transition.start.aberration     + (transition.end.aberration     - transition.start.aberration)     * k;
      u.uScale.value          = transition.start.scale          + (transition.end.scale          - transition.start.scale)          * k;
      u.uFrequency.value      = transition.start.frequency      + (transition.end.frequency      - transition.start.frequency)      * k;

      if (transition.t >= 1) transition.active = false;
    }

    const deg = (options.rotation % 360) + options.autoRotate * elapsed;
    const rad = (deg * Math.PI) / 180;
    material.uniforms.uRot.value.set(Math.cos(rad), Math.sin(rad));

    const amt = Math.min(1, dt * pointerSmooth);
    pointerCurrent.lerp(pointerTarget, amt);
    material.uniforms.uPointer.value.copy(pointerCurrent);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }

  raf = requestAnimationFrame(loop);

    return {
    setParams,
    destroy: () => {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        else window.removeEventListener("resize", resize);

        window.removeEventListener("pointermove", onPointerMove);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    },
    };
}
