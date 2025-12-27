/* Vanilla JS adaptation of Gradual Blur
   Original concept by Ansh (reactbits.dev)
*/

function injectStyles() {
  const styleId = 'gradual-blur-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .gradual-blur {
      pointer-events: none;
      transform: translate3d(0, 0, 0);
    }
    .gradual-blur-inner > div {
      position: absolute;
      inset: 0;
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-size: 100% 100%;
      mask-size: 100% 100%;
    }
  `;
  document.head.appendChild(style);
}

function getGradientDirection(position) {
  switch (position) {
    case 'top': return 'to top';
    case 'bottom': return 'to bottom';
    case 'left': return 'to left';
    case 'right': return 'to right';
    default: return 'to bottom';
  }
}

export function createGradualBlur(targetElement, config = {}) {
  injectStyles(); 

  const defaults = {
    position: 'bottom',
    strength: 2,
    size: '6rem',
    divCount: 5,
    exponential: false,
    opacity: 1,
    zIndex: 5,
    fixed: false // New Option
  };

  const opts = { ...defaults, ...config };

  // Create container
  const container = document.createElement('div');
  container.className = `gradual-blur gradual-blur-${opts.position}`;
  
  // Apply Fixed vs Absolute positioning
  Object.assign(container.style, {
    position: opts.fixed ? 'fixed' : 'absolute',
    zIndex: opts.zIndex,
    overflow: 'hidden',
  });

  // Positioning Logic
  if (['left', 'right'].includes(opts.position)) {
    // Left/Right: Stretch Top-to-Bottom
    container.style.top = '0';
    container.style.bottom = '0';
    container.style.width = opts.size;
    container.style[opts.position] = '0'; 
  } else {
    // Top/Bottom: Stretch Left-to-Right
    container.style.left = '0';
    container.style.right = '0';
    container.style.height = opts.size;
    container.style[opts.position] = '0';
  }

  // Create the inner wrapper
  const inner = document.createElement('div');
  inner.className = 'gradual-blur-inner';
  Object.assign(inner.style, {
    position: 'relative',
    width: '100%',
    height: '100%',
    opacity: opts.opacity
  });

  const increment = 100 / opts.divCount;
  const direction = getGradientDirection(opts.position);

  for (let i = 1; i <= opts.divCount; i++) {
    const layer = document.createElement('div');
    
    // Math Logic
    let progress = i / opts.divCount;
    progress = progress * progress * (3 - 2 * progress); // Ease

    let blurValue;
    if (opts.exponential) {
      blurValue = Math.pow(2, progress * 4) * 0.0625 * opts.strength;
    } else {
      blurValue = 0.0625 * (progress * opts.divCount + 1) * opts.strength;
    }

    const p1 = Math.round((increment * i - increment) * 10) / 10;
    const p2 = Math.round(increment * i * 10) / 10;
    const p3 = Math.round((increment * i + increment) * 10) / 10;
    const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

    let gradient = `transparent ${p1}%, black ${p2}%`;
    if (p3 <= 100) gradient += `, black ${p3}%`;
    if (p4 <= 100) gradient += `, transparent ${p4}%`;

    const mask = `linear-gradient(${direction}, ${gradient})`;

    layer.style.maskImage = mask;
    layer.style.webkitMaskImage = mask;
    layer.style.background = 'rgba(255,255,255,0.001)'; 
    layer.style.backdropFilter = `blur(${blurValue.toFixed(3)}rem)`;
    layer.style.webkitBackdropFilter = `blur(${blurValue.toFixed(3)}rem)`;

    inner.appendChild(layer);
  }

  container.appendChild(inner);

  // CRITICAL CHANGE:
  // If fixed, we append to body to ensure it sits relative to the window,
  // not trapped inside the relative 'viewport' container.
  if (opts.fixed) {
    document.body.appendChild(container);
  } else {
    targetElement.appendChild(container);
    // Ensure parent handles absolute children
    const style = window.getComputedStyle(targetElement);
    if (style.position === 'static') {
      targetElement.style.position = 'relative';
    }
  }
}