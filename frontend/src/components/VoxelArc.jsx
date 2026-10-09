import React, { useRef, useEffect, useImperativeHandle, forwardRef, useSyncExternalStore } from 'react';
import * as THREE from 'three';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const numOr = (v, fallback) => (Number.isFinite(v) ? v : fallback);

const tempColor = new THREE.Color();
const parseColor = (str) => {
  if (!str) return null;
  const s = str.trim().toLowerCase();
  if (!s || s === 'transparent' || s === 'none' || s === 'auto') return null;
  try {
    tempColor.setStyle(s, THREE.SRGBColorSpace);
    return [tempColor.r, tempColor.g, tempColor.b];
  } catch {
    return null;
  }
};

const sRgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const linearToSRgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

const rgbToOklab = ([r, g, b]) => {
  const lr = sRgbToLinear(r);
  const lg = sRgbToLinear(g);
  const lb = sRgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const oklabToRgb = ([l, a, b]) => {
  const l_ = Math.pow(l + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m_ = Math.pow(l - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s_ = Math.pow(l - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    clamp(linearToSRgb(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_), 0, 1),
    clamp(linearToSRgb(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_), 0, 1),
    clamp(linearToSRgb(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_), 0, 1),
  ];
};

const subscribeReducedMotion = (cb) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

const getReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Shaders
const QUAD_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const VOXEL_VERT = `
attribute vec3 iVoxel;
uniform float uTime;
uniform float uAmp;
uniform float uWaveScale;
uniform float uTurb;
uniform float uCurveX;
uniform float uCurveZ;
uniform float uCell;
uniform float uFill;
uniform float uTilt;
uniform float uFocusDepth;
uniform float uAperture;
uniform float uFocalPx;
uniform vec2 uViewport;
uniform float uNear;
uniform float uFar;
uniform float uSpread;
uniform float uIntro;
uniform float uGlow;
uniform float uBright;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uInk;
uniform sampler2D uRipple;
uniform vec4 uRippleRect;
uniform vec2 uRippleTexel;
uniform float uRippleOn;
varying vec2 vQuad;
varying vec2 vHalf;
varying vec3 vColor;
varying float vAlpha;

const float TAU = 6.28318530718;

vec3 component(vec2 p, vec2 dir, float wavelength, float amp, float rate, float phase) {
  float k = TAU / wavelength;
  vec2 d = normalize(dir);
  float theta = k * dot(d, p) + rate * uTime + phase;
  return vec3(amp * sin(theta), amp * k * cos(theta) * d);
}

vec3 surface(vec2 p) {
  float L = uWaveScale;
  vec3 h = component(p, vec2(0.14, 1.0), 3.3 * L, 0.55, 1.0, 0.0);
  h += component(p, vec2(-0.48, 1.0), 2.15 * L, 0.32, 1.22, 1.9);
  h += component(p, vec2(0.82, 0.62), 1.45 * L, 0.2, 1.5, 4.2);
  h += component(p, vec2(-0.86, 0.42), 0.95 * L, 0.13 * (0.35 + uTurb), 1.95, 2.6);
  h += component(p, vec2(0.33, -0.9), 0.64 * L, 0.09 * uTurb, 2.6, 5.3);
  h += component(p, vec2(-0.2, 0.95), 0.41 * L, 0.05 * uTurb, 3.4, 0.7);
  return h * uAmp;
}

float rippleTap(vec2 st) {
  return texture2D(uRipple, (st + 0.5) * uRippleTexel).r;
}

float rippleSample(vec2 uv) {
  vec2 st = uv / uRippleTexel - 0.5;
  vec2 i = floor(st);
  vec2 f = st - i;
  float a = rippleTap(i);
  float b = rippleTap(i + vec2(1.0, 0.0));
  float c = rippleTap(i + vec2(0.0, 1.0));
  float d = rippleTap(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 ripple(vec2 p) {
  if (uRippleOn < 0.5) return vec3(0.0);
  vec2 span = uRippleRect.zw - uRippleRect.xy;
  vec2 uv = (p - uRippleRect.xy) / span;
  if (uv.x <= 0.01 || uv.y <= 0.01 || uv.x >= 0.99 || uv.y >= 0.99) return vec3(0.0);
  float h0 = rippleSample(uv);
  float hx = rippleSample(uv + vec2(uRippleTexel.x, 0.0));
  float hz = rippleSample(uv + vec2(0.0, uRippleTexel.y));
  vec2 cell = span * uRippleTexel;
  return vec3(h0, (hx - h0) / cell.x, (hz - h0) / cell.y);
}

void main() {
  vec2 p = iVoxel.xy;
  vec3 w = surface(p);
  vec3 r = ripple(p);
  float h = w.x + r.x;
  vec2 g = w.yz + r.yz;
  float drop = p.x * p.x * uCurveX + p.y * p.y * uCurveZ;
  vec3 world = vec3(p.x, h - drop, -p.y);
  vec4 viewPos = modelViewMatrix * vec4(world, 1.0);
  float depth = max(-viewPos.z, 0.05);
  vec4 clip = projectionMatrix * viewPos;

  vec3 normal = normalize(vec3(-g.x + 2.0 * p.x * uCurveX, 1.0, g.y - 2.0 * p.y * uCurveZ));
  vec3 toCamera = normalize(cameraPosition - world);
  float facing = clamp(dot(normal, toCamera), 0.06, 1.0);
  float size = uCell * uFill * uFocalPx / depth;
  vec2 core = vec2(size, size * mix(1.0, facing, uTilt));
  vec2 extent = core * 0.5 + 1.2;
  vec2 corner = position.xy * extent;
  gl_Position = clip + vec4(corner / uViewport * 2.0 * clip.w, 0.0, 0.0);
  vQuad = corner;
  vHalf = core * 0.5;

  float t = clamp((p.y - uNear) / max(uFar - uNear, 0.001), 0.0, 1.0);
  float side = abs(p.x) / max(p.y * uSpread, 0.001);
  float edge = (1.0 - smoothstep(0.95, 1.0, t)) * (1.0 - smoothstep(0.75, 1.0, side));
  float crest = smoothstep(-0.25, 1.05, h / max(uAmp * 0.62, 0.001));
  float lateral = 1.0 - 0.5 * side * side;
  float limb = exp(-(1.0 - t) * 6.0) * lateral;
  float depthLight = mix(0.5, 1.0, smoothstep(0.0, 0.55, t));
  float front = uIntro * 1.3 - (1.0 - t);
  float reveal = smoothstep(0.0, 0.22, front);
  float sweep = exp(-front * front / 0.004) * step(uIntro, 0.999) * 0.9;
  float energy = (0.12 + 0.95 * pow(crest, 2.0)) * depthLight * lateral + uGlow * limb * (0.35 + 0.95 * crest);
  float light = (energy * reveal + sweep * (0.4 + crest)) * edge * uBright;
  float tone = smoothstep(0.04, 0.92, light);
  vec3 tint = mix(uColorA, uColorB, tone);
  if (uInk > 0.5) {
    vColor = mix(uColorB, uColorA, smoothstep(0.05, 0.7, energy));
    vAlpha = clamp((0.35 + energy * 2.2) * uBright, 0.0, 1.0) * edge * max(reveal, sweep) * (0.55 + 0.45 * depthLight);
  } else {
    vColor = tint * light + vec3(1.0) * max(light - 0.85, 0.0) * 0.4;
    vAlpha = 1.0;
  }
}
`;

const VOXEL_FRAG = `
uniform float uRound;
uniform float uInk;
varying vec2 vQuad;
varying vec2 vHalf;
varying vec3 vColor;
varying float vAlpha;

void main() {
  // Crisp square voxel signed distance field
  float radius = uRound * min(vHalf.x, vHalf.y);
  vec2 q = abs(vQuad) - vHalf + radius;
  float dist = (radius > 0.001)
    ? length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - radius
    : max(abs(vQuad.x) - vHalf.x, abs(vQuad.y) - vHalf.y);

  // Exact 1px sub-pixel anti-aliasing: zero blur, razor-sharp clarity
  float coverage = clamp(0.5 - dist, 0.0, 1.0);
  if (coverage < 0.01) discard;

  if (uInk > 0.5) {
    float a = coverage * vAlpha;
    gl_FragColor = vec4(vColor * a, a);
  } else {
    gl_FragColor = vec4(vColor * coverage, 1.0);
  }
}
`;

const BLOOM_DOWN_FRAG = `
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;

vec3 tap(vec2 d) {
  vec3 c = texture2D(uSource, vUv + d * uTexel).rgb;
  float peak = max(c.r, max(c.g, c.b));
  return c * (max(peak - uThreshold, 0.0) / max(peak, 0.0001));
}

void main() {
  vec3 a = tap(vec2(-2.0, 2.0));
  vec3 b = tap(vec2(0.0, 2.0));
  vec3 c = tap(vec2(2.0, 2.0));
  vec3 d = tap(vec2(-2.0, 0.0));
  vec3 e = tap(vec2(0.0, 0.0));
  vec3 f = tap(vec2(2.0, 0.0));
  vec3 g = tap(vec2(-2.0, -2.0));
  vec3 h = tap(vec2(0.0, -2.0));
  vec3 i = tap(vec2(2.0, -2.0));
  vec3 j = tap(vec2(-1.0, 1.0));
  vec3 k = tap(vec2(1.0, 1.0));
  vec3 l = tap(vec2(-1.0, -1.0));
  vec3 m = tap(vec2(1.0, -1.0));
  vec3 color = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  gl_FragColor = vec4(color, 1.0);
}
`;

const BLOOM_UP_FRAG = `
uniform sampler2D uSource;
uniform vec2 uTexel;
varying vec2 vUv;

vec3 tap(vec2 d) { return texture2D(uSource, vUv + d * uTexel).rgb; }

void main() {
  vec3 color = tap(vec2(0.0)) * 4.0
    + (tap(vec2(-1.0, 0.0)) + tap(vec2(1.0, 0.0)) + tap(vec2(0.0, -1.0)) + tap(vec2(0.0, 1.0))) * 2.0
    + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0));
  gl_FragColor = vec4(color / 16.0, 1.0);
}
`;

const COMPOSITE_FRAG = `
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform vec3 uHazeColor;
uniform vec3 uArc;
uniform float uHaze;
uniform float uBloomStrength;
uniform float uGrain;
uniform float uTime;
uniform float uInk;
uniform float uIntro;
varying vec2 vUv;

vec3 neutral(vec3 color) {
  const float start = 0.76;
  const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < start) return color;
  const float d = 1.0 - start;
  float next = 1.0 - d * d / (peak + d - start);
  color *= next / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - next) + 1.0);
  return mix(color, vec3(next), g);
}

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  float dx = vUv.x - 0.5;
  float arc = uArc.x - uArc.y * dx * dx;
  float offset = vUv.y - arc;
  float spread = 1.0 - clamp(dx * dx * uArc.z, 0.0, 0.85);
  float profile = offset > 0.0
    ? exp(-offset / 0.045) + exp(-offset / 0.15) * 0.2
    : 1.2 * exp(offset / 0.03);
  float haze = profile * spread * uHaze * uIntro;
  vec4 scene = texture2D(uScene, vUv);
  float n = hash(gl_FragCoord.xy + fract(uTime * 13.0) * 911.0) - 0.5;
  if (uInk > 0.5) {
    float cover = clamp(scene.a, 0.0, 1.0);
    vec3 ink = scene.rgb / max(scene.a, 0.0001);
    vec3 color = mix(uBackground, ink, cover * 0.94);
    color = mix(color, uHazeColor, clamp(haze * 0.16, 0.0, 0.4));
    float mask = smoothstep(0.0, 0.05, cover + haze * 0.2);
    color += n * uGrain * 0.06 * mask;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    return;
  }
  vec3 emission = scene.rgb + texture2D(uBloom, vUv).rgb * uBloomStrength + uHazeColor * haze;
  vec3 light = neutral(max(emission, 0.0));
  light = pow(light, vec3(1.0 / 2.2));
  vec3 color = 1.0 - (1.0 - uBackground) * (1.0 - light);
  float l = max(light.r, max(light.g, light.b));
  float mask = smoothstep(0.0, 0.04, l);
  color += n * uGrain * 0.1 * mask;
  color += (hash(gl_FragCoord.xy * 1.7) - 0.5) / 255.0 * mask;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

const VoxelArc = forwardRef(function VoxelArc(
  {
    color = '#5227ff',
    accentColor = '#a78bfa',
    backgroundColor = 'transparent',
    density = 1,
    voxelSize = 0.65,
    roundness = 0,
    tilt = 1,
    horizon = 0.56,
    curvature = 0.5,
    waveHeight = 1,
    waveLength = 1,
    speed = 0.5,
    turbulence = 0.4,
    brightness = 2.0,
    glow = 1.4,
    haze = 0.2,
    bloom = 0.15,
    focus = 0.25,
    aperture = 0,
    grain = 0,
    interactive = true,
    ripples = 1,
    intro = true,
    paused = false,
    dpr = 2,
    children,
    className = '',
    style = {},
  },
  ref
) {
  const containerRef = useRef(null);
  const canvasHostRef = useRef(null);
  const engineRef = useRef(null);

  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);

  const propsSnapshot = {
    color,
    accentColor,
    backgroundColor,
    density,
    voxelSize,
    roundness,
    tilt,
    horizon,
    curvature,
    waveHeight,
    waveLength,
    speed,
    turbulence,
    brightness,
    glow,
    haze,
    bloom,
    focus,
    aperture,
    grain,
    interactive,
    ripples,
    intro,
    paused,
    dpr,
    reduced: reducedMotion,
  };
  const propsRef = useRef(propsSnapshot);
  propsRef.current = propsSnapshot;

  useEffect(() => {
    engineRef.current?.sync();
  });

  useEffect(() => {
    const container = containerRef.current;
    const host = canvasHostRef.current;
    if (!container || !host) return;

    const doc = container.ownerDocument;
    const win = doc.defaultView || window;
    const canvas = doc.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    host.appendChild(canvas);
    renderer.autoClear = false;

    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 200);
    camera.position.set(0, 3, 0);

    const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    const quadGeom = new THREE.PlaneGeometry(2, 2);
    const quadScene = new THREE.Scene();
    const quadMesh = new THREE.Mesh(quadGeom);
    quadMesh.frustumCulled = false;
    quadScene.add(quadMesh);

    const voxelGeom = new THREE.InstancedBufferGeometry();
    voxelGeom.index = quadGeom.index;
    voxelGeom.setAttribute('position', quadGeom.getAttribute('position'));

    let voxelPosData = new Float32Array(3);
    let voxelAttr = new THREE.InstancedBufferAttribute(voxelPosData, 3);
    voxelGeom.setAttribute('iVoxel', voxelAttr);
    voxelGeom.instanceCount = 0;

    // Ripple 2D grid
    const RIPPLE_W = 192;
    const RIPPLE_H = 128;
    const RIPPLE_COUNT = RIPPLE_W * RIPPLE_H;
    let ripCurrent = new Float32Array(RIPPLE_COUNT);
    let ripPrev = new Float32Array(RIPPLE_COUNT);
    let ripNext = new Float32Array(RIPPLE_COUNT);

    const ripTexture = new THREE.DataTexture(
      ripCurrent,
      RIPPLE_W,
      RIPPLE_H,
      THREE.RedFormat,
      THREE.FloatType
    );
    ripTexture.minFilter = THREE.LinearFilter;
    ripTexture.magFilter = THREE.LinearFilter;
    ripTexture.needsUpdate = true;

    const colorA_vec = new THREE.Vector3(0.2, 0.1, 1);
    const colorB_vec = new THREE.Vector3(0.6, 0.5, 1);
    const bgCol_vec = new THREE.Vector3(0.04, 0.04, 0.04);
    const hazeCol_vec = new THREE.Vector3(0.3, 0.2, 0.9);
    const rippleRect = new THREE.Vector4(-8, 5, 8, 18);

    const voxelMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: 0.18 },
        uWaveScale: { value: 1 },
        uTurb: { value: 0.4 },
        uCurveX: { value: 0.006 },
        uCurveZ: { value: 0.0015 },
        uCell: { value: 0.06 },
        uFill: { value: 0.55 },
        uTilt: { value: 0.6 },
        uFocusDepth: { value: 8 },
        uAperture: { value: 0.1 },
        uFocalPx: { value: 1000 },
        uViewport: { value: new THREE.Vector2(1, 1) },
        uNear: { value: 5 },
        uFar: { value: 18 },
        uSpread: { value: 0.5 },
        uIntro: { value: 1 },
        uGlow: { value: 1 },
        uBright: { value: 1 },
        uColorA: { value: colorA_vec },
        uColorB: { value: colorB_vec },
        uInk: { value: 0 },
        uRound: { value: 0.2 },
        uRipple: { value: ripTexture },
        uRippleRect: { value: rippleRect },
        uRippleTexel: { value: new THREE.Vector2(1 / RIPPLE_W, 1 / RIPPLE_H) },
        uRippleOn: { value: 0 },
      },
      vertexShader: VOXEL_VERT,
      fragmentShader: VOXEL_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });

    const voxelMesh = new THREE.Mesh(voxelGeom, voxelMaterial);
    voxelMesh.frustumCulled = false;
    const voxelScene = new THREE.Scene();
    voxelScene.add(voxelMesh);

    const makeRenderTarget = (w = 1, h = 1) =>
      new THREE.WebGLRenderTarget(w, h, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        depthBuffer: false,
        stencilBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
      });

    const sceneTarget = makeRenderTarget();
    const bloomTargets = Array.from({ length: 3 }, () => makeRenderTarget());

    const bloomPrefilterMat = new THREE.ShaderMaterial({
      uniforms: {
        uSource: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uThreshold: { value: 0 },
      },
      vertexShader: QUAD_VERT,
      fragmentShader: BLOOM_DOWN_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    const bloomBlurMat = new THREE.ShaderMaterial({
      uniforms: {
        uSource: { value: null },
        uTexel: { value: new THREE.Vector2() },
      },
      vertexShader: QUAD_VERT,
      fragmentShader: BLOOM_UP_FRAG,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        uScene: { value: sceneTarget.texture },
        uBloom: { value: bloomTargets[0].texture },
        uBackground: { value: bgCol_vec },
        uHazeColor: { value: hazeCol_vec },
        uArc: { value: new THREE.Vector3(0.44, 0.1, 1) },
        uHaze: { value: 0.8 },
        uBloomStrength: { value: 0.6 },
        uGrain: { value: 0.25 },
        uTime: { value: 0 },
        uInk: { value: 0 },
        uIntro: { value: 1 },
      },
      vertexShader: QUAD_VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    let cssW = 0;
    let cssH = 0;
    let activeDpr = 1;
    let hasSize = false;
    let cachedColorKey = '';
    let cachedGridKey = '';
    let isInkMode = false;
    let bgRgb = [0.04, 0.04, 0.04];
    let simTime = 0;
    let introStartTime = -1;
    let introDone = false;
    let rippleActive = false;
    let rippleAccumTime = 0;
    let rippleIdleTime = 0;
    let nearDist = 5;
    let spreadAngle = 0.5;
    let rafId = 0;
    let lastPerfTime = 0;
    let isVisible = true;
    let isDestroyed = false;
    let lastPointer = null;
    let pendingRipples = [];

    const updateColors = () => {
      const p = propsRef.current;
      const parsedBg = parseColor(p.backgroundColor) || [0.04, 0.04, 0.04];
      bgRgb = parsedBg;
      const key = `${bgRgb.join(',')}|${p.color}|${p.accentColor}`;
      if (key === cachedColorKey) return;
      cachedColorKey = key;

      isInkMode = 0.2126 * bgRgb[0] + 0.7152 * bgRgb[1] + 0.0722 * bgRgb[2] > 0.55;
      bgCol_vec.set(bgRgb[0], bgRgb[1], bgRgb[2]);

      const oklabA = rgbToOklab(parseColor(p.color) || [0.32, 0.15, 1]);
      const oklabB = rgbToOklab(parseColor(p.accentColor) || [0.69, 0.62, 0.94]);

      const chroma = (c) => Math.hypot(c[1], c[2]);
      const adjustInk = (primary, secondary, maxLum) => {
        if (!isInkMode) return primary;
        let c = primary;
        if (chroma(primary) < 0.03 && chroma(secondary) >= 0.03) c = secondary;
        const ch = chroma(c);
        if (ch < 0.03) return [0.3, 0, 0];
        const boost = Math.max(1, 0.14 / ch);
        return [clamp(c[0], 0.32, maxLum), c[1] * boost, c[2] * boost];
      };

      const finalA = oklabToRgb(adjustInk(oklabA, oklabB, 0.5));
      const finalB = oklabToRgb(adjustInk(oklabB, oklabA, 0.6));

      if (isInkMode) {
        colorA_vec.set(finalA[0], finalA[1], finalA[2]);
        colorB_vec.set(finalB[0], finalB[1], finalB[2]);
        hazeCol_vec.set(finalB[0], finalB[1], finalB[2]);
      } else {
        colorA_vec.set(sRgbToLinear(finalA[0]), sRgbToLinear(finalA[1]), sRgbToLinear(finalA[2]));
        colorB_vec.set(sRgbToLinear(finalB[0]), sRgbToLinear(finalB[1]), sRgbToLinear(finalB[2]));
        hazeCol_vec.set(
          (0.55 * colorA_vec.x + 0.45 * colorB_vec.x) * 0.16,
          (0.55 * colorA_vec.y + 0.45 * colorB_vec.y) * 0.16,
          (0.55 * colorA_vec.z + 0.45 * colorB_vec.z) * 0.16
        );
      }

      voxelMaterial.uniforms.uInk.value = isInkMode ? 1 : 0;
      compositeMat.uniforms.uInk.value = isInkMode ? 1 : 0;
    };

    const updateSize = () => {
      const p = propsRef.current;
      const w = Math.round(container.clientWidth);
      const h = Math.round(container.clientHeight);
      if (w < 2 || h < 2) {
        hasSize = false;
        return false;
      }
      const dprVal = Math.min(win.devicePixelRatio || 1, clamp(numOr(p.dpr, 2.0), 0.5, 3.0));
      if (hasSize && w === cssW && h === cssH && dprVal === activeDpr) return false;

      hasSize = true;
      cssW = w;
      cssH = h;
      activeDpr = dprVal;

      renderer.setPixelRatio(activeDpr);
      renderer.setSize(cssW, cssH, false);

      const pw = Math.round(cssW * activeDpr);
      const ph = Math.round(cssH * activeDpr);
      sceneTarget.setSize(pw, ph);

      let bw = pw;
      let bh = ph;
      for (const t of bloomTargets) {
        bw = Math.max(1, Math.round(bw / 2));
        bh = Math.max(1, Math.round(bh / 2));
        t.setSize(bw, bh);
      }

      cachedGridKey = '';
      return true;
    };

    const raycastPlane = (clientX, clientY) => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
      const rayDir = new THREE.Vector3(ndcX, ndcY, 0.5)
        .unproject(camera)
        .sub(camera.position)
        .normalize();

      if (rayDir.y >= -1e-4) return null;
      const dist = -camera.position.y / rayDir.y;
      const hitX = camera.position.x + rayDir.x * dist;
      const hitZ = -(camera.position.z + rayDir.z * dist);

      if (hitZ < nearDist || hitZ > 18) return null;
      return { x: hitX, z: hitZ };
    };

    const applyRippleImpulse = (worldX, worldZ, amount, radius) => {
      const u = ((worldX - rippleRect.x) / (rippleRect.z - rippleRect.x)) * RIPPLE_W;
      const v = ((worldZ - rippleRect.y) / (rippleRect.w - rippleRect.y)) * RIPPLE_H;
      const r = Math.max(1, radius);
      const ext = Math.ceil(2.5 * r);
      const cu = Math.round(u);
      const cv = Math.round(v);

      for (let y = cv - ext; y <= cv + ext; y++) {
        if (y < 1 || y >= RIPPLE_H - 1) continue;
        for (let x = cu - ext; x <= cu + ext; x++) {
          if (x < 1 || x >= RIPPLE_W - 1) continue;
          const distSq = (x - u) * (x - u) + (y - v) * (y - v);
          const impulse = -amount * Math.exp(-(distSq / (r * r)));
          ripCurrent[RIPPLE_W * y + x] += impulse;
          ripPrev[RIPPLE_W * y + x] += 0.6 * impulse;
        }
      }
      rippleActive = true;
      rippleIdleTime = 0;
      voxelMaterial.uniforms.uRippleOn.value = 1;
    };

    const stepRipplePhysics = () => {
      let maxAbs = 0;
      for (let y = 1; y < RIPPLE_H - 1; y++) {
        const row = RIPPLE_W * y;
        for (let x = 1; x < RIPPLE_W - 1; x++) {
          const idx = row + x;
          const laplacian =
            ripCurrent[idx - 1] +
            ripCurrent[idx + 1] +
            ripCurrent[idx - RIPPLE_W] +
            ripCurrent[idx + RIPPLE_W] -
            4 * ripCurrent[idx];
          const val = (2 * ripCurrent[idx] - ripPrev[idx] + 0.1 * laplacian) * 0.9962;
          ripNext[idx] = val;
          const a = Math.abs(val);
          if (a > maxAbs) maxAbs = a;
        }
      }
      const tmp = ripPrev;
      ripPrev = ripCurrent;
      ripCurrent = ripNext;
      ripNext = tmp;
      return maxAbs;
    };

    const requestFrame = () => {
      if (isDestroyed || !isVisible || document.hidden || rafId) return;
      lastPerfTime = performance.now();
      rafId = requestAnimationFrame(animate);
    };

    const render = () => {
      if (!hasSize) return;
      const p = propsRef.current;
      updateColors();

      // Regenerate voxel mesh & camera perspective if dimensions or layout changed
      const aspect = cssW / cssH;
      const gridKey = [
        cssW,
        cssH,
        activeDpr,
        p.horizon,
        p.curvature,
        p.density,
        p.voxelSize,
        p.focus,
        p.aperture,
      ].join('|');

      if (gridKey !== cachedGridKey) {
        cachedGridKey = gridKey;

        const halfFovRad = THREE.MathUtils.degToRad(13);
        const tanHalfFov = Math.tan(halfFovRad);
        const spreadW = tanHalfFov * aspect;
        const curv = clamp(numOr(p.curvature, 0.5), 0, 1.5);
        const curveX = 0.034 * curv * Math.pow(1.8 / clamp(aspect, 1.05, 3), 2);
        const curveZ = 0.0012 * curv;
        const horizFrac = clamp(numOr(p.horizon, 0.56), 0.12, 0.92);
        const pitchAngle = clamp(
          Math.atan((3 + 324 * curveZ) / 18) + Math.atan((1 - 2 * horizFrac) * tanHalfFov),
          0.02,
          1.2
        );

        camera.aspect = aspect;
        camera.fov = 26;
        camera.rotation.set(-pitchAngle, 0, 0);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);

        const lookAngle = pitchAngle + halfFovRad;
        nearDist = clamp(
          lookAngle < Math.PI / 2 - 0.02 ? (3 / Math.tan(lookAngle)) * 0.86 : 0.5,
          0.4,
          16
        );
        spreadAngle = 1.12 * spreadW;

        const focalPx = (cssH * activeDpr * 0.5) / tanHalfFov;
        const projectDepth = (z) => z * Math.cos(pitchAngle) + 3 * Math.sin(pitchAngle);
        const spanAtZ = (z) => projectDepth(z) * spreadAngle;
        const nearProj = (0.5 * cssH) / tanHalfFov / projectDepth(nearDist);

        let cellSpacing =
          clamp(0.0165 * cssH, 6, 13) / clamp(numOr(p.density, 1), 0.3, 3) / nearProj;

        const countVoxels = (step) => {
          let count = 0;
          for (let z = nearDist; z <= 18; z += step) {
            count += 2 * Math.floor(spanAtZ(z) / step) + 1;
          }
          return count;
        };

        let totalVoxels = countVoxels(cellSpacing);
        if (totalVoxels > 110000) {
          cellSpacing *= 1.02 * Math.sqrt(totalVoxels / 110000);
          totalVoxels = countVoxels(cellSpacing);
        }

        if (voxelPosData.length < 3 * totalVoxels) {
          voxelPosData = new Float32Array(3 * Math.ceil(1.1 * totalVoxels));
          voxelAttr = new THREE.InstancedBufferAttribute(voxelPosData, 3);
          voxelGeom.setAttribute('iVoxel', voxelAttr);
        }

        let k = 0;
        let rowIdx = 0;
        for (let z = nearDist; z <= 18 && k < totalVoxels; z += cellSpacing, rowIdx++) {
          const halfSpan = Math.floor(spanAtZ(z) / cellSpacing);
          for (let x = -halfSpan; x <= halfSpan && k < totalVoxels; x++) {
            voxelPosData[3 * k] = x * cellSpacing;
            voxelPosData[3 * k + 1] = z;
            voxelPosData[3 * k + 2] = (7919 * rowIdx + 104729 * x) % 997;
            k++;
          }
        }
        voxelAttr.needsUpdate = true;
        voxelGeom.instanceCount = k;

        const vUni = voxelMaterial.uniforms;
        vUni.uCell.value = cellSpacing;
        vUni.uFill.value = clamp(numOr(p.voxelSize, 0.55), 0.1, 1);
        vUni.uCurveX.value = curveX;
        vUni.uCurveZ.value = curveZ;
        vUni.uFocalPx.value = focalPx;
        vUni.uViewport.value.set(cssW * activeDpr, cssH * activeDpr);
        vUni.uNear.value = nearDist;
        vUni.uFar.value = 18;
        vUni.uSpread.value = spreadAngle;
        vUni.uFocusDepth.value = projectDepth(
          nearDist + (18 - nearDist) * clamp(numOr(p.focus, 0.25), 0, 1)
        );
        vUni.uAperture.value = 0.16 * clamp(numOr(p.aperture, 0.35), 0, 2);

        const farSpan = spanAtZ(18);
        rippleRect.set(-farSpan, nearDist, farSpan, 18);

        const projectPoint = (x, z) => {
          const pt = new THREE.Vector3(x, -(x * x * curveX + z * z * curveZ), -z).project(camera);
          return { x: 0.5 * pt.x + 0.5, y: 0.5 * pt.y + 0.5 };
        };

        const centerPt = projectPoint(0, 18);
        const sidePt = projectPoint(0.8 * farSpan, 18);
        const dx = sidePt.x - 0.5;
        const curveFactor = dx !== 0 ? (centerPt.y - sidePt.y) / (dx * dx) : 0;
        compositeMat.uniforms.uArc.value.set(centerPt.y, Math.max(0, curveFactor), 1.4);
      }

      const vUni = voxelMaterial.uniforms;
      vUni.uAmp.value = 0.17 * clamp(numOr(p.waveHeight, 1), 0, 3);
      vUni.uWaveScale.value = clamp(numOr(p.waveLength, 1), 0.25, 4);
      vUni.uTurb.value = clamp(numOr(p.turbulence, 0.4), 0, 1.5);
      vUni.uTilt.value = clamp(numOr(p.tilt, 1), 0, 1);
      vUni.uRound.value = clamp(numOr(p.roundness, 0.2), 0, 1);
      vUni.uGlow.value = clamp(numOr(p.glow, 1), 0, 3);
      vUni.uBright.value = clamp(numOr(p.brightness, 1), 0, 3);

      const cUni = compositeMat.uniforms;
      cUni.uHaze.value = clamp(numOr(p.haze, 0.7), 0, 3);
      cUni.uBloomStrength.value = clamp(numOr(p.bloom, 0.5), 0, 3);
      cUni.uGrain.value = clamp(numOr(p.grain, 0.25), 0, 1);

      voxelMaterial.blending = isInkMode ? THREE.CustomBlending : THREE.AdditiveBlending;
      if (isInkMode) {
        voxelMaterial.blendEquation = THREE.AddEquation;
        voxelMaterial.blendSrc = THREE.OneFactor;
        voxelMaterial.blendDst = THREE.OneFactor;
      }

      // Render 3D Voxels to scene target
      renderer.setRenderTarget(sceneTarget);
      renderer.setClearColor(0, 0);
      renderer.clear();
      renderer.render(voxelScene, camera);

      // Lightweight 2-stage bloom pass
      const bloomVal = isInkMode ? 0 : clamp(numOr(p.bloom, 0.5), 0, 3);
      if (bloomVal > 0.001) {
        let curSource = sceneTarget;
        for (let i = 0; i < bloomTargets.length; i++) {
          const t = bloomTargets[i];
          quadMesh.material = bloomPrefilterMat;
          bloomPrefilterMat.uniforms.uThreshold.value = curSource === sceneTarget ? 0.32 : 0;
          bloomPrefilterMat.uniforms.uSource.value = curSource.texture;
          bloomPrefilterMat.uniforms.uTexel.value.set(1 / curSource.width, 1 / curSource.height);
          renderer.setRenderTarget(t);
          renderer.render(quadScene, quadCam);
          curSource = t;
        }

        quadMesh.material = bloomBlurMat;
        for (let i = bloomTargets.length - 1; i > 0; i--) {
          bloomBlurMat.uniforms.uSource.value = bloomTargets[i].texture;
          bloomBlurMat.uniforms.uTexel.value.set(
            1 / bloomTargets[i].width,
            1 / bloomTargets[i].height
          );
          renderer.setRenderTarget(bloomTargets[i - 1]);
          renderer.render(quadScene, quadCam);
        }
      }

      cUni.uBloomStrength.value = bloomVal;
      cUni.uTime.value = simTime;
      quadMesh.material = compositeMat;
      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCam);
    };

    const animate = (now) => {
      rafId = 0;
      if (isDestroyed || !isVisible || document.hidden) return;

      // Throttle to ~55-60 FPS to prevent GPU/CPU saturation
      if (now - lastPerfTime < 18) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      const delta = Math.min(0.05, Math.max(0, (now - lastPerfTime) / 1000));
      lastPerfTime = now;

      const p = propsRef.current;
      const isRunning = !p.reduced && !p.paused;

      if (isRunning) {
        simTime += delta * clamp(numOr(p.speed, 0.5), 0, 4);
      }
      voxelMaterial.uniforms.uTime.value = simTime;

      // Intro lighting ramp
      if (!p.intro || p.reduced || introDone) {
        introDone = true;
        voxelMaterial.uniforms.uIntro.value = 1;
        compositeMat.uniforms.uIntro.value = 1;
      } else {
        if (introStartTime < 0) introStartTime = now;
        const progress = clamp((now - introStartTime) / 2600, 0, 1);
        voxelMaterial.uniforms.uIntro.value = progress;
        compositeMat.uniforms.uIntro.value = clamp(1.25 * progress, 0, 1);
        if (progress >= 1) introDone = true;
      }

      // Process pending ripple impulses
      for (const rip of pendingRipples.splice(0)) {
        applyRippleImpulse(rip.x, rip.z, rip.amount, rip.radius);
      }

      // Ripple wave propagation physics
      if (rippleActive && isRunning) {
        rippleAccumTime += delta;
        let steps = 0;
        let energy = 1;
        while (rippleAccumTime >= 1 / 120 && steps < 4) {
          energy = stepRipplePhysics();
          rippleAccumTime -= 1 / 120;
          steps++;
        }
        if (steps >= 4) rippleAccumTime = 0;
        if (steps > 0) {
          ripTexture.image.data = ripCurrent;
          ripTexture.needsUpdate = true;
        }
        if (energy < 0.0004) {
          rippleIdleTime += delta;
          if (rippleIdleTime > 0.6) {
            rippleActive = false;
            ripCurrent.fill(0);
            ripPrev.fill(0);
            ripNext.fill(0);
            ripTexture.image.data = ripCurrent;
            ripTexture.needsUpdate = true;
            voxelMaterial.uniforms.uRippleOn.value = 0;
          }
        } else {
          rippleIdleTime = 0;
        }
      }

      render();

      const shouldContinue =
        (isRunning && clamp(numOr(p.speed, 0.5), 0, 4) > 0) ||
        (rippleActive && isRunning) ||
        !introDone;

      if (shouldContinue && isVisible && !document.hidden) {
        rafId = requestAnimationFrame(animate);
      }
    };

    // Interaction handlers
    const onPointerMove = (e) => {
      const p = propsRef.current;
      if (!p.interactive || p.reduced || p.paused) return;
      const hit = raycastPlane(e.clientX, e.clientY);
      const now = performance.now();
      if (!hit) {
        lastPointer = null;
        return;
      }

      const ripStrength = clamp(numOr(p.ripples, 1), 0, 3);
      if (lastPointer && ripStrength > 0) {
        const dx = hit.x - lastPointer.x;
        const dz = hit.z - lastPointer.z;
        const dist = Math.hypot(dx, dz);
        const spd =
          clamp(dist / Math.max(0.008, (now - lastPointer.t) / 1000) * 0.009, 0, 0.07) * ripStrength;

        if (spd > 0.0005) {
          const count = Math.min(
            12,
            Math.max(1, Math.ceil(dist / (2 * ((rippleRect.z - rippleRect.x) / RIPPLE_W))))
          );
          for (let step = 1; step <= count; step++) {
            pendingRipples.push({
              x: lastPointer.x + (dx * step) / count,
              z: lastPointer.z + (dz * step) / count,
              amount: spd / Math.sqrt(count),
              radius: 2.2,
            });
          }
          requestFrame();
        }
      }
      lastPointer = { x: hit.x, z: hit.z, t: now };
    };

    const onPointerLeave = () => {
      lastPointer = null;
    };

    const onPointerDown = (e) => {
      const p = propsRef.current;
      if (
        !p.interactive ||
        p.reduced ||
        p.paused ||
        !e.isPrimary ||
        (e.pointerType === 'mouse' && e.button !== 0)
      ) {
        return;
      }

      // Ignore clicks on nested interactive buttons/links
      if (
        e.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('a, button, input, textarea, select, label, summary, [role=button]')
      ) {
        return;
      }

      const hit = raycastPlane(e.clientX, e.clientY);
      if (!hit) return;
      const ripStrength = clamp(numOr(p.ripples, 1), 0, 3);
      if (ripStrength <= 0) return;

      pendingRipples.push({
        x: hit.x,
        z: hit.z,
        amount: 0.42 * ripStrength,
        radius: 3.6,
      });
      requestFrame();
    };

    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerdown', onPointerDown, { passive: true });
    container.addEventListener('pointerleave', onPointerLeave, { passive: true });
    container.addEventListener('pointercancel', onPointerLeave, { passive: true });

    const ro = new ResizeObserver(() => {
      if (updateSize()) {
        render();
        requestFrame();
      }
    });
    ro.observe(container);

    const io = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = isVisible;
        isVisible = entry.isIntersecting;
        if (isVisible && !wasVisible) {
          requestFrame();
        }
      },
      { rootMargin: '120px' }
    );
    io.observe(container);

    const onVisibilityChange = () => {
      if (!document.hidden && isVisible) {
        requestFrame();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onContextLost = (e) => {
      e.preventDefault();
      cancelAnimationFrame(rafId);
      rafId = 0;
    };
    const onContextRestored = () => {
      cachedGridKey = '';
      ripTexture.needsUpdate = true;
      requestFrame();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    updateSize();
    updateColors();
    requestFrame();

    engineRef.current = {
      sync: () => {
        if (updateSize()) cachedGridKey = '';
        render();
        requestFrame();
      },
      ripple: (normX, normY, strength) => {
        if (propsRef.current.reduced) return;
        const rect = container.getBoundingClientRect();
        const hit = raycastPlane(
          rect.left + clamp(normX ?? 0.5, 0, 1) * rect.width,
          rect.top + clamp(normY ?? 0.8, 0, 1) * rect.height
        );
        if (hit) {
          pendingRipples.push({
            x: hit.x,
            z: hit.z,
            amount: 0.42 * clamp(numOr(strength, 1), 0, 3),
            radius: 3.6,
          });
          requestFrame();
        }
      },
      replay: () => {
        introStartTime = -1;
        introDone = false;
        requestFrame();
      },
      destroy: () => {
        isDestroyed = true;
        cancelAnimationFrame(rafId);
        ro.disconnect();
        io.disconnect();
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointerleave', onPointerLeave);
        container.removeEventListener('pointercancel', onPointerLeave);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        canvas.removeEventListener('webglcontextlost', onContextLost);
        canvas.removeEventListener('webglcontextrestored', onContextRestored);

        voxelGeom.dispose();
        quadGeom.dispose();
        voxelMaterial.dispose();
        bloomPrefilterMat.dispose();
        bloomBlurMat.dispose();
        compositeMat.dispose();
        ripTexture.dispose();
        sceneTarget.dispose();
        bloomTargets.forEach((t) => t.dispose());
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
      },
    };

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      ripple: (x, y, strength) => engineRef.current?.ripple(x, y, strength),
      replay: () => engineRef.current?.replay(),
    }),
    []
  );

  return (
    <div
      ref={containerRef}
      className={`relative isolate h-full min-h-0 w-full overflow-hidden ${className}`}
      style={{
        backgroundColor: backgroundColor === 'transparent' ? undefined : backgroundColor,
        touchAction: 'pan-y',
        ...style,
      }}
    >
      <div
        ref={canvasHostRef}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
      {children && (
        <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>{children}</div>
      )}
    </div>
  );
});

VoxelArc.displayName = 'VoxelArc';

export default VoxelArc;
