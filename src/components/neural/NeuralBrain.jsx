import {useFrame, useThree} from "@react-three/fiber";
import {useMemo, useRef} from "react";
import * as THREE from "three";
import {buildBrain, mulberry32, randomDir} from "./brainGeometry";

// The 3D pieces of the one brain scene (BrainCanvas.jsx). They read their
// animation inputs from a plain mutable `look` object ({intensity, dim, gain,
// light}) every frame, so GSAP can drive them without a React render.
//
// `light` (1 = the white hero, 0 = the midnight story) blends two renderings
// in one premultiplied blend (ONE, ONE_MINUS_SRC_ALPHA): output alpha a·light
// is plain alpha blending at 1, so blue reads on white, and pure additive
// light at 0. Scrubbing it never pops a material switch.

const BLUE = new THREE.Color("#60a5fa");
const DEEP = new THREE.Color("#1d4ed8");
const CYAN = new THREE.Color("#67e8f9");
// Light palette: electric-blue body, deeper blue at the back, cyan kept for
// a few highlighted nodes.
const L_BLUE = new THREE.Color("#168bff");
const L_DEEP = new THREE.Color("#1550c8");
const L_CYAN = new THREE.Color("#19b8f0");

const PREMULTIPLIED = {
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
};

const POINT_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uIntensity;
  uniform float uDim;
  uniform float uGain;
  uniform float uLight;
  uniform vec3 uDeep;
  uniform vec3 uCyan;
  uniform vec3 uLBlue;
  uniform vec3 uLDeep;
  uniform vec3 uLCyan;
  attribute float aSeed;
  attribute float aSize;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    // Each particle breathes along its own radius, out of phase with the rest.
    vec3 p = position + normalize(position) * sin(uTime * 0.7 + aSeed * 6.2831) * 0.014;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.5 + 0.5 * sin(uTime * (0.5 + aSeed * 1.5) + aSeed * 40.0);
    float node = step(2.0, aSize);
    // On white the nodes flare at half strength, so they read as the same
    // glinting particles as at night without blooming into blobs.
    float flare = node * mix(1.0, 0.5, uLight);
    // Capped so a close camera gets finer detail, not bigger blobs.
    gl_PointSize = min(aSize * uPixelRatio * (30.0 + flare * twinkle * 24.0 * uIntensity) / -mv.z, (3.0 + node * mix(5.0, 3.0, uLight)) * uPixelRatio);
    float depth = smoothstep(-9.0, -3.5, mv.z);
    vAlpha = (0.35 + 0.65 * mix(twinkle, 1.0, 0.4)) * (0.3 + 0.7 * depth) * uDim * uGain;
    vec3 night = mix(uDeep, uCyan, clamp(aSeed * 0.5 + position.y * 0.35 + 0.25 + node * 0.45 * uIntensity, 0.0, 1.0));
    vec3 day = mix(mix(uLDeep, uLBlue, depth * 0.7 + aSeed * 0.3), uLCyan, node * step(0.7, aSeed) * 0.7 * uIntensity);
    vColor = mix(night, day, uLight);
  }
`;

const POINT_FRAGMENT = /* glsl */ `
  uniform float uLight;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a * vAlpha;
    // On white, overlapping dots would stack into a solid mass: cap them.
    a = mix(a, min(a * 0.85, 0.85), uLight);
    gl_FragColor = vec4(vColor * a, a * uLight);
  }
