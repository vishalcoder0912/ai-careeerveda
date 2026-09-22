/* Reusable cinematic human silhouette.
 *
 * Abstract, self-authored linework — no photographs, no licensed assets. Reads
 * as a modern AI professional under a cool studio rim light, with a faint
 * scanning ring around the head to suggest an intelligent system at work.
 */
const SilhouetteFigure = () => (
  <svg
    viewBox="0 0 360 620"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="ga-sil-figure"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="ga-sil-body" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#2f2413" />
        <stop offset="55%" stopColor="#241b0e" />
        <stop offset="100%" stopColor="#171108" />
      </linearGradient>
      <linearGradient id="ga-sil-rim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="rgba(242,200,120,0)" />
        <stop offset="70%" stopColor="#f2c878" />
        <stop offset="100%" stopColor="#f07c3a" />
      </linearGradient>
      <radialGradient id="ga-sil-glow" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#f07c3a" stopOpacity="0.28" />
        <stop offset="45%" stopColor="#c9a24b" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#171108" stopOpacity="0" />
      </radialGradient>
    </defs>

    <circle cx="180" cy="176" r="118" fill="url(#ga-sil-glow)" />
    <ellipse cx="300" cy="560" rx="170" ry="26" fill="rgba(0,0,0,0.4)" />

    {/* Head */}
    <circle cx="180" cy="88" r="34" fill="url(#ga-sil-body)" />
    <path
      d="M198 72a34 34 0 0 1 16 48l0 0 14 0 26 34 -10 8 -30 -34z"
      fill="rgba(217,164,65,0.06)"
    />

    {/* Neck */}
    <rect x="172" y="116" width="16" height="30" rx="7" fill="url(#ga-sil-body)" />

    {/* Torso — subtle lean, tapered waist */}
    <path
      d="M150 248
         C150 200 156 172 172 156
         C186 143 208 140 224 144
         C250 151 264 182 266 240
         C268 288 266 338 260 388
         L232 386
         C236 336 238 292 236 254
         C234 222 224 206 206 202
         L206 388
         L150 388
         C146 344 148 296 150 248
         Z"
      fill="url(#ga-sil-body)"
    />

    {/* Upper right arm (raised, holding a device glow) */}
    <path
      d="M224 150
         C242 158 254 174 258 196
         L242 210
         C240 196 234 186 226 178
         Z"
      fill="url(#ga-sil-body)"
    />
    {/* Device in hand — warm light */}
    <g transform="rotate(-26 258 206)">
      <rect x="238" y="168" width="30" height="20" rx="4" fill="#171108" stroke="rgba(242,200,120,0.5)" strokeWidth="1" />
      <rect x="243" y="172" width="20" height="12" rx="1.5" fill="rgba(242,200,120,0.6)" />
    </g>

    {/* Lower left arm at rest */}
    <path
      d="M152 216
         C138 232 132 252 134 274
         L154 274
         C152 258 154 242 160 232
         Z"
      fill="url(#ga-sil-body)"
    />

    {/* Legs to floor */}
    <path d="M188 386 L186 500 L164 500 L150 388 Z" fill="url(#ga-sil-body)" />
    <path d="M224 386 L254 428 L270 498 L246 498 L208 396 Z" fill="url(#ga-sil-body)" />

    {/* Rim light on the right edge of the torso + head */}
    <path
      d="M266 250 C270 300 266 350 258 392"
      stroke="url(#ga-sil-rim)"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M212 74 a32 32 0 0 1 12 24"
      stroke="#f07c3a"
      strokeWidth="1.4"
      strokeLinecap="round"
      opacity="0.8"
    />

    {/* Scanning ring around head */}
    <circle
      cx="180"
      cy="88"
      r="46"
      stroke="rgba(217,164,65,0.35)"
      strokeWidth="1"
      strokeDasharray="2 8"
      className="ga-sil-orbit"
    />
  </svg>
);

export const TalentSilhouette = ({className = ""}) => (
  <div className={`ga-silhouette ${className}`} aria-hidden="true">
    <SilhouetteFigure />
    <span className="ga-sil-particle ga-sil-p1" />
    <span className="ga-sil-particle ga-sil-p2" />
    <span className="ga-sil-particle ga-sil-p3" />
  </div>
);