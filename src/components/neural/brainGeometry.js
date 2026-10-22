// Procedural particle brain. No licensed anatomical mesh ships with the
// project, so the surface is modelled here: two hemispheres (frontal,
// temporal and occipital shaping, the longitudinal and Sylvian fissures), a
// striated cerebellum and the stem. Particles are rejection-sampled onto the
// zero set of a fold field, so they trace gyri and sulci instead of sitting
// uniformly on an ellipsoid.
//
// Brain-local axes: x = front(+)/back(-), y = up, z = left/right hemisphere.

// Seeded PRNG: the brain is identical on every load and render stays pure.
export const mulberry32 = (seed) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Uniform random direction (normalised point in the unit ball).
export const randomDir = (rand, out) => {
  let x, y, z, l;
  do {
    x = rand() * 2 - 1;
    y = rand() * 2 - 1;
    z = rand() * 2 - 1;
    l = x * x + y * y + z * z;
  } while (l > 1 || l < 1e-4);
  l = Math.sqrt(l);
  out[0] = x / l;
  out[1] = y / l;
  out[2] = z / l;
  return out;
};

// Its zero set is a network of worm-like curves: the folds.
const fold = (x, y, z) =>
  Math.sin(5.6 * x + 2.3 * Math.sin(4.1 * y)) *
  Math.sin(5.6 * y + 2.3 * Math.sin(4.1 * z + 1.3)) *
  Math.sin(5.6 * z + 2.3 * Math.sin(4.1 * x + 0.7));

const FILAMENT_STEPS = 6;
const MAX_NODES = 1100;

export const buildBrain = (count) => {
  const rand = mulberry32(7);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const nodes = [];
  const u = [0, 0, 0];
  let n = 0;

  const push = (x, y, z, size) => {
    positions[n * 3] = x;
    positions[n * 3 + 1] = y;
    positions[n * 3 + 2] = z;
    seeds[n] = rand();
    sizes[n] = size;
    n += 1;
  };

  // eslint-disable-next-line no-unmodified-loop-condition -- push() advances n
  while (n < count) {
    const region = rand();

    if (region < 0.86) {
      // Cerebrum hemisphere.
      const side = rand() < 0.5 ? -1 : 1;
      randomDir(rand, u);
      const medial = u[2] * side < 0;
      if (medial && rand() > 0.2) continue; // the inner wall is mostly hidden
      let x = u[0] * 1.3;
      let y = u[1] * (u[1] < 0 ? 0.66 : 0.95);
      const z = u[2] * (medial ? 0.26 : 0.62);
      y -= 0.12 * Math.max(0, u[0]) ** 2; // frontal lobe slopes down
      y -= 0.24 * Math.exp(-((u[0] - 0.15) ** 2) / 0.1) * Math.max(0, -u[1]); // temporal lobe
      x -= 0.08 * Math.max(0, -u[1]) * Math.max(0, -u[0]); // occipital tucks in

      // Sylvian fissure: a groove rising from the front-bottom toward the back.
      const lateral = Math.abs(u[2]) > 0.35 && !medial;
      if (lateral && x > -0.55 && x < 0.55 && Math.abs(y - (-0.12 + (0.45 - x) * 0.32)) < 0.045) continue;

      const f = Math.abs(fold(x, y, z));
      if (rand() > 0.03 + 0.97 * (1 - f) ** 12) continue;
      const indent = 1 - 0.06 * (1 - f); // particles sit in the grooves
      const isNode = nodes.length < MAX_NODES && rand() < 0.1;
      if (isNode) nodes.push(n);
      push(x * indent, y * indent, z * indent + side * 0.3, isNode ? 2.4 : 0.5 + rand() * 0.7);
    } else if (region < 0.96) {
      // Cerebellum: lower back, finely striated.
      randomDir(rand, u);
      if (u[1] > 0.35) continue;
      const x = -0.92 + u[0] * 0.42;
      const y = -0.52 + u[1] * 0.3;
      const z = u[2] * 0.72;
      if (Math.abs(Math.sin(y * 40 + x * 6)) > 0.4) continue;
      push(x, y, z, 0.6 + rand() * 0.5);
    } else {
      // Brain stem.
      const t = rand();
      const a = rand() * Math.PI * 2;
      const r = 0.13 * (1 - t * 0.3);
      push(-0.32 - t * 0.2 + Math.cos(a) * r, -0.45 - t * 0.8, Math.sin(a) * r, 0.6);
    }
  }

  // Link each node to up to three neighbours.
  const links = [];
  const degree = new Uint8Array(nodes.length);
  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i] * 3;
    for (let j = i + 1; j < nodes.length && degree[i] < 3; j += 1) {
      if (degree[j] >= 3) continue;
      const b = nodes[j] * 3;
      const dx = positions[a] - positions[b];
      const dy = positions[a + 1] - positions[b + 1];
      const dz = positions[a + 2] - positions[b + 2];
      if (dx * dx + dy * dy + dz * dz < 0.12) {
        links.push(a, b);
        degree[i] += 1;
        degree[j] += 1;
      }
    }
  }

  // Each link is a slightly bowed, jittered quadratic curve drawn as
  // FILAMENT_STEPS segments; aT runs 0→1 along it so a pulse can travel.
  const linkCount = links.length / 2;
  const verts = linkCount * FILAMENT_STEPS * 2;
  const linePositions = new Float32Array(verts * 3);
  const lineT = new Float32Array(verts);
  const linePhase = new Float32Array(verts);
  let v = 0;
  for (let l = 0; l < linkCount; l += 1) {
    const a = links[l * 2];
    const b = links[l * 2 + 1];
    const bow = 1.04 + rand() * 0.05;
    const c = [0, 1, 2].map(
      (k) => ((positions[a + k] + positions[b + k]) / 2) * bow + (rand() - 0.5) * 0.06,
    );
    const phase = rand();
    for (let s = 0; s < FILAMENT_STEPS; s += 1) {
      for (const t of [s / FILAMENT_STEPS, (s + 1) / FILAMENT_STEPS]) {
        const w0 = (1 - t) ** 2;
        const w1 = 2 * (1 - t) * t;
        const w2 = t * t;
        for (let k = 0; k < 3; k += 1) {
          linePositions[v * 3 + k] = w0 * positions[a + k] + w1 * c[k] + w2 * positions[b + k];
        }
        lineT[v] = t;
        linePhase[v] = phase;
        v += 1;
      }
    }
  }

  return {positions, seeds, sizes, linePositions, lineT, linePhase, nodeCount: nodes.length};
};
