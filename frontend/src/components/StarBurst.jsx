import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uSpeed;
  uniform float uDensity;
  uniform float uStarCount;
  uniform vec3 uColor;
  uniform float uCenterX;
  uniform float uCenterY;
  uniform float uStarSize;
  uniform float uBrightness;
  uniform float uOpacity;
  uniform float uFlowerIntensity;
  uniform float uTwinkleSpeed;
  uniform float uWobbleAmount;
  uniform float uInnerLayerIntensity;
  uniform float uOuterLayerIntensity;
  uniform float uFadeHeight;

  varying vec2 vUv;

  const float PI = 3.14159265359;

  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float stars(vec2 uv, float radialOffset, float amount, float intensity) {
    float t = uTime * uSpeed;
    float rad = atan(uv.y, uv.x);
    float r = log(length(uv) + radialOffset) * amount - t;

    vec2 g = vec2(rad / PI * 0.5 + 0.5, r);
    g *= vec2(uStarCount, 1.0);

    vec2 s = vec2(1.0, 1.0);
    vec2 id = floor(g / s + 0.5);
    vec2 o = sign(g - s * id);

    float min_d = 100.0;
    for (int i = 0; i < 2; ++i) {
        for (int j = 0; j < 2; ++j) {
            vec2 nid = id + o * vec2(float(i), float(j));
            vec2 nh = hash22(nid) * 100.0;
            vec2 n = g - s * nid;

            float t2 = t * uTwinkleSpeed;
            vec2 np = vec2(cos(nh.x + t2), sin(nh.y + t2)) * uWobbleAmount;

            vec2 diff = n - np;
            diff.x *= (200.0 / uStarCount);

            float dt = dot(diff, diff);
            if (dt < min_d) {
                min_d = dt;
            }
        }
    }

    float d = sqrt(min_d);
    return (uStarSize * 0.05) / d * intensity;
  }

  float curve_mask(vec2 uv) {
    float x = uv.x;
    float y = 0.05 * x * x + 0.05;
    return smoothstep(-0.1, 0.1, abs(uv.y) - y);
  }

  float flower(vec2 uv) {
    float fade_out = smoothstep(1.5, 0.0, length(uv));
    float flower = smoothstep(1.2, 0.0, abs(sin(atan(uv.y * 4.0, uv.x) * 3.0)) * 0.7);
    return flower * fade_out * uFlowerIntensity;
  }

  void main() {
    vec2 uv = (vUv * uResolution - 0.5 * uResolution) / uResolution.y;
    vec2 centeredUv = vUv * 2.0 - 1.0;
    centeredUv.x *= uResolution.x / uResolution.y;

    vec2 centerOffset = vec2((uCenterX - 0.5) * 2.0, (uCenterY - 0.5) * 2.0);
    centerOffset.x *= uResolution.x / uResolution.y;

    vec2 pos = centeredUv - centerOffset;
    pos.y += 1.0;

    float s = stars(pos, 1.0, 20.0 * uDensity, uInnerLayerIntensity) * 0.5;
    float l = stars(pos, 5.0, 30.0 * uDensity, uOuterLayerIntensity) * 0.5;

    float f = flower(pos);
    float m = curve_mask(pos);

    float brightness = s + l + f;
    brightness *= m;

    float gradient = smoothstep(uFadeHeight, 0.0, abs(pos.y));
    brightness *= gradient;

    brightness *= uBrightness;

    float alpha = clamp(brightness, 0.0, 1.0) * uOpacity;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

/**
 * StarBurst Component (React Bits Pro - Starter Tier)
 * A burst of stars streaming out from a point with customizable glow, speed, bloom, and twinkle.
 */
const StarBurst = ({
  speed = 1,
  density = 0.5,
  starCount = 100,
  color = '#5227ff',
  centerX = 0.5,
  centerY = 0.5,
  starSize = 0.3,
  brightness = 1,
  opacity = 1,
  flowerIntensity = 0.5,
  twinkleSpeed = 0.2,
  wobbleAmount = 1,
  innerLayerIntensity = 1,
  outerLayerIntensity = 1.5,
  fadeHeight = 2.5,
  className = '',
  style = {}
}) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const materialRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 200;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uSpeed: { value: speed },
        uDensity: { value: density },
        uStarCount: { value: starCount },
        uColor: { value: new THREE.Color(color) },
        uCenterX: { value: centerX },
        uCenterY: { value: centerY },
        uStarSize: { value: starSize },
        uBrightness: { value: brightness },
        uOpacity: { value: opacity },
        uFlowerIntensity: { value: flowerIntensity },
        uTwinkleSpeed: { value: twinkleSpeed },
        uWobbleAmount: { value: wobbleAmount },
        uInnerLayerIntensity: { value: innerLayerIntensity },
        uOuterLayerIntensity: { value: outerLayerIntensity },
        uFadeHeight: { value: fadeHeight }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    materialRef.current = material;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const startTime = performance.now();
    const animate = () => {
      const elapsed = (performance.now() - startTime) * 0.001;
      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = elapsed;
      }
      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && rendererRef.current && materialRef.current) {
          rendererRef.current.setSize(w, h);
          materialRef.current.uniforms.uResolution.value.set(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      resizeObserver.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!materialRef.current) return;
    const m = materialRef.current;
    m.uniforms.uSpeed.value = speed;
    m.uniforms.uDensity.value = density;
    m.uniforms.uStarCount.value = starCount;
    m.uniforms.uColor.value.set(color);
    m.uniforms.uCenterX.value = centerX;
    m.uniforms.uCenterY.value = centerY;
    m.uniforms.uStarSize.value = starSize;
    m.uniforms.uBrightness.value = brightness;
    m.uniforms.uOpacity.value = opacity;
    m.uniforms.uFlowerIntensity.value = flowerIntensity;
    m.uniforms.uTwinkleSpeed.value = twinkleSpeed;
    m.uniforms.uWobbleAmount.value = wobbleAmount;
    m.uniforms.uInnerLayerIntensity.value = innerLayerIntensity;
    m.uniforms.uOuterLayerIntensity.value = outerLayerIntensity;
    m.uniforms.uFadeHeight.value = fadeHeight;
  }, [
    speed,
    density,
    starCount,
    color,
    centerX,
    centerY,
    starSize,
    brightness,
    opacity,
    flowerIntensity,
    twinkleSpeed,
    wobbleAmount,
    innerLayerIntensity,
    outerLayerIntensity,
    fadeHeight
  ]);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full overflow-hidden bg-transparent', className)}
      style={{ minHeight: 'inherit', ...style }}
    />
  );
};

export default StarBurst;
export { StarBurst };
