import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const PULSE_GLOW_GLSL = `
uniform float uClock;
uniform float uDepthFade;
uniform vec4 uPulseTime;
uniform vec3 uPulseOrigin[4];
uniform float uPulseSpeed;

float pulseGlow(vec3 direction) {
  float glow = 0.0;
  for (int k = 0; k < 4; k++) {
    float age = uClock - uPulseTime[k];
    if (age < 0.0 || age > 12.0) continue;
    float travelled = acos(clamp(dot(direction, uPulseOrigin[k]), -1.0, 1.0));
    float front = age * uPulseSpeed - travelled;
    glow += exp(-front * front * 60.0) * exp(-age * 0.38);
  }
  return glow;
}
`;

const SHELL_LIGHT_GLSL = `
${PULSE_GLOW_GLSL}
uniform float uTime;
uniform float uWorldRadius;
uniform vec2 uPointer;
uniform float uHover;
uniform float uHoverRadius;
uniform float uAspect;

void shellLight(vec4 mv, out vec4 clip, out float depthLight, out float hover, out float front) {
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float facing = clamp((mv.z - center.z) / max(uWorldRadius, 1e-4), -1.0, 1.0);
  front = smoothstep(-0.6, 0.6, facing);
  float rim = 1.0 - abs(facing);
  depthLight = mix(1.0 - uDepthFade, 1.0, front) * (1.0 + rim * rim * 0.45);
  clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 delta = (ndc - uPointer) * vec2(uAspect, 1.0);
  hover = exp(-dot(delta, delta) / max(uHoverRadius * uHoverRadius, 1e-4)) * uHover * front;
}
`;

const POINTS_VERT = `
${SHELL_LIGHT_GLSL}

attribute float aDegree;
attribute float aSeed;

uniform float uSize;
uniform float uPixelRatio;

varying float vBright;
varying float vHeat;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 clip;
  float depthLight;
  float hover;
  float front;
  shellLight(mv, clip, depthLight, hover, front);
  float pulse = pulseGlow(normalize(position)) * mix(1.0 - uDepthFade * 0.8, 1.0, front);
  float hub = min(aDegree / 6.0, 1.0);
  float twinkle = 0.78 + 0.22 * sin(uTime * (0.5 + aSeed * 1.3) + aSeed * 40.0);
  vHeat = clamp(hover * 0.9 + pulse, 0.0, 1.0);
  vBright = depthLight * (0.5 + 0.5 * hub) * twinkle + hover * 1.1 + pulse * 1.3;
  gl_Position = clip;
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float scale = center.z / min(mv.z, -1e-3);
  gl_PointSize = uSize * uPixelRatio * scale * (0.65 + 0.7 * hub) * (1.0 + vHeat * 0.7);
}
`;

const POINTS_FRAG = `
precision highp float;

uniform vec3 uBase;
uniform vec3 uHot;
uniform float uInk;

varying float vBright;
varying float vHeat;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float disc = 1.0 - smoothstep(0.35, 1.0, r);
  float amount = disc * vBright;
  if (amount < 0.003) discard;
  vec3 color = mix(uBase, uHot, clamp(vHeat + 0.25, 0.0, 1.0));
  if (uInk > 0.5) {
    float alpha = clamp(amount * 0.9, 0.0, 1.0);
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    gl_FragColor = vec4(color * amount, clamp(amount, 0.0, 1.0));
  }
}
`;

const LINES_VERT = `
${SHELL_LIGHT_GLSL}

attribute float aLength;

uniform float uReach;
uniform float uLineOpacity;

varying float vBright;
varying float vHover;
varying float vPulse;
varying float vSpan;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 clip;
  float depthLight;
  float hover;
  float front;
  shellLight(mv, clip, depthLight, hover, front);
  float pulse = pulseGlow(normalize(position)) * mix(1.0 - uDepthFade * 0.8, 1.0, front);
  float span = 1.0 - smoothstep(uReach * 0.35, uReach, aLength);
  vBright = depthLight * uLineOpacity * (0.35 + 0.65 * span) + hover * 0.55;
  vHover = hover;
  vPulse = pulse;
  vSpan = mix(0.55, 1.0, span);
  gl_Position = clip;
}
`;

