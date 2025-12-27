/* Vanilla JS adaptation of Gradual Blur
  Original concept by Ansh (reactbits.dev)
*/

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
  const defaults = {
    position: 'bottom', // top, bottom, left, right
    strength: 2,
    size: '6rem',       // width for side blurs, height for top/bottom
    divCount: 5,
    exponential: false,
    opacity: 1,
    zIndex: 5
  };

  const opts = { ...defaults, ...config };

  // Create container
  const container = document.createElement('div');
  container.className = `gradual-blur gradual-blur-${opts.position}`;
  
  // Base styles for the container
  Object.assign(container.style, {
    position: 'absolute',
    zIndex: opts.zIndex,
    pointerEvents: 'none', // let clicks pass through
    overflow: 'hidden',
  });

  // Positioning logic
  if (['top', 'bottom'].includes(opts.position)) {
    container.style.left = '0';
    container.style.right = '0';
    container.style.height = opts.size;
    container.style[opts.position] = '0';
  } else {
    container.style.top = '0';
    container.style.bottom = '0';
    container.style.width = opts.size;
    container.style[opts.position] = '0';
  }

  // Create the blur layers
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
    
    // Logic from the React component
    let progress = i / opts.divCount;
    // Simple bezier curve approximation: p * p * (3 - 2 * p)
    progress = progress * progress * (3 - 2 * progress);

    let blurValue;
    if (opts.exponential) {
      blurValue = Math.pow(2, progress * 4) * 0.0625 * opts.strength;
    } else {
      blurValue = 0.0625 * (progress * opts.divCount + 1) * opts.strength;
    }

    // Calculate mask stops
    const p1 = Math.round((increment * i - increment) * 10) / 10;
    const p2 = Math.round(increment * i * 10) / 10;
    const p3 = Math.round((increment * i + increment) * 10) / 10;
    const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

    let gradient = `transparent ${p1}%, black ${p2}%`;
    if (p3 <= 100) gradient += `, black ${p3}%`;
    if (p4 <= 100) gradient += `, transparent ${p4}%`;

    const mask = `linear-gradient(${direction}, ${gradient})`;

    Object.assign(layer.style, {
      position: 'absolute',
      inset: '0',
      maskImage: mask,
      webkitMaskImage: mask,
      backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
      webkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
    });

    inner.appendChild(layer);
  }

  container.appendChild(inner);
  targetElement.appendChild(container); // Append to the target
  
  // Make sure parent is relative if we are absolute positioning
  const style = window.getComputedStyle(targetElement);
  if (style.position === 'static') {
    targetElement.style.position = 'relative';
  }
}