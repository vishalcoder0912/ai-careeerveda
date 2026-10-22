import {Canvas, useFrame, useThree} from "@react-three/fiber";
import {useRef} from "react";
import * as THREE from "three";
import {NeuralBrain, Particles} from "./neural/NeuralBrain";

// The hero's brain: the shared particle brain inside a small midnight field of
// stars and motes. Hero.jsx decides whether it loads at all.

const scrollProgress = () => Math.min(1, Math.max(0, window.scrollY / window.innerHeight));

const Scene = ({centerX, count, hostRef, still, scrollDepth}) => {
  const stage = useRef(null);
  const brain = useRef(null);
  const {viewport} = useThree();
  const scale = Math.min(1.25, viewport.width / 4.8);
  const x = (centerX - 0.5) * viewport.width;
  const lastP = useRef(-1);

  useFrame((state) => {
    const {camera} = state;
    const t = state.clock.elapsedTime;
    const p = scrollProgress() * scrollDepth;

    // Slow side-to-three-quarter sway, a gentle breath, and a turn as the
    // visitor scrolls the hero away.
    brain.current.rotation.y = -0.45 + Math.sin(t * 0.1) * 0.6 + p * 0.9;
    brain.current.rotation.x = 0.14 + Math.sin(t * 0.08) * 0.05;
    brain.current.position.y = Math.sin(t * 0.45) * 0.05;
    stage.current.position.y = p * 0.6;

    // Dolly in with scroll; drift toward the pointer. A still frame jumps
    // straight to the target instead of easing.
    const ease = still ? 1 : 0.04;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, state.pointer.x * 0.35, ease);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, state.pointer.y * 0.22, ease);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 6.2 - p * 1.4, still ? 1 : 0.08);
    camera.lookAt(0, p * 0.6, 0);

    // The page's floating card reads the same progress for its parallax.
    const rounded = Math.round(p * 100) / 100;
    if (rounded !== lastP.current && hostRef.current) {
      lastP.current = rounded;
      hostRef.current.style.setProperty("--hh-p", rounded);
    }
  });

  return (
    <group ref={stage} position={[x, 0, 0]} scale={scale}>
      <Particles count={160} inner={3.4} outer={6} size={0.025} opacity={0.6} drift={0.3} seed={5} color="#bfdbfe" additive />
      <Particles count={220} inner={2.1} outer={3.2} size={0.028} opacity={0.4} drift={0.7} seed={11} />
      <group ref={brain}>
        <NeuralBrain count={count} additive gain={1.6} />
      </group>
      <Particles count={16} inner={1.6} outer={2.1} size={0.065} opacity={0.55} drift={1.8} seed={23} />
    </group>
  );
};

// centerX: where the brain's centre sits across the canvas, 0–1.
// still: render one frame and stop (reduced motion).
// scrollDepth: 0–1, how much the scroll dolly applies (0 on phones).
const HeroBrain = ({centerX = 0.5, active = true, still = false, scrollDepth = 1, count = 9000, hostRef}) => (
  <Canvas
    camera={{position: [0, 0, 6.2], fov: 45}}
    dpr={[1, 1.5]}
    gl={{alpha: true, antialias: true, powerPreference: "high-performance"}}
    frameloop={still ? "demand" : active ? "always" : "never"}
    eventSource={typeof document === "undefined" ? undefined : document.body}
    eventPrefix="client"
  >
    <Scene centerX={centerX} count={count} hostRef={hostRef} still={still} scrollDepth={scrollDepth} />
  </Canvas>
);

export default HeroBrain;