const LINES_FRAG = `
precision highp float;

uniform vec3 uBase;
uniform vec3 uHot;
uniform float uInk;
uniform float uLineGain;

varying float vBright;
varying float vHover;
varying float vPulse;
varying float vSpan;

void main() {
  float heat = clamp(vHover * 0.8 + vPulse, 0.0, 1.0);
  vec3 color = mix(uBase, uHot, heat);
  float amount = (vBright + vPulse * 0.8) * vSpan * uLineGain;
  if (uInk > 0.5) {
    float alpha = clamp(amount * 0.85, 0.0, 1.0);
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    gl_FragColor = vec4(color * amount, clamp(amount, 0.0, 1.0));
  }
}
`;

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
const degToRad = (deg) => (deg * Math.PI) / 180;

function createRng(seed = 0) {
  let s = (0x2545f491 ^ Math.floor(9973 * (seed + 0.37))) >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), 61 | t))) ^ (t >>> 14);
    return (t >>> 0) / 0x100000000;
  };
}

function normalizeVec(x, y, z) {
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

function randomSpherePoint(rng) {
  const z = 2 * rng() - 1;
  const phi = rng() * Math.PI * 2;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return [r * Math.cos(phi), r * Math.sin(phi), z];
}

function jitterPoint(pt, amount, rng) {
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-6))) * Math.cos(2 * Math.PI * rng());
  return normalizeVec(pt[0] + normal() * amount, pt[1] + normal() * amount, pt[2] + normal() * amount);
}

function slerpPoint(p1, p2, t) {
  const dot = clamp(p1[0] * p2[0] + p1[1] * p2[1] + p1[2] * p2[2], -1, 1);
  const theta = Math.acos(dot);
  if (theta < 1e-4) return [...p1];
  const sinTheta = Math.sin(theta);
  const w1 = Math.sin((1 - t) * theta) / sinTheta;
  const w2 = Math.sin(t * theta) / sinTheta;
  return normalizeVec(p1[0] * w1 + p2[0] * w2, p1[1] * w1 + p2[1] * w2, p1[2] * w1 + p2[2] * w2);
}

// Global cache for constellation data to eliminate rebuilds and stutter
const constellationCache = new Map();

