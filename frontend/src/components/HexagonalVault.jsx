import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const QUAD_VERT = `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const VELOCITY_FRAG = `
precision highp float;

uniform sampler2D uVelocity;
uniform vec2 uSize;
uniform vec2 uCanvas;
uniform float uDt;
uniform float uDecay;
uniform float uBlend;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform vec2 uBrushVelocity;
uniform float uRadius;

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 e = b - a;
  float t = clamp(dot(p - a, e) / max(dot(e, e), 1e-4), 0.0, 1.0);
  return length(p - a - e * t);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 p = uv * uCanvas - uCanvas * 0.5;
  vec2 v = texture2D(uVelocity, uv).xy;
  vec2 carried = texture2D(uVelocity, uv - v * uDt / uCanvas).xy * uDecay;
  float d = segment(p, uFrom, uTo) / uRadius;
  float w = exp(-d * d * d * d) * uBlend;
  gl_FragColor = vec4(mix(carried, uBrushVelocity, w), 0.0, 1.0);
}
`;

const LIGHT_FRAG = `
precision highp float;

uniform sampler2D uLight;
uniform sampler2D uVelocity;
uniform vec2 uSize;
uniform vec2 uCanvas;
uniform float uDt;
uniform float uDrift;
uniform vec2 uDecay;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uEnergy;

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 e = b - a;
  float t = clamp(dot(p - a, e) / max(dot(e, e), 1e-4), 0.0, 1.0);
  return length(p - a - e * t);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 p = uv * uCanvas - uCanvas * 0.5;
  vec2 v = texture2D(uVelocity, uv).xy;
  vec2 light = texture2D(uLight, uv - v * uDrift * uDt / uCanvas).xy * uDecay;
  float d = segment(p, uFrom, uTo) / uRadius;
  float paint = exp(-d * d) * uEnergy;
  gl_FragColor = vec4(max(light, vec2(paint)), 0.0, 1.0);
}
`;

const VAULT_FRAG = `
precision highp float;

#define MAX_PULSES 4

uniform vec2 uResolution;
uniform float uCell;
uniform float uTime;
uniform float uClock;
uniform sampler2D uLight;
uniform vec3 uLens;
uniform float uLensRadius;
uniform vec4 uPulses[MAX_PULSES];
uniform float uPulseSpeed;
uniform float uLineWidth;
uniform float uLitWidth;
uniform float uLattice;
uniform float uGlow;
uniform float uGlowRadius;
uniform float uShimmer;
uniform float uVignette;
uniform float uGrain;
uniform float uCore;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uBackground;
uniform float uInk;
uniform float uTransparent;

const float HALF_EDGE = 0.2886751;

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

