import {useFrame, useThree} from "@react-three/fiber";
import {useEffect, useMemo, useRef} from "react";
import * as THREE from "three";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer.js";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass.js";
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {OutputPass} from "three/examples/jsm/postprocessing/OutputPass.js";
import {buildBrain, mulberry32, randomDir} from "./brainGeometry";

// The 3D pieces shared by the hero and the scroll story. They read their
// animation inputs from a plain mutable `look` object ({intensity, dim}) every
// frame, so GSAP can drive them without a React render.

export const BLUE = new THREE.Color("#60a5fa");
const DEEP = new THREE.Color("#1d4ed8");
const CYAN = new THREE.Color("#67e8f9");

const POINT_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uIntensity;
  uniform float uDim;
  uniform float uGain;
  uniform vec3 uDeep;
  uniform vec3 uCyan;
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
    // Capped so a close camera gets finer detail, not bigger blobs.
    gl_PointSize = min(aSize * uPixelRatio * (30.0 + node * twinkle * 24.0 * uIntensity) / -mv.z, (3.0 + node * 5.0) * uPixelRatio);
    float depth = smoothstep(-9.0, -3.5, mv.z);
    vAlpha = (0.35 + 0.65 * mix(twinkle, 1.0, 0.4)) * (0.3 + 0.7 * depth) * uDim * uGain;
    vColor = mix(uDeep, uCyan, clamp(aSeed * 0.5 + position.y * 0.35 + 0.25 + node * 0.45 * uIntensity, 0.0, 1.0));
  }
`;

const POINT_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * vAlpha);
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
  uniform vec3 uLine;
  uniform vec3 uCyan;
  varying float vT;
  varying float vPhase;
  void main() {
    float shimmer = 0.5 + 0.5 * sin(uTime * 1.3 + vPhase * 50.0 + vT * 6.0);
    float head = fract(uTime * 0.2 + vPhase * 7.0);
    float carries = step(0.66, fract(vPhase * 13.7));
    float pulse = carries * smoothstep(0.16, 0.0, abs(vT - head)) * uIntensity;
    float alpha = (0.06 + 0.08 * shimmer) * uDim * uGain + pulse * 0.85;
    gl_FragColor = vec4(mix(uLine, uCyan, pulse), alpha);
  }
`;

const DEFAULT_LOOK = {intensity: 0.7, dim: 1};

// additive: for a dark backdrop, where the particles should add light; plain
// alpha blending keeps them visible against white.
// gain: particle brightness. Additive particles pile up into white where they
// overlap, so the full-screen story keeps each one faint.
export const NeuralBrain = ({count, additive = false, gain = additive ? 0.6 : 1, look = DEFAULT_LOOK}) => {
  const {gl} = useThree();
  const data = useMemo(() => buildBrain(count), [count]);
  const uniforms = useMemo(
    () => ({
      uTime: {value: 0},
      uPixelRatio: {value: gl.getPixelRatio()},
      uIntensity: {value: look.intensity},
      uDim: {value: look.dim},
      uGain: {value: gain},
      uDeep: {value: DEEP},
      uCyan: {value: CYAN},
      uLine: {value: BLUE},
    }),
    [gl, look, gain],
  );
  const blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;

  // Both materials share `uniforms`, so one write drives them.
  const material = useRef(null);
  useFrame((state) => {
    const u = material.current.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uIntensity.value = look.intensity;
    u.uDim.value = look.dim;
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
          blending={blending}
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
          blending={blending}
          transparent
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
};

// A shell of soft points: stars far out, motes near the brain. `drift` sets
// how strongly the layer follows the pointer, which separates the depths.
export const Particles = ({count, inner, outer, size, opacity, drift, seed, color = BLUE, additive = false}) => {
  const ref = useRef(null);
  const positions = useMemo(() => {
    const rand = mulberry32(seed);
    const u = [0, 0, 0];
    const array = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      randomDir(rand, u);
      const r = inner + rand() * (outer - inner);
      array.set([u[0] * r, u[1] * r * 0.8, u[2] * r], i * 3);
    }
    return array;
  }, [count, inner, outer, seed]);

  useFrame((state, delta) => {
    const group = ref.current;
    group.rotation.y += delta * 0.015 * drift;
    group.position.x = THREE.MathUtils.lerp(group.position.x, state.pointer.x * 0.25 * drift, 0.03);
    group.position.y = THREE.MathUtils.lerp(group.position.y, state.pointer.y * 0.15 * drift, 0.03);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
};

// Restrained bloom. Taking over the render (priority 1) is how R3F hands the
// frame to a composer; only mounted on desktops that can afford it.
export const Bloom = ({strength = 0.55, radius = 0.5, threshold = 0.18}) => {
  const {gl, scene, camera, size} = useThree();
  const composer = useMemo(() => {
    const result = new EffectComposer(gl);
    result.addPass(new RenderPass(scene, camera));
    result.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), strength, radius, threshold));
    result.addPass(new OutputPass());
    return result;
  }, [gl, scene, camera, strength, radius, threshold]);

  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size]);

  useEffect(() => () => composer.dispose(), [composer]);

  useFrame((_, delta) => composer.render(delta), 1);
  return null;
};
