import React, { useRef, useEffect, useImperativeHandle, forwardRef, useSyncExternalStore } from 'react';
import * as THREE from 'three';

const DEFAULT_CHARSET = ' ·+×○◎◉';
const DEFAULT_FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

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

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

let measureCtx = null;
const parseColor = (col, fallback = [0.04, 0.04, 0.04]) => {
  if (typeof document === 'undefined') return fallback;
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d');
  }
  if (!measureCtx) return fallback;
  measureCtx.fillStyle = '#010203';
  measureCtx.fillStyle = col;
  const str = String(measureCtx.fillStyle);
  if (str === '#010203' && col.trim().toLowerCase() !== '#010203') return fallback;
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    ];
  }
  const nums = str.match(/[\d.]+/g);
  return !nums || nums.length < 3
    ? fallback
    : [Number(nums[0]) / 255, Number(nums[1]) / 255, Number(nums[2]) / 255];
};

const sRgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

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

const QUAD_VERT = `
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FIELD_FRAG = `
precision highp float;
uniform vec2 uCell;
uniform vec2 uResolution;
uniform float uTime;
uniform float uScale;
uniform vec2 uDrift;
uniform float uThreshold;
uniform float uAmbient;
uniform float uReveal;
uniform float uPersistence;
uniform float uWidth;
uniform float uFalloff;
uniform vec4 uPings[16];
uniform vec4 uPingShape[16];
uniform vec4 uObstacle;
out vec4 fragColor;

float hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amplitude * noise3(p);
    p = p * 2.03 + vec3(17.1, 3.7, 1.3);
    amplitude *= 0.5;
  }
  return sum / 0.9375;
}

void main() {
  vec2 center = gl_FragCoord.xy * uCell;
  float unit = min(uResolution.x, uResolution.y);
  vec2 q = center / unit * (4.2 / uScale) - uDrift * uTime;
  float z = uTime * 0.03;
  vec2 warp = vec2(fbm(vec3(q * 0.6, z + 3.1)), fbm(vec3(q * 0.6 + 7.3, z + 8.4))) - 0.5;
  float n = fbm(vec3(q + warp * 1.2, z * 1.3));
  float shoal = smoothstep(uThreshold, uThreshold + 0.08, n);
  float core = smoothstep(uThreshold, uThreshold + 0.26, n);
  float hidden = smoothstep(uThreshold - 0.2, uThreshold, n) * (1.0 - shoal);
  float speck = hash2(floor(gl_FragCoord.xy) + 17.0);
  float stipple = hash2(floor(gl_FragCoord.xy) * 1.37 + 71.0);

  float crest = 0.0;
  float tail = 0.0;
  for (int k = 0; k < 16; k++) {
    vec4 ping = uPings[k];
    if (ping.w <= 0.0) continue;
    vec4 shape = uPingShape[k];
    float age = uTime - ping.z;
    if (age < 0.0) continue;
    vec2 rel = center - ping.xy;
    float dist = length(rel);
    if (dist > shape.y) continue;
    float radius = age * shape.x;
    float lag = radius - dist;
    if (lag < -uWidth * 3.0) continue;
    float fade = ping.w * (1.0 - smoothstep(shape.y * 0.5, shape.y, dist)) * inversesqrt(1.0 + dist / uFalloff) * smoothstep(0.0, shape.w, radius);
    float shadow = 1.0;
    if (shape.z < 0.5 && uObstacle.w > 0.001) {
      vec2 toward = uObstacle.xy - ping.xy;
      float reach = length(toward);
      if (reach > uObstacle.z * 2.5 && dist > reach - uObstacle.z) {
        vec2 dir = toward / reach;
        float side = abs(rel.x * dir.y - rel.y * dir.x);
        float beyond = max(dist - reach, 0.0);
        float spread = uObstacle.z * dist / reach;
        float soft = uObstacle.z * 0.3 + 0.35 * sqrt(beyond * uObstacle.z);
        float inside = 1.0 - smoothstep(spread - soft, spread + soft, side);
        float heal = mix(0.25, 1.0, exp(-beyond / (uObstacle.z * 16.0)));
        shadow = 1.0 - inside * heal * uObstacle.w * step(0.0, dot(rel, dir));
      }
    }
    float width = lag < 0.0 ? uWidth * 0.6 : uWidth;
    float x = lag / width;
    float front = exp(-x * x * x * x);
    float after = lag > 0.0 ? exp(-lag / max(shape.x * uPersistence, 1.0)) : 0.0;
    crest += front * fade * shadow;
    tail += after * (1.0 - front) * fade * shadow;
  }
  crest = min(crest, 1.4);
  tail = min(tail, 1.2);

  float shown = step(stipple, 0.22 + 0.6 * core);
  float rest = uAmbient * shoal * shown * (0.45 + 0.55 * core);
  float lit = shoal * (0.65 + 0.35 * core) * (crest * 1.5 + tail * 0.55);
  float ghost = hidden * uReveal * (crest * 0.5 + tail * 0.22);
  float water = (1.0 - shoal) * crest * (0.18 + 0.32 * step(0.72, speck));
  float value = clamp(rest + lit + ghost + water, 0.0, 1.0);
  float heat = clamp(crest * 1.4 + tail * 0.6, 0.0, 1.0);
  float struck = 0.6 + 0.4 * clamp(crest * 1.3, 0.0, 1.0);
  float open = 0.5 + 0.28 * clamp(crest, 0.0, 1.0);
  float tone = mix(0.12 + 0.3 * core, mix(open, struck, max(shoal, hidden * 0.6)), heat);
  fragColor = vec4(value, tone, 0.0, 1.0);
}
`;

const GLYPHS_FRAG = `
precision highp float;
uniform sampler2D uField;
uniform sampler2D uAtlas;
uniform vec2 uAtlasGrid;
uniform float uCount;
uniform vec2 uCell;
uniform float uSpan;
uniform float uGamma;
uniform float uDither;
uniform float uInk;
uniform vec3 uLabA;
uniform vec3 uLabB;
out vec4 fragColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 labToLinear(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return max(vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ), 0.0);
}

