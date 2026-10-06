import {forwardRef, useState} from "react";

/* The certificate is authored as inline SVG rather than as HTML + CSS because of
   how it leaves the browser.

   The obvious implementation — html2canvas, or a print stylesheet — either adds
   a dependency or rasterises text. This way the same node that is on screen is
   serialised, handed to an <img>, and painted onto a canvas at 2x. Everything is
   vector, so the PNG is crisp at any size and the text is real text, not a
   blurry bitmap of text. No web fonts are used either, so nothing has to be
   inlined as base64 before the image will render.

   Consequence to respect when editing: every style below must be a presentation
   attribute. A CSS class works in the browser and then silently vanishes from
   the download, which is the kind of bug that only shows up after download. */

/* The artwork is a fixed landscape A4 ratio. Exported because the export path
   needs the same two numbers to size the canvas — a copy here is a copy that
   eventually disagrees with the viewBox and silently rescales the download. */
export const WIDTH = 1600;
export const HEIGHT = 1131;

/* Masthead icon — the one image on the certificate, shared by all three
   programmes. Drop your file at public/images/certificate-logo.png (or change
   this path). It sits left of the "CareerVeda" wordmark in a 62×62 square and
   is scaled to fit without distortion, so a square mark with a transparent
   background works best (e.g. 256×256 px). Until the file exists, the blue
   tile renders instead. The download fetches and inlines it as a data URL, so
   it must be on this site or on a CORS-enabled host (ImageKit is). */
export const LOGO_SRC = "https://ik.imagekit.io/q7ucn1rfni/careerveda/brand/logo.png?updatedAt=1786622628327";

const INK = "#102a5c";
const INK_SOFT = "#33486b";
const INK_MUTED = "#64748b";
const BLUE = "#2563eb";
const RULE = "rgba(16,42,92,0.22)";

/* The recipient's name has to fit between the two ends of the rule beneath it
   (860px of usable width). Rather than guess at character-count thresholds — which
   is how a 21-character name ends up overrunning the rule and colliding with the
   programme title — the size is solved from the width itself:

       width = size × (length × 0.5 + (length - 1) × trackingEm)

   0.5em is the average advance for mixed-case Georgia bold. Tracking is a
   fraction of the font size rather than a fixed pixel value, because 6px of
   tracking is 7% of a 84px em but 20% of a 30px one — a fixed value silently
   breaks the fit for exactly the long names that needed shrinking.

   The lower clamp is safe: at the 48-character input limit the worst case
   (all-caps) still measures 818px, so the clamp can never overrun the rule. */
const MAX_TEXT_WIDTH = 830;
const MIN_NAME_SIZE = 30;
const MAX_NAME_SIZE = 84;

const typeName = (value) => {
  const trackingEm = value === value.toUpperCase() ? 0.07 : 0.01;
  const perChar = value.length * 0.5 + (value.length - 1) * trackingEm;
  const size = Math.max(MIN_NAME_SIZE, Math.min(MAX_NAME_SIZE, Math.floor(MAX_TEXT_WIDTH / perChar)));
  return {size, tracking: Number((size * trackingEm).toFixed(2))};
};