void main() {
  vec2 p = gl_FragCoord.xy - uResolution * 0.5;
  vec2 q = p.yx / uCell;
  vec2 s = vec2(1.0, 1.7320508);
  vec4 hc = floor(vec4(q, q - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(q - hc.xy * s, q - (hc.zw + 0.5) * s);
  vec2 o;
  vec2 c;
  if (dot(h.xy, h.xy) < dot(h.zw, h.zw)) {
    o = h.xy;
    c = hc.xy * s;
  } else {
    o = h.zw;
    c = (hc.zw + 0.5) * s;
  }

  vec2 dirs[3];
  dirs[0] = vec2(1.0, 0.0);
  dirs[1] = vec2(0.5, 0.8660254);
  dirs[2] = vec2(-0.5, 0.8660254);

  float nearest = 1e9;
  vec2 nearestMid = vec2(0.0);
  float lineLit = 0.0;
  float glowLit = 0.0;
  float haloLit = 0.0;
  float heatSum = 0.0;
  float heatWeight = 1e-4;
  float pulseLine = 0.0;
  float pulseGlow = 0.0;
  float pulseHeat = 0.0;
  float aa = 0.55;
  float glowRadius = max(uGlowRadius, 0.5);

  for (int e = 0; e < 6; e++) {
    int slot = e < 3 ? e : e - 3;
    vec2 n = dirs[slot] * (e < 3 ? 1.0 : -1.0);
    vec2 t = vec2(-n.y, n.x);
    vec2 rel = o - n * 0.5;
    float along = dot(rel, t);
    float across = dot(rel, n);
    float dist = length(vec2(across, max(abs(along) - HALF_EDGE, 0.0))) * uCell;
    vec2 midPx = (c + n * 0.5).yx * uCell;
    if (dist < nearest) {
      nearest = dist;
      nearestMid = midPx;
    }

    vec2 tPx = t.yx;
    vec2 endA = midPx - tPx * HALF_EDGE * uCell;
    vec2 endB = midPx + tPx * HALF_EDGE * uCell;
    float clampedAlong = clamp(along, -HALF_EDGE, HALF_EDGE) * uCell;
    float fall = exp(-dist / glowRadius);

    vec2 at = midPx + tPx * clampedAlong;
    vec2 wake = texture2D(uLight, at / uResolution + 0.5).rg;
    vec2 offset = (at - uLens.xy) / uLensRadius;
    float r2 = dot(offset, offset);
    float lens = (0.62 * exp(-r2 * 4.0) + 0.38 * exp(-r2 * 0.8)) * uLens.z;
    float lit = max(wake.x, lens);
    float warm = max(wake.y, lens) * smoothstep(0.0, 0.3, lit);
    lit = pow(lit, 1.4);

    float edgeWidth = mix(uLineWidth, uLitWidth, clamp(lit, 0.0, 1.0));
    float edgeCover = 1.0 - smoothstep(edgeWidth * 0.5 - aa, edgeWidth * 0.5 + aa, dist);
    float edgeLine = edgeCover * lit;
    float edgeGlow = fall * lit;
    lineLit = max(lineLit, edgeLine);
    glowLit = max(glowLit, edgeGlow);
    haloLit = max(haloLit, exp(-dist / (glowRadius * 1.8)) * lit * warm * warm);
    heatSum += warm * (edgeLine + edgeGlow);
    heatWeight += edgeLine + edgeGlow;

    float spark = 0.0;
    float head = 0.0;
    for (int k = 0; k < MAX_PULSES; k++) {
      vec4 pl = uPulses[k];
      float age = uClock - pl.z;
      if (pl.w <= 0.0 || age < 0.0 || age > 7.0) continue;
      float da = length(endA - pl.xy);
      float db = length(endB - pl.xy);
      float fromNear = da < db ? clampedAlong + HALF_EDGE * uCell : HALF_EDGE * uCell - clampedAlong;
      float jitter = (hash(floor(midPx * 0.25) + pl.z) - 0.5) * 0.3 * uCell;
      float front = age * uPulseSpeed - min(da, db) + jitter;
      float gap = fromNear - front;
      float fade = exp(-age * 0.55) * pl.w;
      float headK = exp(-gap * gap / (0.018 * uCell * uCell)) * fade;
      float tailK = (gap < 0.0 ? exp(gap / (0.7 * uCell)) : 0.0) * fade;
      spark += headK + tailK * 0.3;
      head = max(head, headK);
    }
    float pulseWidth = mix(uLineWidth, uLitWidth, clamp(spark, 0.0, 1.0));
    float pulseCover = 1.0 - smoothstep(pulseWidth * 0.5 - aa, pulseWidth * 0.5 + aa, dist);
    pulseLine = max(pulseLine, pulseCover * spark);
    pulseGlow = max(pulseGlow, fall * spark);
    pulseHeat = max(pulseHeat, head * max(pulseCover, fall));
  }

  float heat = heatSum / heatWeight;

  float baseLine = 1.0 - smoothstep(uLineWidth * 0.5 - aa, uLineWidth * 0.5 + aa, nearest);
  float sweep = 0.5 + 0.5 * sin(dot(nearestMid / uCell, vec2(0.21, 0.13)) - uTime * 0.35);
  float shimmer = pow(sweep, 8.0) * uShimmer;

  float energy = clamp(lineLit + pulseLine, 0.0, 1.6);
  float glow = clamp(glowLit + pulseGlow, 0.0, 1.6);
  float hot = clamp(heat * 0.9 + pulseHeat, 0.0, 1.0);
  vec3 cool = mix(uColorA, vec3(dot(uColorA, vec3(0.2126, 0.7152, 0.0722))) * 1.6, 0.2);
  vec3 lineColor = mix(cool, uColorB, smoothstep(0.2, 0.75, hot));
  float radial = length(p / uResolution.y);

  float dither = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  float grain = (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * uGrain * 0.05;

  if (uInk > 0.5) {
    vec3 ink = mix(uColorA, uColorB, smoothstep(0.2, 0.9, hot) * 0.6);
    vec3 neutral = vec3(0.08, 0.08, 0.1);
    vec3 color = uBackground * (1.0 - uVignette * 0.04 * smoothstep(0.2, 1.1, radial));
    color = mix(color, neutral, baseLine * uLattice * (0.22 + 0.12 * shimmer));
    color = mix(color, ink, clamp(glow * uGlow * 0.22 + haloLit * uGlow * 0.1, 0.0, 0.45));
    color = mix(color, ink, clamp(min(energy, 1.0) * 1.8, 0.0, 1.0));
    gl_FragColor = vec4(toSrgb(color) + dither + grain, 1.0);
    return;
  }

  vec3 latticeColor = mix(uColorA, vec3(0.82, 0.88, 0.96), 0.25);
  vec3 emission = latticeColor * baseLine * uLattice * (0.35 + 0.25 * shimmer);
  float white = smoothstep(0.45, 0.95, hot * min(energy, 1.0));
  vec3 core = mix(lineColor, vec3(1.0), uCore * white);
  emission += core * energy * (1.8 + 1.2 * white);
  emission += lineColor * glow * uGlow * 0.45;
  emission += mix(lineColor, uColorB, 0.5) * haloLit * uGlow * 0.15;

  if (uTransparent > 0.5) {
    vec3 light = 1.0 - exp(-emission * 1.15);
    float alpha = clamp(max(max(light.r, light.g), light.b) * 1.6, 0.0, 0.95);
    gl_FragColor = vec4(toSrgb(light) + dither * step(0.004, alpha), alpha);
    return;
  }

  vec3 base = uBackground * (1.0 + uVignette * 0.6 * (1.0 - smoothstep(0.0, 1.1, radial)));
  vec3 color = base + emission;
  color = 1.0 - exp(-color * 1.05);
  gl_FragColor = vec4(toSrgb(color) + dither + grain, 1.0);
}
`;

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

const isColorTransparent = (col) => {
  if (!col) return true;
  const t = col.trim().toLowerCase();
  return t === 'transparent' || t === 'rgba(0,0,0,0)' || t.endsWith('00');
};

const hexToRgb = (hex, fallback = '#5227FF') => {
  try {
    return new THREE.Color(hex);
  } catch {
    return new THREE.Color(fallback);
  }
};

export default function HexagonalVault({
  colors = ['#5227FF', '#FF9FFC'],
  backgroundColor = 'transparent',
  cellSize = 1.9,
  lineWidth = 0.5,
  litWidth = 1.8,
  lattice = 0.4,
  glow = 1.5,
  glowRadius = 0.5,
  core = 0.4,
  vignette = 0,
  grain = 1,
  trailLength = 3,
  trailWidth = 1,
  follow = 0.5,
  flow = 0.5,
  autoplay = true,
  shimmer = 1,
  speed = 1,
  interactive = true,
  clickPulses = true,
  pulseSpeed = 1,
  autoSparks = true,
  sparkInterval = 2.8,
  seed = 0,
  paused = false,
  dpr = 1.5,
  className = '',
  style = {},
  children,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let rect = container.getBoundingClientRect();
    let width = Math.max(rect.width, 10);
    let height = Math.max(rect.height, 10);

    const actualDpr = Math.min(window.devicePixelRatio || 1, dpr || 1.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(actualDpr);
    renderer.setSize(width, height, false);

    // Quad geometry & orthographic camera
    const quadGeom = new THREE.PlaneGeometry(2, 2);
    const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Simulation resolution
    let cellPx = 72 * clamp(cellSize, 0.15, 4) * actualDpr;
    let downscale = clamp(Math.round(cellPx / 20), 2, 8);
    let simW = Math.max(16, Math.ceil((width * actualDpr) / downscale));
    let simH = Math.max(16, Math.ceil((height * actualDpr) / downscale));

    const createRenderTarget = (w, h) =>
      new THREE.WebGLRenderTarget(w, h, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: false,
        stencilBuffer: false,
      });

    const velTargets = [createRenderTarget(simW, simH), createRenderTarget(simW, simH)];
    const lightTargets = [createRenderTarget(simW, simH), createRenderTarget(simW, simH)];
    let flip = 0;

    const velUniforms = {
      uVelocity: { value: null },
      uSize: { value: new THREE.Vector2(simW, simH) },
      uCanvas: { value: new THREE.Vector2(width * actualDpr, height * actualDpr) },
      uDt: { value: 0 },
      uDecay: { value: 1 },
      uBlend: { value: 0 },
      uFrom: { value: new THREE.Vector2() },
      uTo: { value: new THREE.Vector2() },
      uBrushVelocity: { value: new THREE.Vector2() },
      uRadius: { value: 100 },
    };
    const velMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: VELOCITY_FRAG,
      uniforms: velUniforms,
      depthTest: false,
      depthWrite: false,
    });

    const lightUniforms = {
      uLight: { value: null },
      uVelocity: { value: null },
      uSize: { value: new THREE.Vector2(simW, simH) },
      uCanvas: { value: new THREE.Vector2(width * actualDpr, height * actualDpr) },
      uDt: { value: 0 },
      uDrift: { value: 0.5 },
      uDecay: { value: new THREE.Vector2(1, 1) },
      uFrom: { value: new THREE.Vector2() },
      uTo: { value: new THREE.Vector2() },
      uRadius: { value: 100 },
      uEnergy: { value: 0 },
    };
    const lightMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: LIGHT_FRAG,
      uniforms: lightUniforms,
      depthTest: false,
      depthWrite: false,
    });

    const simQuad = new THREE.Mesh(quadGeom, velMat);
    simQuad.frustumCulled = false;
    const simScene = new THREE.Scene();
    simScene.add(simQuad);

    // Final screen material
    const isTrans = isColorTransparent(backgroundColor);
    const colA = hexToRgb(colors[0], '#5227FF');
    const colB = hexToRgb(colors[1] || colors[0], '#FF9FFC');
    const bgCol = hexToRgb(isTrans ? '#000000' : backgroundColor, '#000000');
    const lum = 0.2126 * bgCol.r + 0.7152 * bgCol.g + 0.0722 * bgCol.b;

    const vaultUniforms = {
      uResolution: { value: new THREE.Vector2(width * actualDpr, height * actualDpr) },
      uCell: { value: cellPx },
      uTime: { value: 0 },
      uClock: { value: 0 },
      uLight: { value: null },
      uLens: { value: new THREE.Vector3() },
      uLensRadius: { value: 100 },
      uPulses: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, -99, 0)) },
      uPulseSpeed: { value: 400 },
      uLineWidth: { value: clamp(lineWidth, 0.2, 4) * actualDpr },
      uLitWidth: { value: clamp(litWidth, 0.5, 8) * actualDpr },
      uLattice: { value: clamp(lattice, 0, 3) },
      uGlow: { value: clamp(glow, 0, 3) },
      uGlowRadius: { value: 4.5 * clamp(glowRadius, 0.1, 4) * actualDpr },
      uShimmer: { value: clamp(shimmer, 0, 2) },
      uVignette: { value: clamp(vignette, 0, 1) },
      uGrain: { value: clamp(grain, 0, 1) },
      uCore: { value: clamp(core, 0, 1) },
      uColorA: { value: new THREE.Vector3(colA.r, colA.g, colA.b) },
      uColorB: { value: new THREE.Vector3(colB.r, colB.g, colB.b) },
      uBackground: { value: new THREE.Vector3(bgCol.r, bgCol.g, bgCol.b) },
      uInk: { value: !isTrans && lum > 0.2 ? 1 : 0 },
      uTransparent: { value: isTrans ? 1 : 0 },
    };

    const vaultMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: VAULT_FRAG,
      uniforms: vaultUniforms,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    const finalMesh = new THREE.Mesh(quadGeom, vaultMat);
    finalMesh.frustumCulled = false;
    const finalScene = new THREE.Scene();
    finalScene.add(finalMesh);

    // Pointer & simulation physics state
    const pointer = {
      x: 0,
      y: 0,
      inside: false,
      presses: 0,
      pressX: 0,
      pressY: 0,
    };

    // RNG for autonomous wandering light
    let s = (0x2f6b9d11 ^ Math.floor(7919 * (seed + 0.5))) >>> 0;
    const rng = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      return (((t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ (t >>> 14)) >>> 0) / 0x100000000;
    };

    const state = {
      time: 0,
      clock: 0,
      brushX: 0,
      brushY: 0,
      brushVX: 0,
      brushVY: 0,
      hasBrush: false,
      tracking: false,
      pointerX: 0,
      pointerY: 0,
      pointerVX: 0,
      pointerVY: 0,
      roaming: false,
      roamX: (rng() - 0.5) * 0.5 * width * actualDpr,
      roamY: (rng() - 0.5) * 0.4 * height * actualDpr,
      heading: rng() * Math.PI * 2,
      roamClock: 40 * rng(),
      roamIdle: 0,
      roamDelay: 0,
      phases: [0, 1, 2, 3].map(() => rng() * Math.PI * 2),
      energy: 0,
      presence: 0,
      lastPaint: -99,
      nextPulse: 0,
      pulses: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, -99, 0)),
      lastPresses: 0,
      timeSinceLastSpark: 0,
      nextSparkInterval: 0.8 + rng() * 1.5,
    };

    // Interaction listeners
    const onPointerMove = (e) => {
      rect = container.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.inside = true;
    };

    const onPointerDown = (e) => {
      rect = container.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.inside = true;
      pointer.pressX = pointer.x;
      pointer.pressY = pointer.y;
      pointer.presses += 1;
    };

    const onPointerLeave = () => {
      pointer.inside = false;
    };

    if (interactive) {
      container.addEventListener('pointermove', onPointerMove, { passive: true });
      container.addEventListener('pointerdown', onPointerDown, { passive: true });
      container.addEventListener('pointerleave', onPointerLeave, { passive: true });
      container.addEventListener('pointercancel', onPointerLeave, { passive: true });
    }

    const updateSize = (newW, newH) => {
      if (!renderer || !canvas || newW <= 0 || newH <= 0) return;
      width = newW;
      height = newH;
      renderer.setPixelRatio(actualDpr);
      renderer.setSize(newW, newH, false);
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      const fw = Math.round(newW * actualDpr);
      const fh = Math.round(newH * actualDpr);

      vaultUniforms.uResolution.value.set(fw, fh);
      velUniforms.uCanvas.value.set(fw, fh);
      lightUniforms.uCanvas.value.set(fw, fh);

      const cell = 72 * clamp(cellSize, 0.15, 4) * actualDpr;
      const dscale = clamp(Math.round(cell / 20), 2, 8);
      const nextSimW = Math.max(16, Math.ceil(fw / dscale));
      const nextSimH = Math.max(16, Math.ceil(fh / dscale));

      if (nextSimW !== simW || nextSimH !== simH) {
        simW = nextSimW;
        simH = nextSimH;
        velTargets[0].setSize(simW, simH);
        velTargets[1].setSize(simW, simH);
        lightTargets[0].setSize(simW, simH);
        lightTargets[1].setSize(simW, simH);
        velUniforms.uSize.value.set(simW, simH);
        lightUniforms.uSize.value.set(simW, simH);
      }
    };

    updateSize(width, height);

    let animId = null;
    let lastTime = performance.now();
    let isVisible = true;
    const io = new IntersectionObserver((entries) => {
      const wasVisible = isVisible;
      isVisible = entries.some((e) => e.isIntersecting);
      if (isVisible && !wasVisible && !animId) {
        lastTime = performance.now();
        animId = requestAnimationFrame(animate);
      }
    });
    io.observe(container);

    const animate = (now) => {
      animId = 0;
      if (!isVisible || document.hidden) return;

      const elapsed = (now - lastTime) / 1000;
      if (elapsed < 0.018) {
        animId = requestAnimationFrame(animate);
        return;
      }
      lastTime = now;

      const dt = Math.min(elapsed, 0.1);

      const spd = clamp(speed, 0, 4);
      if (!paused) {
        state.time += dt * spd;
      }
      state.clock += dt;

      const fW = width * actualDpr;
      const fH = height * actualDpr;
      const curCell = 72 * clamp(cellSize, 0.15, 4) * actualDpr;

      const isInside = interactive && pointer.inside;
      const isAuto = autoplay && !isInside;
      const targetPx = (pointer.x - width / 2) * actualDpr;
      const targetPy = (height / 2 - pointer.y) * actualDpr;

      // Autonomous roaming
      if (isAuto && !state.roaming) {
        if (state.hasBrush) {
          state.roamX = clamp(state.brushX + 0.2 * state.brushVX, -0.5 * fW + curCell, 0.5 * fW - curCell);
          state.roamY = clamp(state.brushY + 0.2 * state.brushVY, -0.5 * fH + curCell, 0.5 * fH - curCell);
          if (Math.hypot(state.brushVX, state.brushVY) > 0.2 * curCell) {
            state.heading = Math.atan2(state.brushVY, state.brushVX);
          }
          state.roamDelay = 0.8;
        } else {
          state.brushX = state.roamX;
          state.brushY = state.roamY;
          state.brushVX = 0;
          state.brushVY = 0;
          state.hasBrush = true;
          state.roamDelay = 0;
        }
        state.roamIdle = 0;
      }
      state.roaming = isAuto;

      let roamSpeed = 0;
      if (isAuto && !paused) {
        state.roamIdle += dt;
        const ramp = clamp((state.roamIdle - state.roamDelay) / 1.6, 0, 1);
        const smoothRamp = ramp * ramp * (3 - 2 * ramp);
        state.roamClock += dt * spd * smoothRamp;
        const rClock = state.roamClock;
        const [p0, p1, p2, p3] = state.phases;
        let turn =
          0.45 * Math.sin(0.43 * rClock + p0) +
          0.3 * Math.sin(0.27 * rClock + p1) +
          0.18 * Math.sin(0.71 * rClock + p2);
        const limX = Math.max(0.5 * fW - 1.5 * curCell, curCell);
        const limY = Math.max(0.5 * fH - 1.2 * curCell, curCell);
        const distBound = Math.hypot(state.roamX / limX, state.roamY / limY) - 0.7;
        if (distBound > 0) {
          const steer = Math.atan2(-state.roamY, -state.roamX);
          turn += Math.atan2(Math.sin(steer - state.heading), Math.cos(steer - state.heading)) * Math.min(6 * distBound, 3);
        }
        state.heading += turn * dt * spd * smoothRamp;
        roamSpeed = 1.1 * curCell * (0.8 + 0.2 * Math.sin(0.19 * rClock + p3)) * spd * smoothRamp;
        state.roamX += Math.cos(state.heading) * roamSpeed * dt;
        state.roamY += Math.sin(state.heading) * roamSpeed * dt;
      }

      // Pointer tracking
      if (isInside && (!state.hasBrush || (!state.tracking && state.presence < 0.05))) {
        state.brushX = targetPx;
        state.brushY = targetPy;
        state.brushVX = 0;
        state.brushVY = 0;
        state.hasBrush = true;
      }
      if (isInside && !state.tracking) {
        state.pointerX = targetPx;
        state.pointerY = targetPy;
        state.pointerVX = 0;
        state.pointerVY = 0;
      }
      state.tracking = isInside;

      if (isInside && dt > 0) {
        const pRate = 1 - Math.exp(-dt / 0.06);
        state.pointerVX += ((targetPx - state.pointerX) / dt - state.pointerVX) * pRate;
        state.pointerVY += ((targetPy - state.pointerY) / dt - state.pointerVY) * pRate;
        state.pointerX = targetPx;
        state.pointerY = targetPy;
      } else {
        state.pointerVX = 0;
        state.pointerVY = 0;
      }

      const activeTarget = isInside || isAuto;
      const destX = isInside ? targetPx : state.roamX;
      const destY = isInside ? targetPy : state.roamY;
      const prevBrushX = state.brushX;
      const prevBrushY = state.brushY;

      if (state.hasBrush && dt > 0) {
        const kSpring = 10 * clamp(follow, 0.2, 4);
        const dDamper = 1.24 * kSpring;
        const subSteps = Math.max(4, Math.ceil(dt / 0.008));
        const subDt = dt / subSteps;
        for (let i = 0; i < subSteps; i++) {
          if (activeTarget) {
            state.brushVX += ((destX - state.brushX) * kSpring * kSpring - state.brushVX * dDamper) * subDt;
            state.brushVY += ((destY - state.brushY) * kSpring * kSpring - state.brushVY * dDamper) * subDt;
          } else {
            const decay = Math.exp(-6 * subDt);
            state.brushVX *= decay;
            state.brushVY *= decay;
          }
          state.brushX += state.brushVX * subDt;
          state.brushY += state.brushVY * subDt;
        }
      }

      const pointerSpeed = Math.hypot(state.pointerVX, state.pointerVY) / actualDpr;
      const autoSpd = roamSpeed / actualDpr;
      const targetIntensity = isInside
        ? 1 - Math.exp(-pointerSpeed / 120)
        : isAuto
        ? 0.85 * (1 - Math.exp(-autoSpd / 120))
        : 0;

      const rate = targetIntensity > state.energy ? 0.08 : 0.35;
      state.energy += (targetIntensity - state.energy) * (1 - Math.exp(-dt / rate));
      state.presence += ((activeTarget ? 1 : 0) - state.presence) * (1 - Math.exp(-dt / 0.3));

      // Automatic sparks to attract user attention even when not touching
      if (autoSparks && !paused) {
        state.timeSinceLastSpark += dt;
        if (state.timeSinceLastSpark >= state.nextSparkInterval) {
          state.timeSinceLastSpark = 0;
          state.nextSparkInterval = Math.max(1.4, sparkInterval * (0.65 + rng() * 0.7));
          const slot = state.nextPulse;
          state.nextPulse = (slot + 1) % 4;
          const sparkX = state.hasBrush ? state.brushX : (rng() - 0.5) * 0.7 * fW;
          const sparkY = state.hasBrush ? state.brushY : (rng() - 0.5) * 0.7 * fH;
          state.pulses[slot].set(sparkX, sparkY, state.clock, 1);

          // Energize roaming light so vivid colored ripples burst across the lattice
          state.energy = Math.min(state.energy + 0.65, 1.3);
          state.presence = Math.min(state.presence + 0.5, 1.0);
        }
      }

      // Click pulses
      if (pointer.presses !== state.lastPresses && clickPulses && interactive) {
        state.lastPresses = pointer.presses;
        const slot = state.nextPulse;
        state.nextPulse = (slot + 1) % 4;
        state.pulses[slot].set(
          (pointer.pressX - width / 2) * actualDpr,
          (height / 2 - pointer.pressY) * actualDpr,
          state.clock,
          1
        );
        state.energy = Math.min(state.energy + 0.8, 1.4);
      }

      // Simulation render passes
      const curFlip = flip;
      const nextFlip = 1 - curFlip;
      const radiusPx = 2 * clamp(trailWidth, 0.2, 4) * curCell;
      const speedNorm = 1 - Math.exp(-Math.max(pointerSpeed, autoSpd) / 600);
      const tLen = 0.26 * clamp(trailLength, 0.1, 8);
      const brushEnergy = state.hasBrush ? state.energy : 0;

      // Update velocity pass
      velUniforms.uCanvas.value.set(fW, fH);
      velUniforms.uSize.value.set(simW, simH);
      velUniforms.uFrom.value.set(prevBrushX, prevBrushY);
      velUniforms.uTo.value.set(state.brushX, state.brushY);
      velUniforms.uDt.value = dt;
      velUniforms.uRadius.value = radiusPx;
      velUniforms.uVelocity.value = velTargets[curFlip].texture;
      velUniforms.uDecay.value = Math.exp(-dt / 0.25);
      velUniforms.uBlend.value = (1 - Math.exp(-dt / 0.05)) * brushEnergy;
      velUniforms.uBrushVelocity.value.set(state.brushVX, state.brushVY);

      simQuad.material = velMat;
      renderer.setRenderTarget(velTargets[nextFlip]);
      renderer.render(simScene, orthoCam);

      // Update light pass
      lightUniforms.uCanvas.value.set(fW, fH);
      lightUniforms.uSize.value.set(simW, simH);
      lightUniforms.uFrom.value.set(prevBrushX, prevBrushY);
      lightUniforms.uTo.value.set(state.brushX, state.brushY);
      lightUniforms.uDt.value = dt;
      lightUniforms.uRadius.value = radiusPx * (0.35 + 0.25 * speedNorm);
      lightUniforms.uLight.value = lightTargets[curFlip].texture;
      lightUniforms.uVelocity.value = velTargets[nextFlip].texture;
      lightUniforms.uDrift.value = 0.8 * clamp(flow, 0, 1);
      lightUniforms.uDecay.value.set(Math.exp(-dt / tLen), Math.exp(-dt / (0.5 * tLen)));
      lightUniforms.uEnergy.value = 0.7 * brushEnergy;

      simQuad.material = lightMat;
      renderer.setRenderTarget(lightTargets[nextFlip]);
      renderer.render(simScene, orthoCam);

      renderer.setRenderTarget(null);
      flip = nextFlip;

      // Screen render pass
      for (let i = 0; i < 4; i++) {
        vaultUniforms.uPulses.value[i].copy(state.pulses[i]);
      }
      vaultUniforms.uLight.value = lightTargets[nextFlip].texture;
      vaultUniforms.uLens.value.set(
        state.brushX,
        state.brushY,
        state.hasBrush ? state.presence * (0.45 + 0.55 * state.energy) : 0
      );
      vaultUniforms.uLensRadius.value = radiusPx;
      vaultUniforms.uResolution.value.set(fW, fH);
      vaultUniforms.uCell.value = curCell;
      vaultUniforms.uTime.value = state.time;
      vaultUniforms.uClock.value = state.clock;
      vaultUniforms.uPulseSpeed.value = 5.5 * clamp(pulseSpeed, 0.1, 5) * curCell;

      renderer.render(finalScene, orthoCam);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    // Resize observer
    let resizeTimer = null;
    const handleResize = () => {
      if (!container) return;
      rect = container.getBoundingClientRect();
      const newW = Math.max(rect.width, 10);
      const newH = Math.max(rect.height, 10);
      if (newW !== width || newH !== height) {
        updateSize(newW, newH);
      }
    };

    const ro = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 60);
    });
    ro.observe(container);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      ro.disconnect();
      io.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      if (interactive) {
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointerleave', onPointerLeave);
        container.removeEventListener('pointercancel', onPointerLeave);
      }
      velTargets.forEach((t) => t.dispose());
      lightTargets.forEach((t) => t.dispose());
      velMat.dispose();
      lightMat.dispose();
      vaultMat.dispose();
      quadGeom.dispose();
      renderer.dispose();
    };
  }, [
    colors[0],
    colors[1],
    backgroundColor,
    cellSize,
    lineWidth,
    litWidth,
    lattice,
    glow,
    glowRadius,
    core,
    vignette,
    grain,
    trailLength,
    trailWidth,
    follow,
    flow,
    autoplay,
    shimmer,
    speed,
    interactive,
    clickPulses,
    pulseSpeed,
    autoSparks,
    sparkInterval,
    seed,
    paused,
    dpr,
  ]);

  const isTrans = isColorTransparent(backgroundColor);

  return (
    <div
      ref={containerRef}
      className={`relative isolate overflow-hidden ${className}`}
      style={{ backgroundColor: isTrans ? undefined : backgroundColor, ...style }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none block" />
      {children && <div className="relative z-10 h-full w-full pointer-events-auto">{children}</div>}
    </div>
  );
}