function getCachedConstellation(nodeCount, maxConn, reachDist, clusterFactor, chordFactor, seed) {
  const key = `${nodeCount}_${maxConn}_${reachDist}_${clusterFactor}_${chordFactor}_${seed}`;
  if (constellationCache.has(key)) {
    return constellationCache.get(key);
  }

  const rng = createRng(seed);
  const clusterCount = Math.max(8, Math.round(nodeCount / 90));
  const clusterCenters = [];
  for (let i = 0; i < clusterCount; i++) {
    clusterCenters.push(randomSpherePoint(rng));
  }

  const clusterEdges = [];
  for (let i = 0; i < clusterCount; i++) {
    const sorted = clusterCenters
      .map((c, idx) => ({
        idx,
        dist: idx === i ? Infinity : 1 - (c[0] * clusterCenters[i][0] + c[1] * clusterCenters[i][1] + c[2] * clusterCenters[i][2]),
      }))
      .sort((a, b) => a.dist - b.dist);
    for (let k = 0; k < 3; k++) {
      const neighbor = sorted[k].idx;
      if (!clusterEdges.some(([a, b]) => (a === i && b === neighbor) || (a === neighbor && b === i))) {
        clusterEdges.push([i, neighbor]);
      }
    }
  }

  const uniformThreshold = 1 - 0.85 * clamp(clusterFactor, 0, 1);
  const points = new Float32Array(3 * nodeCount);

  for (let i = 0; i < nodeCount; i++) {
    let p;
    const r = rng();
    if (r < uniformThreshold) {
      p = randomSpherePoint(rng);
    } else if (r < uniformThreshold + (1 - uniformThreshold) * 0.35) {
      const center = clusterCenters[Math.floor(rng() * clusterCenters.length)];
      p = jitterPoint(center, 0.07 + 0.06 * rng(), rng);
    } else {
      const edge = clusterEdges[Math.floor(rng() * clusterEdges.length)];
      const interp = slerpPoint(clusterCenters[edge[0]], clusterCenters[edge[1]], rng());
      p = jitterPoint(interp, 0.018 + 0.02 * rng(), rng);
    }
    points.set(p, 3 * i);
  }

  const cellSize = Math.max(reachDist, 0.05);
  const grid = new Map();
  const cellKey = (x, y, z) => `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)},${Math.floor(z / cellSize)}`;

  for (let i = 0; i < nodeCount; i++) {
    const key = cellKey(points[3 * i], points[3 * i + 1], points[3 * i + 2]);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(i);
  }

  const degree = new Float32Array(nodeCount);
  const edgeSet = new Set();
  const edges = [];
  const lengths = [];
  const maxDistSq = reachDist * reachDist;
  const neighbors = [];

  const addEdge = (u, v, dist, countDegree = true) => {
    const id = u < v ? u * nodeCount + v : v * nodeCount + u;
    if (!edgeSet.has(id)) {
      edgeSet.add(id);
      edges.push(u, v);
      lengths.push(dist);
      if (countDegree) {
        degree[u] += 1;
        degree[v] += 1;
      }
    }
  };

  for (let i = 0; i < nodeCount; i++) {
    neighbors.length = 0;
    const px = points[3 * i], py = points[3 * i + 1], pz = points[3 * i + 2];
    const cx = Math.floor(px / cellSize), cy = Math.floor(py / cellSize), cz = Math.floor(pz / cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const list = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (list) {
            for (let j = 0; j < list.length; j++) {
              const other = list[j];
              if (other === i) continue;
              const ox = points[3 * other] - px;
              const oy = points[3 * other + 1] - py;
              const oz = points[3 * other + 2] - pz;
              const d2 = ox * ox + oy * oy + oz * oz;
              if (d2 < maxDistSq) {
                neighbors.push({ j: other, d: d2 });
              }
            }
          }
        }
      }
    }

    neighbors.sort((a, b) => a.d - b.d);
    const count = Math.min(maxConn, neighbors.length);
    for (let k = 0; k < count; k++) {
      addEdge(i, neighbors[k].j, Math.sqrt(neighbors[k].d), true);
    }
  }

  const chordCount = Math.round(nodeCount * clamp(chordFactor, 0, 2));
  for (let c = 0; c < chordCount; c++) {
    const u = Math.floor(rng() * nodeCount);
    for (let attempt = 0; attempt < 6; attempt++) {
      const v = Math.floor(rng() * nodeCount);
      if (v === u) continue;
      const d = Math.hypot(points[3 * v] - points[3 * u], points[3 * v + 1] - points[3 * u + 1], points[3 * v + 2] - points[3 * u + 2]);
      if (d > 0.45 && d < 1.6) {
        addEdge(u, v, d, false);
        break;
      }
    }
  }

  const seeds = new Float32Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) seeds[i] = rng();

  const result = { points, degree, seeds, edges: Uint32Array.from(edges), lengths: Float32Array.from(lengths) };
  constellationCache.set(key, result);
  return result;
}

