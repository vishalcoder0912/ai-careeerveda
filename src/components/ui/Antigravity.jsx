import {Canvas, useFrame, useThree} from "@react-three/fiber";
import {useMemo, useRef} from "react";
import * as THREE from "three";

const AntigravityInner = ({
  count = 300,
  magnetRadius = 10,
  ringRadius = 10,
  waveSpeed = 0.4,
  waveAmplitude = 1,
  particleSize = 2,
  lerpSpeed = 0.1,
  color = "#FF9FFC",
  autoAnimate = false,
  particleVariance = 1,
  rotationSpeed = 0,
  depthFactor = 1,
  pulseSpeed = 3,
  particleShape = "capsule",
  fieldStrength = 10
}) => {
  const meshRef = useRef(null);
  const {viewport} = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const lastMousePos = useRef({x: 0, y: 0});
  const lastMouseMoveTime = useRef(0);
  const virtualMouse = useRef({x: 0, y: 0});

  const particles = useMemo(() => {
    const temp = [];
    const width = viewport.width || 100;
    const height = viewport.height || 100;

    for (let i = 0; i < count; i += 1) {
      const t = Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;

      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;
      const z = (Math.random() - 0.5) * 20;

      temp.push({
        t,
        speed,
        mx: x,
        my: y,
        mz: z,
        cx: x,
        cy: y,
        cz: z,
        randomRadiusOffset: (Math.random() - 0.5) * 2
      });
    }

    return temp;
  }, [count, viewport.width, viewport.height]);

  useFrame((state) => {
    const mesh = meshRef.current;

    if (!mesh) {
      return;
    }

    const {viewport: currentViewport, pointer} = state;

    const mouseDist = Math.sqrt(
      Math.pow(pointer.x - lastMousePos.current.x, 2) +
      Math.pow(pointer.y - lastMousePos.current.y, 2)
    );

    if (mouseDist > 0.001) {
      lastMouseMoveTime.current = Date.now();
      lastMousePos.current = {x: pointer.x, y: pointer.y};
    }

    let destX = (pointer.x * currentViewport.width) / 2;
    let destY = (pointer.y * currentViewport.height) / 2;

    if (autoAnimate && Date.now() - lastMouseMoveTime.current > 2000) {
      const time = state.clock.getElapsedTime();

      destX = Math.sin(time * 0.5) * (currentViewport.width / 4);
      destY = Math.cos(time) * (currentViewport.height / 4);
    }

    const smoothFactor = 0.05;

    virtualMouse.current.x +=
      (destX - virtualMouse.current.x) * smoothFactor;

    virtualMouse.current.y +=
      (destY - virtualMouse.current.y) * smoothFactor;

    const targetX = virtualMouse.current.x;
    const targetY = virtualMouse.current.y;
    const globalRotation =
      state.clock.getElapsedTime() * rotationSpeed;

    particles.forEach((particle, index) => {
      particle.t += particle.speed / 2;

      const projectionFactor = 1 - particle.cz / 50;
      const projectedTargetX = targetX * projectionFactor;
      const projectedTargetY = targetY * projectionFactor;

      const dx = particle.mx - projectedTargetX;
      const dy = particle.my - projectedTargetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const targetPos = {
        x: particle.mx,
        y: particle.my,
        z: particle.mz * depthFactor
      };

      if (dist < magnetRadius) {
        const angle = Math.atan2(dy, dx) + globalRotation;

        const wave =
          Math.sin(particle.t * waveSpeed + angle) *
          (0.5 * waveAmplitude);

        const deviation =
          particle.randomRadiusOffset *
          (5 / (fieldStrength + 0.1));

        const currentRingRadius =
          ringRadius + wave + deviation;

        targetPos.x =
          projectedTargetX +
          currentRingRadius * Math.cos(angle);

        targetPos.y =
          projectedTargetY +
          currentRingRadius * Math.sin(angle);

        targetPos.z =
          particle.mz * depthFactor +
          Math.sin(particle.t) *
          waveAmplitude *
          depthFactor;
      }

      particle.cx +=
        (targetPos.x - particle.cx) * lerpSpeed;

      particle.cy +=
        (targetPos.y - particle.cy) * lerpSpeed;

      particle.cz +=
        (targetPos.z - particle.cz) * lerpSpeed;

      dummy.position.set(
        particle.cx,
        particle.cy,
        particle.cz
      );

      dummy.lookAt(
        projectedTargetX,
        projectedTargetY,
        particle.cz
      );

      dummy.rotateX(Math.PI / 2);

      const currentDistToMouse = Math.sqrt(
        Math.pow(particle.cx - projectedTargetX, 2) +
        Math.pow(particle.cy - projectedTargetY, 2)
      );

      const distFromRing = Math.abs(
        currentDistToMouse - ringRadius
      );

      let scaleFactor = 1 - distFromRing / 10;
      scaleFactor = Math.max(0, Math.min(1, scaleFactor));

      const finalScale =
        scaleFactor *
        (
          0.8 +
          Math.sin(particle.t * pulseSpeed) *
          0.2 *
          particleVariance
        ) *
        particleSize;

      dummy.scale.set(
        finalScale,
        finalScale,
        finalScale
      );

      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
    >
      {particleShape === "capsule" && (
        <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
      )}

      {particleShape === "sphere" && (
        <sphereGeometry args={[0.2, 12, 12]} />
      )}

      {particleShape === "box" && (
        <boxGeometry args={[0.3, 0.3, 0.3]} />
      )}

      {particleShape === "tetrahedron" && (
        <tetrahedronGeometry args={[0.3]} />
      )}

      <meshBasicMaterial color={color} />
    </instancedMesh>
  );
};

// `eventSource` is the escape hatch that keeps this layer both decorative and
// interactive. The wrapper around the Canvas is pointer-events: none so it can
// never swallow a click on a card, but that also means the canvas itself never
// sees a pointermove — and the particles would sit frozen. Pointing R3F's event
// source at the section element instead lets it read the cursor from an element
// that *does* receive events, without intercepting anything. `eventPrefix
//="client"` makes R3F derive the pointer from clientX/clientY against that
// element's box, which is the same box the canvas fills.
//
// `frameloop="demand"` renders a single frame and then stops, which is how the
// reduced-motion path gets a static field instead of a running animation.
const Antigravity = ({eventSource, frameloop = "always", dpr = [1, 1.5], ...props}) => {
  return (
    <Canvas
      camera={{position: [0, 0, 50], fov: 35}}
      dpr={dpr}
      frameloop={frameloop}
      eventSource={eventSource}
      eventPrefix="client"
      gl={{
        // Off. MSAA on a full-section canvas is one of the more expensive
        // things a laptop's integrated GPU can be asked for, and the particles
        // are sub-2px spheres behind a half-opacity wrapper — there are no
        // edges here for it to smooth.
        antialias: false,
        alpha: true,
        powerPreference: "high-performance"
      }}
    >
      <AntigravityInner {...props} />
    </Canvas>
  );
};

export default Antigravity;