export const CertificateArt = forwardRef(function CertificateArt(
  {cert, name, serial, issuedOn, className},
  ref,
) {
  const recipient = (name || "").trim() || "YOUR NAME HERE";
  const {size: nameSize, tracking: nameTracking} = typeName(recipient);
  const dateLabel = issuedOn || "";
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <svg
      ref={ref}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label={`Certificate of completion preview for ${cert.title}`}
    >
      <defs>
        <linearGradient id="cvPaper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#fbfcff" />
          <stop offset="100%" stopColor="#f2f6ff" />
        </linearGradient>

        <linearGradient id="cvSeal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>

        {/* "Veda" in the site wordmark: the same vertical gradient as
            .brand-name .cv-veda in brand-wordmark.css. */}
        <linearGradient id="cvVeda" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2fc8f5" />
          <stop offset="50%" stopColor="#178dd2" />
          <stop offset="100%" stopColor="#0b5daa" />
        </linearGradient>

        <pattern id="cvHatch" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="18" stroke="#2563eb" strokeWidth="1" strokeOpacity="0.05" />
        </pattern>

        <pattern id="cvGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#2563eb" strokeWidth="1" strokeOpacity="0.045" />
        </pattern>
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill="url(#cvPaper)" />
      <rect width={WIDTH} height={HEIGHT} fill="url(#cvGrid)" />
      <rect width={WIDTH} height={HEIGHT} fill="url(#cvHatch)" />

      {/* Watermark: the brand, twice, rotated off-axis. Kept well under the
          contrast of the text so it reads as paper texture, not as a second
          headline competing with the recipient's name. */}
      <g opacity="0.07" pointerEvents="none">
        <text
          x={WIDTH / 2}
          y={HEIGHT / 2 + 60}
          textAnchor="middle"
          transform={`rotate(-24 ${WIDTH / 2} ${HEIGHT / 2})`}
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="200"
          fontWeight="700"
          letterSpacing="18"
          fill={INK}
        >
          CAREERVEDA
        </text>
        <text
          x={WIDTH / 2}
          y={HEIGHT - 90}
          textAnchor="middle"
          transform={`rotate(-24 ${WIDTH / 2} ${HEIGHT / 2})`}
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="120"
          fontWeight="700"
          letterSpacing="26"
          fill={BLUE}
        >
          CAREERVEDA
        </text>
      </g>

      {/* Frame: a heavy outer rule, a hairline inner rule, and corner brackets. */}
      <rect x="44" y="44" width={WIDTH - 88} height={HEIGHT - 88} fill="none" stroke={INK} strokeWidth="3" />
      <rect x="60" y="60" width={WIDTH - 120} height={HEIGHT - 120} fill="none" stroke={RULE} strokeWidth="1" />
      <rect
        x="76"
        y="76"
        width={WIDTH - 152}
        height={HEIGHT - 152}
        fill="none"
        stroke={BLUE}
        strokeWidth="1"
        strokeOpacity="0.22"
        strokeDasharray="2 10"
      />

      {[
        [76, 76, 1, 1],
        [WIDTH - 76, 76, -1, 1],
        [76, HEIGHT - 76, 1, -1],
        [WIDTH - 76, HEIGHT - 76, -1, -1],
      ].map(([cx, cy, sx, sy]) => (
        <path
          key={`${cx}-${cy}`}
          d={`M ${cx + 34 * sx} ${cy} L ${cx} ${cy} L ${cx} ${cy + 34 * sy}`}
          fill="none"
          stroke={BLUE}
          strokeWidth="3"
          strokeOpacity="0.55"
          strokeLinecap="square"
        />
      ))}

      {/* Masthead: the site's own lockup (BrandLockup + brand-wordmark.css) —
          icon, "Career" in black + "Veda" in the blue gradient, and the orange
          "Learn. Analyze. Lead." tagline. The icon is the custom LOGO_SRC image
          in a 62×62 square; until that file exists, the blue tile stands in. */}
      <g>
        {!logoFailed ? (
          <image
            href={LOGO_SRC}
            x="118"
            y="118"
            width="62"
            height="62"
            preserveAspectRatio="xMidYMid meet"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <>
            <rect x="118" y="118" width="62" height="62" rx="16" fill="url(#cvSeal)" />
            <path d="M149 136 L162 149 L149 162 L136 149 Z" fill="#ffffff" />
          </>
        )}
        <text
          x="196"
          y="155"
          fontFamily="Manrope, Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="38"
          fontWeight="800"
          letterSpacing="-0.76"
        >
          <tspan fill="#000000">Career</tspan>
          <tspan fill="url(#cvVeda)">Veda</tspan>
        </text>
        <text
          x="197"
          y="179"
          fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="13"
          fontWeight="500"
          letterSpacing="2.86"
          fill="#f6a34b"
        >
          Learn. Analyze. Lead.
        </text>
      </g>

      <text
        x={WIDTH - 118}
        y="152"
        textAnchor="end"
        fontFamily="ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"
        fontSize="19"
        letterSpacing="1.5"
        fill={INK_SOFT}
      >
        careerveda.in
      </text>
      <text
        x={WIDTH - 118}
        y="180"
        textAnchor="end"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="15"
        letterSpacing="2.6"
        fill={INK_MUTED}
      >
        POSTGRADUATE PROGRAMME
      </text>

      {/* Kicker */}
      <g transform={`translate(${WIDTH / 2} 300)`}>
        <line x1="-330" y1="0" x2="-52" y2="0" stroke={BLUE} strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="52" y1="0" x2="330" y2="0" stroke={BLUE} strokeWidth="1.5" strokeOpacity="0.5" />
        <path d="M0 -11 L11 0 L0 11 L-11 0 Z" fill={BLUE} />
        <text
          x="0"
          y="-38"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="19"
          fontWeight="600"
          letterSpacing="9"
          fill={BLUE}
        >
          CERTIFICATE OF COMPLETION
        </text>
      </g>

      {/* Recipient */}
      <text
        x={WIDTH / 2}
        y="430"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="22"
        letterSpacing="2"
        fill={INK_MUTED}
      >
        This is to certify that
      </text>

      <text
        x={WIDTH / 2}
        y={520}
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize={nameSize}
        fontWeight="700"
        letterSpacing={nameTracking}
        fill={INK}
      >
        {recipient}
      </text>

      <line
        x1={WIDTH / 2 - 430}
        y1="552"
        x2={WIDTH / 2 + 430}
        y2="552"
        stroke={BLUE}
        strokeWidth="2"
        strokeOpacity="0.45"
      />

      <text
        x={WIDTH / 2}
        y="606"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="19"
        letterSpacing="2.4"
        fill={INK_MUTED}
      >
        has successfully completed the
      </text>

      <text
        x={WIDTH / 2}
        y="672"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="46"
        fontWeight="700"
        fill={INK}
      >
        {cert.title}
      </text>

      <text
        x={WIDTH / 2}
        y="716"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="21"
        letterSpacing="4"
        fill={BLUE}
      >
        {cert.focus}
      </text>

      <text
        x={WIDTH / 2}
        y="766"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="18"
        fill={INK_SOFT}
      >
        {cert.outcome}
      </text>

      {/* Skills. Sits at 812 so the rects (793–831) clear the seal below. */}
      <g transform={`translate(${WIDTH / 2} 812)`}>
        {cert.skills.map((skill, i) => (
          <g key={skill} transform={`translate(${-250 + i * 128} 0)`}>
            <rect
              x="0"
              y="-19"
              width="116"
              height="38"
              rx="19"
              fill={BLUE}
              fillOpacity="0.07"
              stroke={BLUE}
              strokeOpacity="0.3"
            />
            <text
              x="58"
              y="5"
              textAnchor="middle"
              fontFamily="ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"
              fontSize="15"
              fill={INK_SOFT}
            >
              {skill}
            </text>
          </g>
        ))}
      </g>

      {/* Signatures */}
      <g transform="translate(150 1000)">
        <line x1="0" y1="-58" x2="300" y2="-58" stroke={INK} strokeWidth="1.5" strokeOpacity="0.5" />
        <text
          x="0"
          y="-76"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="15"
          letterSpacing="2"
          fill={INK_MUTED}
        >
          PROGRAMME DIRECTOR
        </text>
        <text
          x="0"
          y="-24"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="22"
          fontStyle="italic"
          fill={INK}
        >
          CareerVeda Academic Board
        </text>
      </g>

      <g transform={`translate(${WIDTH - 150} 1000)`}>
        <line x1="-300" y1="-58" x2="0" y2="-58" stroke={INK} strokeWidth="1.5" strokeOpacity="0.5" />
        <text
          x="0"
          y="-76"
          textAnchor="end"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="15"
          letterSpacing="2"
          fill={INK_MUTED}
        >
          DATE OF ISSUE
        </text>
        <text
          x="0"
          y="-24"
          textAnchor="end"
          fontFamily="ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"
          fontSize="20"
          fill={INK}
        >
          {dateLabel}
        </text>
      </g>

      {/* Seal. Centred at 915 so it spans 853–977: clear of the skill chips above
          and of the credential ID at 1013 below. At the old 962 it overlapped
          the ID, which printed straight through the middle of the seal. */}
      <g transform={`translate(${WIDTH / 2} 915)`}>
        <circle r="62" fill="url(#cvSeal)" />
        <circle r="52" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.6" />
        <text
          y="-4"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="28"
          fontWeight="700"
          letterSpacing="3"
          fill="#ffffff"
        >
          PG
        </text>
        <text
          y="26"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="11"
          letterSpacing="2.4"
          fill="#ffffff"
          fillOpacity="0.85"
        >
          VERIFIED
        </text>
      </g>

      {/* Credential id */}
      <text
        x={WIDTH / 2}
        y={HEIGHT - 118}
        textAnchor="middle"
        fontFamily="ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"
        fontSize="17"
        letterSpacing="3"
        fill={INK_SOFT}
      >
        {cert.mark} · {serial}
      </text>

      <text
        x={WIDTH / 2}
        y={HEIGHT - 92}
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="13"
        letterSpacing="1.4"
        fill={INK_MUTED}
      >
        {cert.stage} · 24-week postgraduate programme · issued on successful completion
      </text>
    </svg>
  );
});

export default CertificateArt;
