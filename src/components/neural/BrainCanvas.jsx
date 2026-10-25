import {Canvas, useFrame, useThree} from "@react-three/fiber";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import * as THREE from "three";
import {NeuralBrain, Particles} from "./NeuralBrain";
import {FOV} from "./flow";

// The one brain scene. The hero, the shared cinematic stage and the static
// story all render this, driven by a `look` object, so the brain has one
// silhouette, palette, density, camera and motion everywhere.

const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

const CORE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The atmosphere behind the brain. On the light hero (uLight 1) a pale
// blue-cyan haze that fades into the white page; in the story (0) a midnight
// core that melts into the backdrop. It travels and scales with the brain,
// so the glow stays tied to it at every scroll position.
const CORE_FRAGMENT = /* glsl */ `
  uniform float uCore;
  uniform float uLight;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    vec4 c0 = vec4(10.0, 28.0, 78.0, 230.0) / 255.0;
    vec4 c1 = vec4(14.0, 40.0, 104.0, 190.0) / 255.0;
    vec4 c2 = vec4(29.0, 78.0, 216.0, 40.0) / 255.0;
    vec4 night = d < 0.45 ? mix(c0, c1, d / 0.45)
      : d < 0.72 ? mix(c1, c2, (d - 0.45) / 0.27)
      : mix(c2, vec4(c2.rgb, 0.0), clamp((d - 0.72) / 0.28, 0.0, 1.0));
    // #E5F8FF at the heart, #EAF2FF around it, gone well before the edge.
    vec3 day = mix(vec3(229.0, 248.0, 255.0), vec3(234.0, 242.0, 255.0), smoothstep(0.0, 0.5, d)) / 255.0;
    float dayA = 0.9 * pow(1.0 - smoothstep(0.0, 0.95, d), 1.6);
    // Cross-fade by coverage, not by colour: each layer thins out on its own,
    // so half-way never mixes navy and white into a grey smudge.
    float wDay = dayA * uLight;
    float wNight = night.a * (1.0 - uLight) * (1.0 - uLight);
    float a = max(wDay, wNight);
    vec3 rgb = (day * wDay + night.rgb * wNight) / max(wDay + wNight, 1e-4);
    gl_FragColor = vec4(rgb, a * uCore);
  }
`;

const Rig = ({look, count, still, phone}) => {
  const holder = useRef(null);
  const brain = useRef(null);
  const core = useRef(null);
  const coreUniforms = useMemo(() => ({uCore: {value: 1}, uLight: {value: 1}}), []);
  const coreMaterial = useRef(null);

  useFrame((state, delta) => {
    const {camera, size} = state;
    const t = state.clock.elapsedTime;
    const k = still ? 1 : 1 - Math.exp(-delta * 5);
    // Pointer parallax only where there is a pointer worth following.
    const px = phone ? 0 : state.pointer.x;
    const py = phone ? 0 : state.pointer.y;

    // Camera on a circle around the origin; the pointer nudges it.
    const cx = Math.sin(look.orbit) * look.camZ + px * 0.3;
    const cz = Math.cos(look.orbit) * look.camZ;
    camera.position.x += (cx - camera.position.x) * k;
    camera.position.y += (py * 0.2 - camera.position.y) * k;
    camera.position.z += (cz - camera.position.z) * k;
    camera.lookAt(0, 0, 0);

    // Screen fractions to world units at the brain's depth, along the
    // camera's right and up vectors.
    const viewH = 2 * TAN * look.camZ;
    const x = look.sx * viewH * (size.width / size.height);
    const y = look.sy * viewH;
    const h = holder.current;
    h.position.x += (Math.cos(look.orbit) * x - h.position.x) * k;
    h.position.y += (y - h.position.y) * k;
    h.position.z += (-Math.sin(look.orbit) * x - h.position.z) * k;
    h.scale.setScalar(h.scale.x + (look.scale - h.scale.x) * k);

    // Slow organic sway on one clock; `turn` is the scroll-linked part.
    brain.current.rotation.y = -0.4 + Math.sin(t * 0.09) * 0.4 + look.turn;
    brain.current.rotation.x = 0.12 + Math.sin(t * 0.07) * 0.05;
    brain.current.position.y = Math.sin(t * 0.4) * 0.04;
    core.current.quaternion.copy(camera.quaternion);
    const u = coreMaterial.current.uniforms;
    u.uCore.value = look.core;
    u.uLight.value = look.light;
  });

  return (
    <group ref={holder}>
      <mesh ref={core} renderOrder={-1}>
        <planeGeometry args={[3.8, 3.8]} />
        <shaderMaterial ref={coreMaterial} uniforms={coreUniforms} vertexShader={CORE_VERTEX} fragmentShader={CORE_FRAGMENT} transparent depthWrite={false} />
      </mesh>
      {/* Motes travel with the brain, so they never drift over the copy.
          Sparse and tuned apart from the brain, which keeps its full density. */}
      <Particles count={phone ? 40 : 90} inner={2.1} outer={3.4} size={0.03} opacity={0.4} lightOpacity={0.35} drift={0.7} seed={11} look={look} />
      <group ref={brain}>
        <NeuralBrain count={count} look={look} />
      </group>
      <Particles count={phone ? 6 : 14} inner={1.7} outer={2.4} size={0.055} opacity={0.5} lightOpacity={0.4} drift={1.8} seed={29} color="#a5f3fc" lightColor="#19b8f0" look={look} />
    </group>
  );
};

// three.js compiles every shader program synchronously on the first frame it
// draws: ~0.5 s of frozen main thread on a throttled phone (Lighthouse trace),
// landing right as the page becomes interactive. compileAsync builds them up
// front through KHR_parallel_shader_compile, off the main thread where the
// driver supports it, and the render loop only starts once they are ready.
const Precompile = ({onDone}) => {
  const {gl, scene, camera, invalidate} = useThree();
  const frameloop = useThree((state) => state.frameloop);
  // Latest callback without re-running the compile when a parent passes a
  // fresh inline function (NeuralFlow does).
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let live = true;
    gl.compileAsync(scene, camera)
      .catch(() => {}) // a failed precompile only means the first frame compiles, as before
      .then(() => live && done.current());
    return () => {
      live = false;
    };
  }, [gl, scene, camera]);

  // "demand" draws only when asked; ask once the loop is allowed to run.
  useEffect(() => {
    if (frameloop === "demand") invalidate();
  }, [frameloop, invalidate]);

  return null;
};

// mode: {still, phone, count} from readMode().
const BrainCanvas = ({look, mode, active = true, onCreated}) => {
  const [compiled, setCompiled] = useState(false);
  const handleCompiled = useCallback(() => {
    setCompiled(true);
    onCreated?.();
  }, [onCreated]);

  let frameloop = "never";
  if (compiled) frameloop = mode.still ? "demand" : active ? "always" : "never";

  return (
    <Canvas
      camera={{position: [0, 0, look.camZ], fov: FOV}}
      dpr={[1, 1.5]}
      gl={{alpha: true, antialias: true, powerPreference: "high-performance"}}
      frameloop={frameloop}
      eventSource={document.body}
      eventPrefix="client"
    >
      {/* Far stars, the one layer not tied to the brain. Night only (no
          lightOpacity), so they never sprinkle the hero headline. */}
      <Particles count={mode.phone ? 60 : 180} inner={16} outer={34} size={0.09} opacity={0.6} drift={0.15} seed={3} color="#c7d7fe" look={look} />
      <Rig look={look} count={mode.count} still={mode.still} phone={mode.phone} />
      <Precompile onDone={handleCompiled} />
    </Canvas>
  );
};

export default BrainCanvas;