export default function AstralShell({
  colors = ['#7C6BFF', '#FFE6FA'],
  backgroundColor = 'transparent',
  nodes = 2400,
  connections = 4,
  reach = 0.2,
  clustering = 0.85,
  chords = 0.35,
  radius = 0.4,
  originX = 0.5,
  originY = 0.5,
  lineOpacity = 0.7,
  nodeSize = 0.8,
  depthFade = 0.7,
  spin = 1.0,
  tilt = 18,
  interactive = true,
  draggable = true,
  hoverRadius = 0.22,
  hoverBoost = 1.0,
  clickPulse = true,
  pulseSpeed = 1.2,
  seed = 0,
  paused = false,
  className = 'w-full h-full',
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
    let width = rect.width || 500;
    let height = rect.height || 500;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.z = 2.5;

    // Build Constellation geometry with caching
    const data = getCachedConstellation(nodes, connections, reach, clustering, chords, seed);

    const nodesGeom = new THREE.BufferGeometry();
    nodesGeom.setAttribute('position', new THREE.BufferAttribute(data.points, 3));
    nodesGeom.setAttribute('aDegree', new THREE.BufferAttribute(data.degree, 1));
    nodesGeom.setAttribute('aSeed', new THREE.BufferAttribute(data.seeds, 1));
    nodesGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);

    const edgeCount = data.edges.length / 2;
    const linePos = new Float32Array(edgeCount * 6);
    const lineLen = new Float32Array(edgeCount * 2);

    for (let e = 0; e < edgeCount; e++) {
      const u = data.edges[2 * e];
      const v = data.edges[2 * e + 1];
      linePos.set(data.points.subarray(3 * u, 3 * u + 3), 6 * e);
      linePos.set(data.points.subarray(3 * v, 3 * v + 3), 6 * e + 3);
      lineLen[2 * e] = data.lengths[e];
      lineLen[2 * e + 1] = data.lengths[e];
    }

    const linesGeom = new THREE.BufferGeometry();
    linesGeom.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    linesGeom.setAttribute('aLength', new THREE.BufferAttribute(lineLen, 1));
    linesGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);

    const baseCol = new THREE.Color(colors[0] || '#7C6BFF');
    const hotCol = new THREE.Color(colors[1] || '#FFE6FA');

    const uniforms = {
      uTime: { value: 0 },
      uClock: { value: 0 },
      uWorldRadius: { value: 1 },
      uDepthFade: { value: depthFade },
      uPointer: { value: new THREE.Vector2(9, 9) },
      uHover: { value: 0 },
      uHoverRadius: { value: hoverRadius },
      uAspect: { value: width / Math.max(height, 1) },
      uPulseTime: { value: new THREE.Vector4(-99, -99, -99, -99) },
      uPulseOrigin: { value: Array.from({ length: 4 }, () => new THREE.Vector3(0, 0, 1)) },
      uPulseSpeed: { value: pulseSpeed },
      uSize: { value: 3.2 * nodeSize },
      uPixelRatio: { value: dpr },
      uReach: { value: reach },
      uLineOpacity: { value: lineOpacity },
      uLineGain: { value: 1 + (Math.max(dpr, 1) - 1) * 0.85 },
      uBase: { value: new THREE.Vector3(baseCol.r, baseCol.g, baseCol.b) },
      uHot: { value: new THREE.Vector3(hotCol.r, hotCol.g, hotCol.b) },
      uInk: { value: 0 },
    };

    const linesMat = new THREE.ShaderMaterial({
      vertexShader: LINES_VERT,
      fragmentShader: LINES_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });

    const pointsMat = new THREE.ShaderMaterial({
      vertexShader: POINTS_VERT,
      fragmentShader: POINTS_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });

    const linesMesh = new THREE.LineSegments(linesGeom, linesMat);
    linesMesh.frustumCulled = false;

    const pointsMesh = new THREE.Points(nodesGeom, pointsMat);
    pointsMesh.frustumCulled = false;

    const group = new THREE.Group();
    group.add(linesMesh);
    group.add(pointsMesh);
    scene.add(group);

    // State & smooth interaction tracking
    const state = {
      time: 0,
      clock: 0,
      quaternion: new THREE.Quaternion(),
      spinVelocity: new THREE.Vector2(0, 0),
      hover: 0,
      pointerX: 9,
      pointerY: 9,
      targetPointerX: 9,
      targetPointerY: 9,
      isHovered: false,
      presses: 0,
      pulseTimes: [-99, -99, -99, -99],
      pulseOrigins: Array.from({ length: 4 }, () => new THREE.Vector3(0, 0, 1)),
      nextPulse: 0,
      lean: new THREE.Vector2(),
    };

    const temp = {
      axis: new THREE.Vector3(),
      turn: new THREE.Quaternion(),
      base: new THREE.Quaternion(),
      point: new THREE.Vector3(),
      euler: new THREE.Euler(),
      raycaster: new THREE.Raycaster(),
      ndc: new THREE.Vector2(),
      sphere: new THREE.Sphere(),
      inverse: new THREE.Quaternion(),
      autoAxis: new THREE.Vector3(0.18, 1, 0.08).normalize(),
    };

    let isPointerDown = false;
    let lastClientX = 0;
    let lastClientY = 0;
    let lastMoveTime = 0;
    let velX = 0;
    let velY = 0;
    let pointerTravel = 0;
    let pressNDC = { x: 0, y: 0 };
    let triggerPulse = false;

    const onPointerEnter = () => {
      rect = container.getBoundingClientRect();
      if (!isPointerDown) {
        state.isHovered = true;
      }
    };

    const onPointerDown = (e) => {
      rect = container.getBoundingClientRect();
      isPointerDown = true;
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      lastMoveTime = performance.now();
      pointerTravel = 0;
      velX = 0;
      velY = 0;

      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}

      const nx = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const ny = 1 - (e.clientY - rect.top) / Math.max(rect.height, 1);
      state.targetPointerX = nx;
      state.targetPointerY = ny;

      pressNDC.x = 2 * nx - 1;
      pressNDC.y = 2 * ny - 1;
    };

    const onPointerMove = (e) => {
      const nx = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const ny = 1 - (e.clientY - rect.top) / Math.max(rect.height, 1);
      state.targetPointerX = nx;
      state.targetPointerY = ny;

      if (!isPointerDown) {
        state.isHovered = true;
      } else if (draggable) {
        const dx = e.clientX - lastClientX;
        const dy = e.clientY - lastClientY;
        lastClientX = e.clientX;
        lastClientY = e.clientY;

        pointerTravel += Math.hypot(dx, dy);

        const now = performance.now();
        const dtMove = Math.max((now - lastMoveTime) / 1000, 0.001);
        lastMoveTime = now;

        const rotSensitivity = 3.2 / Math.max(rect.width, rect.height, 200);
        const rotY = dx * rotSensitivity;
        const rotX = dy * rotSensitivity;

        temp.axis.set(0, 1, 0);
        temp.turn.setFromAxisAngle(temp.axis, rotY);
        state.quaternion.premultiply(temp.turn);

        temp.axis.set(1, 0, 0);
        temp.turn.setFromAxisAngle(temp.axis, rotX);
        state.quaternion.premultiply(temp.turn);

        const instVx = rotY / dtMove;
        const instVy = rotX / dtMove;
        velX = velX * 0.35 + instVx * 0.65;
        velY = velY * 0.35 + instVy * 0.65;
      }
    };

    const onPointerUp = (e) => {
      try {
        if (e && e.pointerId && canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}

      if (isPointerDown) {
        if (pointerTravel < 6 && clickPulse) {
          triggerPulse = true;
          state.spinVelocity.set(0, 0);
        } else {
          const now = performance.now();
          if (now - lastMoveTime < 65) {
            state.spinVelocity.set(clamp(velX, -4, 4), clamp(velY, -4, 4));
          } else {
            state.spinVelocity.set(0, 0);
          }
        }
      }
      isPointerDown = false;
    };

    const onPointerCancel = (e) => {
      try {
        if (e && e.pointerId && canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      isPointerDown = false;
      state.spinVelocity.set(0, 0);
    };

    const onPointerLeave = () => {
      if (!isPointerDown) {
        state.isHovered = false;
      }
    };

    if (interactive) {
      canvas.addEventListener('pointerenter', onPointerEnter);
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove, { passive: true });
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerCancel);
      canvas.addEventListener('pointerleave', onPointerLeave);
      window.addEventListener('pointerup', onPointerUp);
    }

    let lastTime = performance.now();
    let animId = null;

    const animate = (now) => {
      animId = requestAnimationFrame(animate);

      const dt = Math.min(Math.max((now - lastTime) / 1000, 0), 0.033);
      lastTime = now;

      if (!paused) {
        state.time += dt;
      }
      state.clock += dt;

      const aspect = width / Math.max(height, 1);
      const halfFov = degToRad(35) / 2;
      const vHeight = 2 * camera.position.z * Math.tan(halfFov);
      const vWidth = vHeight * aspect;
      const baseDim = aspect < 1.0 ? vWidth : vHeight;
      const globeScale = clamp(radius, 0.05, 1.2) * baseDim;

      group.position.set(
        (clamp(originX, -0.5, 1.5) - 0.5) * vHeight * aspect,
        (clamp(originY, -0.5, 1.5) - 0.5) * vHeight,
        0
      );
      group.scale.setScalar(globeScale);

      // Inertia momentum and ambient auto-spin
      if (!isPointerDown) {
        if (state.spinVelocity.lengthSq() > 1e-5) {
          const decay = Math.exp(-2.8 * dt);
          state.spinVelocity.multiplyScalar(decay);

          temp.axis.set(0, 1, 0);
          temp.turn.setFromAxisAngle(temp.axis, state.spinVelocity.x * dt);
          state.quaternion.premultiply(temp.turn);

          temp.axis.set(1, 0, 0);
          temp.turn.setFromAxisAngle(temp.axis, state.spinVelocity.y * dt);
          state.quaternion.premultiply(temp.turn);
        } else if (!paused) {
          const autoSpinRate = 0.12 * clamp(spin, -4, 4);
          temp.turn.setFromAxisAngle(temp.autoAxis, autoSpinRate * dt);
          state.quaternion.premultiply(temp.turn);
        }
      }
      state.quaternion.normalize();

      // Smooth lean and hover follow: only active during hover, never during drag
      const isHovered = interactive && state.isHovered && !isPointerDown;
      const targetLeanX = isHovered ? (state.targetPointerX - 0.5) * 2 : 0;
      const targetLeanY = isHovered ? (state.targetPointerY - 0.5) * 2 : 0;
      const leanRate = 1 - Math.exp(-4.0 * dt);
      state.lean.x += (targetLeanX - state.lean.x) * leanRate;
      state.lean.y += (targetLeanY - state.lean.y) * leanRate;

      temp.euler.set(degToRad(clamp(tilt, -90, 90)) - 0.12 * state.lean.y, 0.16 * state.lean.x, 0);
      temp.base.setFromEuler(temp.euler);
      group.quaternion.copy(temp.base).multiply(state.quaternion);

      const targetHover = isHovered ? 1 : 0;
      state.hover += (targetHover - state.hover) * (1 - Math.exp(-6 * dt));

      if (isHovered) {
        const followRate = 1 - Math.exp(-12 * dt);
        if (state.pointerX > 5) {
          state.pointerX = state.targetPointerX;
          state.pointerY = state.targetPointerY;
        }
        state.pointerX += (state.targetPointerX - state.pointerX) * followRate;
        state.pointerY += (state.targetPointerY - state.pointerY) * followRate;
      } else {
        if (state.hover < 0.002) {
          state.pointerX = 9;
          state.pointerY = 9;
        }
      }

      // Process click pulse
      if (triggerPulse) {
        triggerPulse = false;
        temp.ndc.set(pressNDC.x, pressNDC.y);
        temp.raycaster.setFromCamera(temp.ndc, camera);
        temp.sphere.set(group.position, globeScale);
        const ray = temp.raycaster.ray;
        if (!ray.intersectSphere(temp.sphere, temp.point)) {
          ray.closestPointToPoint(group.position, temp.point);
        }
        temp.point.sub(group.position).normalize();
        temp.inverse.copy(group.quaternion).invert();
        temp.point.applyQuaternion(temp.inverse);

        const slot = state.nextPulse;
        state.nextPulse = (state.nextPulse + 1) % 4;
        state.pulseOrigins[slot].copy(temp.point);
        state.pulseTimes[slot] = state.clock;
      }

      // Update uniforms
      const pSpeed = clamp(pulseSpeed, 0.1, 5);
      for (let i = 0; i < 4; i++) {
        uniforms.uPulseOrigin.value[i].copy(state.pulseOrigins[i]);
      }
      uniforms.uTime.value = state.time;
      uniforms.uClock.value = state.clock;
      uniforms.uWorldRadius.value = globeScale;
      uniforms.uDepthFade.value = clamp(depthFade, 0, 1);
      uniforms.uPointer.value.set(2 * state.pointerX - 1, 2 * state.pointerY - 1);
      uniforms.uHover.value = state.hover * clamp(hoverBoost, 0, 3);
      uniforms.uHoverRadius.value = clamp(hoverRadius, 0.02, 1);
      uniforms.uAspect.value = aspect;
      uniforms.uPulseTime.value.set(
        state.pulseTimes[0],
        state.pulseTimes[1],
        state.pulseTimes[2],
        state.pulseTimes[3]
      );
      uniforms.uPulseSpeed.value = pSpeed;

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    // Debounced and non-thrashing resize handler
    let resizeTimer = null;
    const handleResize = () => {
      if (!container) return;
      rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w > 0 && h > 0 && (w !== width || h !== height)) {
        width = w;
        height = h;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        uniforms.uAspect.value = w / h;
      }
    };

    const ro = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 60);
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      if (interactive) {
        canvas.removeEventListener('pointerenter', onPointerEnter);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerCancel);
        canvas.removeEventListener('pointerleave', onPointerLeave);
        window.removeEventListener('pointerup', onPointerUp);
      }
      nodesGeom.dispose();
      linesGeom.dispose();
      pointsMat.dispose();
      linesMat.dispose();
      renderer.dispose();
    };
  }, [
    colors[0],
    colors[1],
    nodes,
    connections,
    reach,
    clustering,
    chords,
    radius,
    originX,
    originY,
    lineOpacity,
    nodeSize,
    depthFade,
    spin,
    tilt,
    interactive,
    draggable,
    hoverRadius,
    hoverBoost,
    clickPulse,
    pulseSpeed,
    seed,
    paused,
  ]);

  return (
    <div ref={containerRef} className={`relative overflow-visible select-none ${className}`} style={style}>
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing touch-none" />
      {children && <div className="absolute inset-0 pointer-events-none z-10">{children}</div>}
    </div>
  );
}