float glyphCoverage(float index, vec2 g) {
  vec2 f = fract(g) - 0.5;
  vec2 texel = vec2(0.5 + f.x * uSpan, 0.5 - f.y * uSpan);
  float inside = step(0.0, texel.x) * step(texel.x, 1.0) * step(0.0, texel.y) * step(texel.y, 1.0);
  vec2 slot = vec2(mod(index, uAtlasGrid.x), floor(index / uAtlasGrid.x));
  vec2 uv = (slot + clamp(texel, 0.0, 1.0)) / uAtlasGrid;
  vec2 scale = vec2(uSpan) / uAtlasGrid;
  return textureGrad(uAtlas, uv, dFdx(g) * scale, dFdy(g) * scale).r * inside;
}

vec3 palette(float t) {
  vec3 deep = vec3(uLabA.x * 0.55, uLabA.yz * 0.85);
  vec3 top = uInk > 0.5
    ? vec3(uLabB.x * 0.72, uLabB.yz * 1.05)
    : vec3(min(uLabB.x * 1.08 + 0.05, 0.99), uLabB.yz * 0.35);
  vec3 lab = t < 0.45 ? mix(deep, uLabA, smoothstep(0.0, 0.45, t))
    : t < 0.85 ? mix(uLabA, uLabB, smoothstep(0.45, 0.85, t))
    : mix(uLabB, top, smoothstep(0.85, 1.0, t));
  return labToLinear(lab);
}