`;

const LINE_VERTEX = /* glsl */ `
  attribute float aT;
  attribute float aPhase;
  varying float vT;
  varying float vPhase;
  void main() {
    vT = aT;
    vPhase = aPhase;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Filaments shimmer faintly; a third of them carry a slow pulse end to end.
const LINE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uDim;
  uniform float uGain;
  uniform float uLight;
  uniform vec3 uLine;
  uniform vec3 uCyan;
  uniform vec3 uLDeep;
  uniform vec3 uLCyan;
  varying float vT;
  varying float vPhase;
  void main() {
    float shimmer = 0.5 + 0.5 * sin(uTime * 1.3 + vPhase * 50.0 + vT * 6.0);
    float head = fract(uTime * 0.2 + vPhase * 7.0);
    float carries = step(0.66, fract(vPhase * 13.7));
    float pulse = carries * smoothstep(0.16, 0.0, abs(vT - head)) * uIntensity;
    // Fainter on white, where every crossing line would otherwise show.
    float alpha = (0.06 + 0.08 * shimmer) * uDim * uGain * mix(1.0, 0.2, uLight) + pulse * mix(0.85, 0.35, uLight);
    vec3 color = mix(mix(uLine, uCyan, pulse), mix(uLDeep, uLCyan, pulse), uLight);
    gl_FragColor = vec4(color * alpha, alpha * uLight);
  }
`;

const DEFAULT_LOOK = {intensity: 0.7, dim: 1, gain: 1, light: 0};

// look.gain: particle brightness. Additive particles pile up into white where
// they overlap, so the full-screen story keeps each one faint.
export const NeuralBrain = ({count, look = DEFAULT_LOOK}) => {
  const {gl} = useThree();
  const data = useMemo(() => buildBrain(count), [count]);
  const uniforms = useMemo(
    () => ({
      uTime: {value: 0},
      uPixelRatio: {value: gl.getPixelRatio()},
      uIntensity: {value: look.intensity},
      uDim: {value: look.dim},
      uGain: {value: look.gain},
      uLight: {value: look.light},
      uDeep: {value: DEEP},
      uCyan: {value: CYAN},
      uLine: {value: BLUE},
      uLBlue: {value: L_BLUE},
      uLDeep: {value: L_DEEP},
      uLCyan: {value: L_CYAN},
    }),
    [gl, look],
  );

  // Both materials share `uniforms`, so one write drives them.
  const material = useRef(null);
  useFrame((state) => {
    const u = material.current.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uIntensity.value = look.intensity;
    u.uDim.value = look.dim;
    u.uGain.value = look.gain;
    u.uLight.value = look.light;
  });

  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[data.seeds, 1]} />
          <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={POINT_VERTEX}
          fragmentShader={POINT_FRAGMENT}
          {...PREMULTIPLIED}
          transparent
          depthWrite={false}
        />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.linePositions, 3]} />
          <bufferAttribute attach="attributes-aT" args={[data.lineT, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[data.linePhase, 1]} />
        </bufferGeometry>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={LINE_VERTEX}
          fragmentShader={LINE_FRAGMENT}
          {...PREMULTIPLIED}
          transparent
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
};

const MOTE_VERTEX = /* glsl */ `
  uniform float uSize;
  uniform float uScale;
  attribute float aSeed;
  varying float vSeed;
  void main() {
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.6 + 0.8 * aSeed) * uScale / -mv.z;
  }
`;

// Each mote has its own brightness and a slow breath, so the layer reads as
// depth rather than an even sprinkle.
const MOTE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uLightOpacity;
  uniform float uLight;
  uniform vec3 uColor;
  uniform vec3 uLColor;
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float breath = 0.65 + 0.35 * sin(uTime * (0.3 + vSeed * 0.4) + vSeed * 30.0);
    float a = smoothstep(0.5, 0.1, d) * (0.25 + 0.75 * fract(vSeed * 7.3)) * breath;
    a *= mix(uOpacity, uLightOpacity, uLight);
    gl_FragColor = vec4(mix(uColor, uLColor, uLight) * a, a * uLight);
  }
`;

// A shell of soft points: stars far out, motes near the brain. `drift` sets
// how strongly the layer follows the pointer, which separates the depths.
// opacity is for the midnight story, lightOpacity for the white hero.
export const Particles = ({count, inner, outer, size, opacity, lightOpacity = 0, drift, seed, color = BLUE, lightColor = L_BLUE, look = DEFAULT_LOOK}) => {
  const ref = useRef(null);
  const {positions, seeds} = useMemo(() => {
    const rand = mulberry32(seed);
    const u = [0, 0, 0];
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      randomDir(rand, u);
      const r = inner + rand() * (outer - inner);
      positions.set([u[0] * r, u[1] * r * 0.8, u[2] * r], i * 3);
      seeds[i] = rand();
    }
    return {positions, seeds};
  }, [count, inner, outer, seed]);
  const material = useRef(null);
  const uniforms = useMemo(() => ({
    uTime: {value: 0},
    uSize: {value: size},
    uScale: {value: 1},
    uOpacity: {value: opacity},
    uLightOpacity: {value: lightOpacity},
    uLight: {value: look.light},
    uColor: {value: new THREE.Color(color)},
    uLColor: {value: new THREE.Color(lightColor)},
  }), [size, opacity, lightOpacity, color, lightColor, look]);

  useFrame((state, delta) => {
    const group = ref.current;
    group.rotation.y += delta * 0.015 * drift;
    // 3% per 60 Hz frame, scaled by delta so 120 Hz screens follow at the same speed.
    const follow = 1 - Math.pow(0.97, delta * 60);
    group.position.x = THREE.MathUtils.lerp(group.position.x, state.pointer.x * 0.25 * drift, follow);
    group.position.y = THREE.MathUtils.lerp(group.position.y, state.pointer.y * 0.15 * drift, follow);
    const u = material.current.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    // What sizeAttenuation uses: world size to pixels at unit depth.
    u.uScale.value = (state.size.height * state.viewport.dpr) / 2;
    u.uLight.value = look.light;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={MOTE_VERTEX}
        fragmentShader={MOTE_FRAGMENT}
        {...PREMULTIPLIED}
        transparent
        depthWrite={false}
      />
    </points>
  );
};