void main() {
  vec2 g = gl_FragCoord.xy / uCell;
  vec2 cellId = floor(g);
  vec4 field = texelFetch(uField, ivec2(cellId), 0);
  float dither = hash(cellId) - 0.5;
  float value = clamp(field.r + dither * uDither * step(0.015, field.r), 0.0, 1.0);
  float level = pow(value, uGamma);
  float index = floor(level * (uCount - 1.0) + 0.5);
  float energy = 0.0;
  vec3 color = vec3(0.0);
  if (index >= 1.0) {
    float cover = glyphCoverage(index, g);
    color = palette(clamp(field.g, 0.0, 1.0));
    energy = cover * (0.16 + 0.95 * level);
  }
  fragColor = vec4(color * energy, energy);
}
`;

const DOWNSAMPLE_FRAG = `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 a = texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  vec4 b = texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  vec4 c = texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  vec4 d = texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = (a + b + c + d) * 0.125 + texture(uSource, vUv) * 0.5;
}
`;

const UPSAMPLE_FRAG = `
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 sum = texture(uSource, vUv) * 4.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, -1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, 1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = texture(uBase, vUv) + sum / 16.0;
}
`;

const COMPOSITE_FRAG = `
precision highp float;
uniform sampler2D uLines;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform float uGlow;
uniform float uExposure;
uniform float uMode;
uniform float uGrain;
in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  vec4 lines = texture(uLines, vUv);
  vec4 bloom = texture(uBloom, vUv);
  vec3 color;
  if (uMode < 0.5) {
    vec3 light = (lines.rgb + bloom.rgb * uGlow) * uExposure;
    vec3 exposed = 1.0 - exp(-light);
    float peak = max(exposed.r, max(exposed.g, exposed.b));
    exposed = mix(exposed, vec3(peak), smoothstep(0.75, 1.0, peak) * 0.35);
    color = uBackground + (1.0 - uBackground) * exposed;
  } else {
    float energy = lines.a + bloom.a * uGlow * 0.2;
    vec3 hue = (lines.rgb + bloom.rgb * uGlow * 0.2) / max(energy, 1e-4);
    float cover = clamp(1.0 - exp(-energy * uExposure * 1.4), 0.0, 0.95);
    color = mix(uBackground, clamp(hue * 0.85, 0.0, 1.0), cover);
  }
  float grain = hash(gl_FragCoord.xy + uGrain * 311.0) - 0.5;
  fragColor = vec4(encode(color) + grain * (1.2 / 255.0), 1.0);
}
`;

const GlyphSonar = forwardRef(function GlyphSonar(
  {
    colors = ['#7C5CFF', '#FF9FFC'],
    backgroundColor = '#0A0A0A',
    mode = 'auto',
    charset = DEFAULT_CHARSET,
    fontFamily = DEFAULT_FONT,
    glyphSize = 11,
    spacing = 1,
    glyphWeight = 1,
    density = 0.5,
    scale = 1,
    drift = 1,
    driftAngle = 20,
    ambient = 0.35,
    autoPing = true,
    interval = 3.4,
    originX = 0.5,
    originY = 0.5,
    pingSpeed = 1,
    range = 1,
    ringWidth = 1,
    persistence = 0.6,
    reveal = 0.5,
    glow = 0.12,
    intensity = 1,
    speed = 1,
    interactive = true,
    clickPing = true,
    echo = true,
    echoStrength = 1,
    paused = false,
    quality = 1,
    className = '',
    style = {},
    children,
  },
  ref
) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);

  const propsRef = useRef({
    colors,
    backgroundColor,
    mode,
    charset,
    fontFamily,
    glyphSize,
    spacing,
    glyphWeight,
    density,
    scale,
    drift,
    driftAngle,
    ambient,
    autoPing,
    interval,
    originX,
    originY,
    pingSpeed,
    range,
    ringWidth,
    persistence,
    reveal,
    glow,
    intensity,
    speed,
    interactive,
    clickPing,
    echo,
    echoStrength,
    paused,
    quality,
    reduced: reducedMotion,
  });

  useEffect(() => {
    propsRef.current = {
      colors,
      backgroundColor,
      mode,
      charset,
      fontFamily,
      glyphSize,
      spacing,
      glyphWeight,
      density,
      scale,
      drift,
      driftAngle,
      ambient,
      autoPing,
      interval,
      originX,
      originY,
      pingSpeed,
      range,
      ringWidth,
      persistence,
      reveal,
      glow,
      intensity,
      speed,
      interactive,
      clickPing,
      echo,
      echoStrength,
      paused,
      quality,
      reduced: reducedMotion,
    };
    engineRef.current?.sync();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';
    container.prepend(canvas);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance',
      });
    } catch {
      canvas.remove();
      return;
    }

    if (!renderer.capabilities.isWebGL2) {
      renderer.dispose();
      canvas.remove();
      return;
    }

    renderer.autoClear = false;
    const targetType =
      renderer.extensions.has('EXT_color_buffer_float') ||
      renderer.extensions.has('EXT_color_buffer_half_float')
        ? THREE.HalfFloatType
        : THREE.UnsignedByteType;

    const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeom = new THREE.PlaneGeometry(2, 2);

    const pingVectors = Array.from({ length: 16 }, () => new THREE.Vector4(0, 0, 0, 0));
    const pingShapeVectors = Array.from({ length: 16 }, () => new THREE.Vector4(1, 1, 0, 0));
    const activePings = Array.from({ length: 16 }, () => ({
      active: false,
      x: 0,
      y: 0,
      born: 0,
      amplitude: 0,
      speed: 0.17,
      range: 0.75,
      birth: 0.08,
      echo: false,
      echoed: false,
    }));

    const createMat = (frag, uniforms) =>
      new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        uniforms,
        vertexShader: QUAD_VERT,
        fragmentShader: frag,
        depthTest: false,
        depthWrite: false,
        blending: THREE.NoBlending,
      });

    const fieldMat = createMat(FIELD_FRAG, {
      uCell: { value: new THREE.Vector2(11, 11) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uScale: { value: 1 },
      uDrift: { value: new THREE.Vector2() },
      uThreshold: { value: 0.55 },
      uAmbient: { value: 0.35 },
      uReveal: { value: 0.5 },
      uPersistence: { value: 1.4 },
      uWidth: { value: 8 },
      uFalloff: { value: 300 },
      uPings: { value: pingVectors },
      uPingShape: { value: pingShapeVectors },
      uObstacle: { value: new THREE.Vector4(0, 0, 22, 0) },
    });

    const glyphsMat = createMat(GLYPHS_FRAG, {
      uField: { value: null },
      uAtlas: { value: null },
      uAtlasGrid: { value: new THREE.Vector2(16, 1) },
      uCount: { value: 2 },
      uCell: { value: new THREE.Vector2(11, 11) },
      uSpan: { value: 1 },
      uGamma: { value: 1 },
      uDither: { value: 0.05 },
      uInk: { value: 0 },
      uLabA: { value: new THREE.Vector3() },
      uLabB: { value: new THREE.Vector3() },
    });

    const downsampleMat = createMat(DOWNSAMPLE_FRAG, {
      uSource: { value: null },
      uTexel: { value: new THREE.Vector2() },
    });

    const upsampleMat = createMat(UPSAMPLE_FRAG, {
      uSource: { value: null },
      uBase: { value: null },
      uTexel: { value: new THREE.Vector2() },
    });

    const compositeMat = createMat(COMPOSITE_FRAG, {
      uLines: { value: null },
      uBloom: { value: null },
      uBackground: { value: new THREE.Vector3() },
      uGlow: { value: 0.3 },
      uExposure: { value: 1.2 },
      uMode: { value: 0 },
      uGrain: { value: 0 },
    });

    const quadMesh = new THREE.Mesh(quadGeom, compositeMat);
    quadMesh.frustumCulled = false;
    const simScene = new THREE.Scene();
    simScene.add(quadMesh);

    const makeRenderTarget = (w, h) =>
      new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
        type: targetType,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: false,
        stencilBuffer: false,
        generateMipmaps: false,
      });

    let mainTarget = null;
    let downTargets = [];
    let upTargets = [];
    let fieldTarget = null;
    let cachedGridKey = '';
    let atlasState = null;
    let cachedAtlasKey = '';
    let isDestroyed = false;
    let rafId = 0;
    let lastPerfTime = 0;
    let isVisible = true;
    let simTime = 0;
    let nextAutoPingTime = 0;
    let cssW = 1;
    let cssH = 1;
    let dprVal = 1;
    let grainOffset = 0;

    const pointer = {
      x: 0,
      y: 0,
      sx: 0,
      sy: 0,
      presence: 0,
      inside: false,
      placed: false,
    };

    const disposeTargets = () => {
      mainTarget?.dispose();
      downTargets.forEach((t) => t.dispose());
      upTargets.forEach((t) => t.dispose());
      mainTarget = null;
      downTargets = [];
      upTargets = [];
    };

    const renderPass = (mat, target) => {
      quadMesh.material = mat;
      renderer.setRenderTarget(target);
      renderer.render(simScene, orthoCam);
    };

    const getScaledGlyphSize = () =>
      clamp(propsRef.current.glyphSize, 5, 40) *
      clamp(Math.min(cssW, cssH) / 520, 0.75, 1) *
      dprVal;

    const getCellSize = () => getScaledGlyphSize() * clamp(propsRef.current.spacing, 0.7, 3);
    const getDiagonal = () => Math.hypot(cssW, cssH) * dprVal;

    const calculateObstacleEcho = (ping, dist) => {
      const diag = ping.range * getDiagonal();
      const a = 0.5 * diag;
      const t = clamp((dist - a) / (diag - a), 0, 1);
      const curve = (1 - t * t * (3 - 2 * t)) / Math.sqrt(1 + dist / (0.25 * getDiagonal()));
      return Math.max(0, curve);
    };

    const spawnPing = (x, y, amp, isEcho, birth, bornAt = simTime) => {
      const p = propsRef.current;
      let slot = activePings.findIndex((item) => !item.active);
      if (slot < 0) {
        slot = 0;
        for (let i = 1; i < 16; i++) {
          if (activePings[i].born < activePings[slot].born) slot = i;
        }
      }
      const pingRange = clamp(p.range, 0.1, 3) * (isEcho ? 0.34 : 0.75);
      Object.assign(activePings[slot], {
        active: true,
        x,
        y,
        born: bornAt,
        amplitude: amp,
        speed: 0.17 * clamp(p.pingSpeed, 0.1, 4),
        range: pingRange,
        birth,
        echo: isEcho,
        echoed: isEcho,
      });
    };

    const getOrigin = () => {
      const p = propsRef.current;
      return [clamp(p.originX, -1, 2), clamp(p.originY, -1, 2)];
    };

    const updateAtlas = () => {
      const p = propsRef.current;
      const chars = String(p.charset ?? '') || DEFAULT_CHARSET;
      const font = String(p.fontFamily ?? '') || DEFAULT_FONT;
      const gSize = Math.round(clamp(getScaledGlyphSize(), 8, 96));
      const weight = clamp(p.glyphWeight, 0.4, 3);
      const key = `${chars}|${font}|${gSize}|${weight}`;

      if (key === cachedAtlasKey && atlasState) return;
      cachedAtlasKey = key;
      atlasState?.texture.dispose();

      let setChars = Array.from(new Set(Array.from(chars))).slice(0, 180);
      if (!setChars.includes(' ')) setChars.unshift(' ');
      if (setChars.length < 2) setChars.push('·');

      const strokeW = Math.max(1, Math.round(0.075 * gSize * weight));
      const pixelOffset = 0.5 * (strokeW % 2 === 1 ? 1 : 0);
      const fontStr = `500 ${Math.round(0.78 * gSize)}px ${font}`;

      const drawSymbol = (ctx, char, cx, cy) => {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = strokeW;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const strokeCircle = (r) => {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        };
        const fillCircle = (r) => {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        };
        const drawDiamond = (r) => {
          ctx.beginPath();
          ctx.moveTo(cx, cy - r);
          ctx.lineTo(cx + r, cy);
          ctx.lineTo(cx, cy + r);
          ctx.lineTo(cx - r, cy);
          ctx.closePath();
        };
        const drawTriangle = (r) => {
          ctx.beginPath();
          ctx.moveTo(cx, cy - r);
          ctx.lineTo(cx + 0.92 * r, cy + 0.6 * r);
          ctx.lineTo(cx - 0.92 * r, cy + 0.6 * r);
          ctx.closePath();
        };

        const ox = cx + pixelOffset;
        const oy = cy + pixelOffset;

        switch (char) {
          case '·':
            fillCircle(Math.max(0.065 * gSize, 0.8 * strokeW));
            return true;
          case '•':
            fillCircle(0.13 * gSize);
            return true;
          case '●':
            fillCircle(0.25 * gSize);
            return true;
          case '+':
            ctx.beginPath();
            ctx.moveTo(ox - 0.2 * gSize, oy);
            ctx.lineTo(ox + 0.2 * gSize, oy);
            ctx.moveTo(ox, oy - 0.2 * gSize);
            ctx.lineTo(ox, oy + 0.2 * gSize);
            ctx.stroke();
            return true;
          case '×':
            ctx.beginPath();
            ctx.moveTo(ox - 0.16 * gSize, oy - 0.16 * gSize);
            ctx.lineTo(ox + 0.16 * gSize, oy + 0.16 * gSize);
            ctx.moveTo(ox + 0.16 * gSize, oy - 0.16 * gSize);
            ctx.lineTo(ox - 0.16 * gSize, oy + 0.16 * gSize);
            ctx.stroke();
            return true;
          case '○':
            strokeCircle(0.26 * gSize);
            return true;
          case '□':
            ctx.beginPath();
            ctx.rect(ox - 0.23 * gSize, oy - 0.23 * gSize, 0.46 * gSize, 0.46 * gSize);
            ctx.stroke();
            return true;
          case '■':
            ctx.fillRect(ox - 0.21 * gSize, oy - 0.21 * gSize, 0.42 * gSize, 0.42 * gSize);
            return true;
          case '◇':
            drawDiamond(0.3 * gSize);
            ctx.stroke();
            return true;
          case '◆':
            drawDiamond(0.28 * gSize);
            ctx.fill();
            return true;
          case '△':
            drawTriangle(0.3 * gSize);
            ctx.stroke();
            return true;
          case '▲':
            drawTriangle(0.28 * gSize);
            ctx.fill();
            return true;
          case '◎':
            strokeCircle(0.28 * gSize);
            fillCircle(0.085 * gSize);
            return true;
          case '◉':
            strokeCircle(0.28 * gSize);
            fillCircle(0.15 * gSize);
            return true;
          default:
            return false;
        }
      };

      const measureCanvas = document.createElement('canvas');
      measureCanvas.width = gSize;
      measureCanvas.height = gSize;
      const measureCtx2 = measureCanvas.getContext('2d', { willReadFrequently: true });

      const sorted = setChars
        .map((ch) => {
          if (!measureCtx2 || ch === ' ') return { character: ch, ink: 0 };
          measureCtx2.fillStyle = '#000000';
          measureCtx2.fillRect(0, 0, gSize, gSize);
          const drawn = drawSymbol(measureCtx2, ch, Math.floor(gSize / 2), Math.floor(gSize / 2));
          if (!drawn) {
            measureCtx2.textAlign = 'center';
            measureCtx2.textBaseline = 'middle';
            measureCtx2.font = fontStr;
            measureCtx2.fillText(ch, Math.floor(gSize / 2), Math.floor(gSize / 2) + 0.04 * gSize);
          }
          const imgData = measureCtx2.getImageData(0, 0, gSize, gSize).data;
          let sum = 0;
          for (let k = 0; k < imgData.length; k += 4) sum += imgData[k];
          return { character: ch, ink: sum };
        })
        .sort((a, b) => a.ink - b.ink)
        .map((x) => x.character);

      const rows = Math.ceil(sorted.length / 16);
      const atlasCanvas = document.createElement('canvas');
      atlasCanvas.width = 16 * gSize;
      atlasCanvas.height = rows * gSize;
      const atlasCtx = atlasCanvas.getContext('2d');

      if (atlasCtx) {
        atlasCtx.fillStyle = '#000000';
        atlasCtx.fillRect(0, 0, atlasCanvas.width, atlasCanvas.height);
        sorted.forEach((ch, idx) => {
          if (ch === ' ') return;
          const gx = (idx % 16) * gSize + Math.floor(gSize / 2);
          const gy = Math.floor(idx / 16) * gSize + Math.floor(gSize / 2);
          const drawn = drawSymbol(atlasCtx, ch, gx, gy);
          if (!drawn) {
            atlasCtx.textAlign = 'center';
            atlasCtx.textBaseline = 'middle';
            atlasCtx.font = fontStr;
            atlasCtx.fillText(ch, gx, gy + 0.04 * gSize);
          }
        });
      }

      const atlasTex = new THREE.CanvasTexture(atlasCanvas);
      atlasTex.minFilter = THREE.LinearMipmapLinearFilter;
      atlasTex.magFilter = THREE.LinearFilter;
      atlasTex.generateMipmaps = true;
      atlasTex.colorSpace = THREE.SRGBColorSpace;
      atlasTex.flipY = false;
      atlasTex.anisotropy = 4;
      atlasTex.needsUpdate = true;

      atlasState = { texture: atlasTex, count: sorted.length, rows };
      glyphsMat.uniforms.uAtlas.value = atlasState.texture;
      glyphsMat.uniforms.uAtlasGrid.value.set(16, atlasState.rows);
      glyphsMat.uniforms.uCount.value = atlasState.count;
    };

    const render = () => {
      if (!mainTarget || !downTargets.length) return;
      updateAtlas();

      const p = propsRef.current;
      const cellSizeVal = getCellSize();
      const gridW = Math.ceil((cssW * dprVal) / cellSizeVal);
      const gridH = Math.ceil((cssH * dprVal) / cellSizeVal);
      const gridKey = `${gridW}|${gridH}`;

      if (gridKey !== cachedGridKey || !fieldTarget) {
        cachedGridKey = gridKey;
        fieldTarget?.dispose();
        fieldTarget = new THREE.WebGLRenderTarget(gridW, gridH, {
          type: targetType,
          format: THREE.RGBAFormat,
          minFilter: THREE.NearestFilter,
          magFilter: THREE.NearestFilter,
          depthBuffer: false,
          stencilBuffer: false,
          generateMipmaps: false,
        });
      }

      const bgRgb = parseColor(p.backgroundColor, [0.04, 0.04, 0.04]);
      const bgLum = 0.2126 * bgRgb[0] + 0.7152 * bgRgb[1] + 0.0722 * bgRgb[2];
      const isInk = p.mode === 'ink' || (p.mode === 'auto' && bgLum > 0.5);

      const labA = rgbToOklab(parseColor(p.colors[0], [0.48, 0.36, 1]));
      const labB = rgbToOklab(parseColor(p.colors[1] || p.colors[0], [1, 0.62, 0.99]));

      const pw = cssW * dprVal;
      const ph = cssH * dprVal;
      const diag = getDiagonal();
      const cellPx = getCellSize();
      const driftRad = (clamp(p.driftAngle, -360, 360) * Math.PI) / 180;
      const driftSpeed = 0.03 * clamp(p.drift, 0, 5);

      const fUni = fieldMat.uniforms;
      fUni.uCell.value.set(cellPx, cellPx);
      fUni.uResolution.value.set(pw, ph);
      fUni.uTime.value = simTime;
      fUni.uScale.value = clamp(p.scale, 0.2, 5);
      fUni.uDrift.value.set(Math.cos(driftRad) * driftSpeed, -Math.sin(driftRad) * driftSpeed);
      fUni.uThreshold.value = 0.66 - 0.26 * clamp(p.density, 0, 1);
      fUni.uAmbient.value = clamp(p.ambient, 0, 1);
      fUni.uReveal.value = clamp(p.reveal, 0, 1);
      fUni.uPersistence.value = clamp(p.persistence, 0.05, 10);
      fUni.uWidth.value = Math.max(1, 0.8 * cellPx * clamp(p.ringWidth, 0.2, 5));
      fUni.uFalloff.value = 0.25 * diag;

      activePings.forEach((ping, idx) => {
        if (ping.active) {
          pingVectors[idx].set(ping.x * pw, (1 - ping.y) * ph, ping.born, ping.amplitude);
          pingShapeVectors[idx].set(
            ping.speed * diag,
            ping.range * diag,
            +!!ping.echo,
            Math.max(1, ping.birth * diag)
          );
        } else {
          pingVectors[idx].set(0, 0, 0, 0);
        }
      });

      const obstaclePresence = p.interactive && p.echo && !p.reduced ? pointer.presence : 0;
      fUni.uObstacle.value.set(pointer.sx, pointer.sy, 26 * dprVal, obstaclePresence * clamp(p.echoStrength, 0, 1));

      const gUni = glyphsMat.uniforms;
      gUni.uField.value = fieldTarget ? fieldTarget.texture : null;
      gUni.uCell.value.set(cellPx, cellPx);
      gUni.uSpan.value = cellPx / Math.max(1, getScaledGlyphSize());
      gUni.uGamma.value = 0.9;
      gUni.uDither.value = 0.12 / Math.sqrt(Math.max((atlasState?.count ?? 8) / 8, 1));
      gUni.uInk.value = +!!isInk;
      gUni.uLabA.value.set(labA[0], labA[1], labA[2]);
      gUni.uLabB.value.set(labB[0], labB[1], labB[2]);

      const cUni = compositeMat.uniforms;
      cUni.uBackground.value.set(sRgbToLinear(bgRgb[0]), sRgbToLinear(bgRgb[1]), sRgbToLinear(bgRgb[2]));
      cUni.uGlow.value = clamp(p.glow, 0, 3);
      cUni.uExposure.value = (isInk ? 4 : 1.25) * clamp(p.intensity, 0, 4);
      cUni.uMode.value = +!!isInk;
      cUni.uGrain.value = grainOffset;

      if (fieldTarget) renderPass(fieldMat, fieldTarget);
      renderPass(glyphsMat, mainTarget);

      // Downsample bloom pyramid
      let curPass = mainTarget;
      for (const t of downTargets) {
        downsampleMat.uniforms.uSource.value = curPass.texture;
        downsampleMat.uniforms.uTexel.value.set(1 / curPass.width, 1 / curPass.height);
        renderPass(downsampleMat, t);
        curPass = t;
      }

      // Upsample bloom pyramid
      let bloomPass = downTargets[downTargets.length - 1];
      for (let i = downTargets.length - 2; i >= 0; i--) {
        upsampleMat.uniforms.uSource.value = bloomPass.texture;
        upsampleMat.uniforms.uBase.value = downTargets[i].texture;
        upsampleMat.uniforms.uTexel.value.set(1 / bloomPass.width, 1 / bloomPass.height);
        renderPass(upsampleMat, upTargets[i]);
        bloomPass = upTargets[i];
      }

      compositeMat.uniforms.uLines.value = mainTarget.texture;
      compositeMat.uniforms.uBloom.value = bloomPass.texture;
      renderPass(compositeMat, null);
    };

    const updatePhysics = (delta) => {
      const p = propsRef.current;
      if (p.interactive) {
        const targetPresence = p.echo && pointer.inside && !p.reduced ? 1 : 0;
        pointer.presence +=
          (targetPresence - pointer.presence) *
          (1 - Math.exp(-delta / (targetPresence > pointer.presence ? 0.18 : 0.35)));

        if (pointer.placed) {
          const smooth = 1 - Math.exp(-delta / 0.05);
          pointer.sx += (pointer.x - pointer.sx) * smooth;
          pointer.sy += (pointer.y - pointer.sy) * smooth;
        } else {
          pointer.sx = pointer.x;
          pointer.sy = pointer.y;
          pointer.placed = true;
        }
      }

      if (p.paused || p.reduced) return;

      simTime += delta * clamp(p.speed, 0, 4);
      const intervalSec = clamp(p.interval, 0.6, 30);

      if (p.autoPing) {
        if (nextAutoPingTime > simTime + intervalSec) nextAutoPingTime = simTime + intervalSec;
        if (simTime >= nextAutoPingTime) {
          const [ox, oy] = getOrigin();
          spawnPing(ox, oy, 1, false, 0.08, nextAutoPingTime);
          nextAutoPingTime = Math.max(nextAutoPingTime + intervalSec, simTime + 0.25 * intervalSec);
        }
      } else {
        nextAutoPingTime = simTime + 0.15 * intervalSec;
      }

      const diag = getDiagonal();
      const persist = clamp(p.persistence, 0.05, 10);

      for (const ping of activePings) {
        if (ping.active && (simTime - ping.born) * ping.speed * diag > ping.range * diag + ping.speed * diag * persist * 4) {
          ping.active = false;
        }
      }

      // Pointer obstacle reflection (only if interactive and echoes enabled)
      if (p.interactive && p.echo && pointer.presence > 0.5) {
        const pw = cssW * dprVal;
        const ph = cssH * dprVal;
        const obstRadius = 26 * dprVal;

        for (const ping of activePings) {
          if (!ping.active || ping.echoed) continue;
          const waveRadius = (simTime - ping.born) * ping.speed * diag;
          const distToObst = Math.hypot(pointer.sx - ping.x * pw, pointer.sy - (1 - ping.y) * ph);
          if (distToObst < 3 * obstRadius || waveRadius < distToObst) continue;
          ping.echoed = true;
          if (waveRadius - distToObst > ping.speed * diag * 0.25) continue;
          const echoAmp = ping.amplitude * calculateObstacleEcho(ping, distToObst) * 0.62 * clamp(p.echoStrength, 0, 2);
          if (echoAmp > 0.04) {
            spawnPing(pointer.sx / pw, 1 - pointer.sy / ph, echoAmp, true, 0.02);
          }
        }
      }

      grainOffset = (grainOffset + 0.618034) % 1;
    };

    const animate = (now) => {
      rafId = 0;
      if (isDestroyed || !isVisible || document.hidden) return;

      // Throttle to max ~55-60 FPS to prevent GPU saturation
      if (now - lastPerfTime < 18) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      const delta = Math.min(0.05, Math.max(0, (now - lastPerfTime) / 1000));
      lastPerfTime = now;

      updatePhysics(delta);
      render();

      const p = propsRef.current;
      const isRunning = !p.paused && !p.reduced;
      const hasPointerTransition = Math.abs(pointer.presence - (pointer.inside ? 1 : 0)) > 0.002;
      if (isVisible && !document.hidden && (isRunning || hasPointerTransition)) {
        rafId = requestAnimationFrame(animate);
      }
    };

    const requestFrame = () => {
      if (isDestroyed || rafId || !isVisible) return;
      lastPerfTime = performance.now();
      rafId = requestAnimationFrame(animate);
    };

    const onResize = () => {
      if (isDestroyed || !container) return;
      const rect = container.getBoundingClientRect();
      cssW = Math.max(1, rect.width);
      cssH = Math.max(1, rect.height);
      // Cap DPR to 1.25 for buttery-smooth performance
      dprVal = Math.min(window.devicePixelRatio || 1, 1.25) * clamp(propsRef.current.quality, 0.25, 1);

      renderer.setPixelRatio(dprVal);
      renderer.setSize(cssW, cssH, false);

      const pw = Math.round(cssW * dprVal);
      const ph = Math.round(cssH * dprVal);

      disposeTargets();
      mainTarget = makeRenderTarget(pw, ph);

      // Lightweight 2-stage bloom pyramid for smooth glow with low GPU overhead
      const mips = 2;
      for (let i = 1; i <= mips; i++) {
        downTargets.push(makeRenderTarget(Math.max(1, pw >> i), Math.max(1, ph >> i)));
        upTargets.push(makeRenderTarget(Math.max(1, pw >> i), Math.max(1, ph >> i)));
      }

      render();
      requestFrame();
    };

    const getPointerCoords = (e) => {
      const rect = container.getBoundingClientRect();
      return [(e.clientX - rect.left) * dprVal, (rect.height - (e.clientY - rect.top)) * dprVal];
    };

    const onPointerMove = (e) => {
      if (e.pointerType === 'touch') return;
      const [px, py] = getPointerCoords(e);
      pointer.x = px;
      pointer.y = py;
      if (!pointer.inside) {
        pointer.sx = px;
        pointer.sy = py;
      }
      pointer.inside = true;
      requestFrame();
    };

    const onPointerDown = (e) => {
      const p = propsRef.current;
      if (e.button !== 0 || !p.interactive || !p.clickPing || p.paused || p.reduced) return;
      const [px, py] = getPointerCoords(e);
      spawnPing(px / (cssW * dprVal), 1 - py / (cssH * dprVal), 1.15, false, 0.025);
      requestFrame();
    };

    const onPointerLeave = () => {
      pointer.inside = false;
      requestFrame();
    };

    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerdown', onPointerDown, { passive: true });
    container.addEventListener('pointerleave', onPointerLeave, { passive: true });
    container.addEventListener('pointercancel', onPointerLeave, { passive: true });

    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    const io = new IntersectionObserver(
      (entries) => {
        if ((isVisible = entries.some((entry) => entry.isIntersecting))) {
          requestFrame();
        }
      },
      { rootMargin: '80px' }
    );
    io.observe(container);

    const onVisibilityChange = () => {
      if (!document.hidden) requestFrame();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onContextLost = (e) => e.preventDefault();
    canvas.addEventListener('webglcontextlost', onContextLost);

    // Initial warm pings
    if (propsRef.current.autoPing) {
      const intervalSec = clamp(propsRef.current.interval, 0.6, 30);
      const [ox, oy] = getOrigin();
      spawnPing(ox, oy, 1, false, 0.08, simTime - 1.42 * intervalSec);
      spawnPing(ox, oy, 1, false, 0.08, simTime - 0.42 * intervalSec);
      nextAutoPingTime = simTime + 0.58 * intervalSec;
    }

    onResize();

    engineRef.current = {
      sync: () => {
        const nextDpr = Math.min(window.devicePixelRatio || 1, 2) * clamp(propsRef.current.quality, 0.25, 1);
        if (Math.abs(nextDpr - dprVal) > 0.001) {
          onResize();
        } else {
          render();
        }
        requestFrame();
      },
      ping: (x, y) => {
        const p = propsRef.current;
        if (p.paused || p.reduced) return;
        spawnPing(clamp(x, -1, 2), clamp(y, -1, 2), 1.15, false, 0.025);
        requestFrame();
      },
      destroy: () => {
        isDestroyed = true;
        cancelAnimationFrame(rafId);
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointerleave', onPointerLeave);
        container.removeEventListener('pointercancel', onPointerLeave);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        canvas.removeEventListener('webglcontextlost', onContextLost);
        ro.disconnect();
        io.disconnect();
        disposeTargets();
        fieldTarget?.dispose();
        atlasState?.texture.dispose();
        quadGeom.dispose();
        [fieldMat, glyphsMat, downsampleMat, upsampleMat, compositeMat].forEach((m) => m.dispose());
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
      ping: (x, y) =>
        engineRef.current?.ping(
          x ?? propsRef.current.originX,
          y ?? propsRef.current.originY
        ),
    }),
    []
  );

  return (
    <div
      ref={containerRef}
      className={`relative isolate h-full min-h-0 w-full overflow-hidden ${className}`}
      style={{ backgroundColor, ...style }}
    >
      {children && <div className="relative z-10 h-full w-full pointer-events-auto">{children}</div>}
    </div>
  );
});

GlyphSonar.displayName = 'GlyphSonar';

export default GlyphSonar;
