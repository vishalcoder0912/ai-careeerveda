import {useEffect,useRef,useState} from "react";

// The pillar labels that orbit the robot. Each id maps to one zone of the stage
// coordinate system in careerveda-hero-refinement.css. Note the render order is
// not the on-screen order: hiring is the top-centre pill, the rest pair left/
// right down the stage.
const labels = [
  { id: "label-hiring", text: "Hiring Partners" },
  { id: "label-personalized", text: "Personalized Learning" },
  { id: "label-mentorship", text: "Expert Mentorship" },
  { id: "label-interview", text: "Interview Support" },
  { id: "label-placement", text: "Placement Support" },
  { id: "label-verified", text: "Verified Projects" },
  { id: "label-career", text: "Industry-Led Programs" },
];

// Shown only to the visitors listed in shouldSkipScene() below, who get no live
// scene either way. A still of the same robot, from the same scene, in the same
// place: 25 KB, and it keeps its alpha channel, so the hero's gradient and glow
// read through it as they do through the iframe. It replaced a spinning gradient
// ring capped "CareerVeda Career Engine".
const SplineFallback = () => {
  return (
    <div className="spline-poster" aria-hidden="true">
      <img src="/images/hero-robot.webp" alt="" width="560" height="778" decoding="async" fetchPriority="high" />
    </div>
  );
};

// The Spline scene is a whole second web app in an iframe: its own runtime, its
// own WebGL canvas, and ~1 MB across three third-party hosts (unpkg,
// spline.design, a Google CDN) — about 80% of the home page's total weight.
//
// Every device that can have it, gets it — phones included. The robot is the hero,
// and a still of it is not the same thing. The cost is real and is managed by the
// two gates in the effect below (on screen, then idle) rather than by withholding
// the scene.
//
// The still stands in only where the live scene was never going to be a good
// trade at any point in the load:
//   save-data / 2g  — megabytes of decoration on a connection that can't spare it
//   reduced motion  — an idling, animated 3D character is exactly what they turned off
const shouldSkipScene = () => {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  if (navigator.connection?.saveData) return true;
  if (/(^|-)2g$/.test(navigator.connection?.effectiveType ?? "")) return true;
  return false;
};

const isPhone = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;

const SplineHeroScene = ({sceneUrl}) => {
  const shellRef = useRef(null);
  const [isLoaded,setIsLoaded] = useState(false);
  const [hasFailed,setHasFailed] = useState(false);
  // Both initializers run during the first render, not in a mount effect —
  // setting these from the effect painted a loader frame and forced a second
  // render for values that were known before the first paint. matchMedia is
  // idempotent, so reading it in the initializer and again in the effect below
  // costs nothing.
  const [shouldRender,setShouldRender] = useState(false);
  const [useFallback] = useState(() => shouldSkipScene());
  // A finger has no hover, so over the iframe a phone must choose: either the
  // robot takes every gesture — including the vertical swipe meant to scroll the
  // page, which turns the hero into a trap you have to scroll around — or it takes
  // none. Neither is right on its own, so the choice is made per visitor instead
  // of once for the whole device: the frame starts inert and the page scrolls
  // normally, and a tap on the hint hands the robot the gestures until the
  // visitor scrolls or taps away again. We cannot arbitrate this from outside —
  // the embed is cross-origin, so touch-action does not reach its listeners and
  // pointer-events is the only lever we have.
  const [isTouch] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(hover: none)").matches,
  );
  const [isActive,setIsActive] = useState(false);
  const [isMobile] = useState(() => isPhone());

  useEffect(() => {
    if (shouldSkipScene()) {
      return undefined;
    }

    let cancelled = false;
    const idle = window.requestIdleCallback ?? ((cb) => window.setTimeout(cb,300));

    const start = () => {
      if (cancelled) return;
      idle(() => {
        if (!cancelled) setShouldRender(true);
      },{timeout: isMobile ? 1200 : 600});
    };

    // Two gates, in order. The scene may only start downloading once
    //   1. the hero is actually on screen (an IntersectionObserver, so a visitor
    //      who lands and scrolls straight past never pays for it at all), and
    //   2. the browser has gone idle — i.e. the page has painted and the app has
    //      booted.
    const shell = shellRef.current;
    if (!shell || typeof IntersectionObserver === "undefined") {
      start();
      return () => { cancelled = true; };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          start();
        }
      },
      {rootMargin: "200px"},
    );
    observer.observe(shell);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  },[isMobile]);

  // Hand the gestures back. While the robot is active it eats every swipe that
  // starts on it, so a scroll event can only mean the visitor swiped somewhere
  // else — which is exactly the signal that they are done with it. Pointerdown
  // inside the shell is ignored so that a tap on the robot is not also its own
  // release; taps on the iframe never reach us anyway, being cross-origin.
  useEffect(() => {
    if (!isActive) return undefined;

    const release = (event) => {
      if (event.type === "pointerdown" && shellRef.current?.contains(event.target)) return;
      setIsActive(false);
    };

    window.addEventListener("scroll",release,{passive: true});
    window.addEventListener("pointerdown",release,true);

    return () => {
      window.removeEventListener("scroll",release);
      window.removeEventListener("pointerdown",release,true);
    };
  },[isActive]);

  const showFallback = useFallback || hasFailed;
  // The still is only for the visitors who can never get the live scene —
  // reduced-motion / save-data / 2g / an iframe that failed to boot. Everyone
  // else gets the real robot: the frame starts downloading as soon as it can and
  // the loader ring stands in while it boots. No static stand-in is interposed
  // on the default path, so the still robot this app ships with can never be the
  // robot someone sees on a working device.
  const showPoster = showFallback;
  // Desktop drives the robot with a cursor, which can hover over the scene without
  // committing to it, so there the frame takes pointer events as normal. On touch
  // it takes them only once the visitor has asked for it.
  const isInteractive = !isTouch || isActive;
  const showTapHint = isTouch && shouldRender && !showPoster && !isActive;

  // Spline's embed renders its canvas at pixel ratio 1, so on a hi-DPI laptop
  // browser upscales it to the physical pixels and the robot reads soft. Ask the
  // embed for a 2x canvas there. Phones keep the default 1x: the bucket that
  // already holds the scene back to idle/idle-budget keeps its 1/4 pixel count.
  const sceneSrc =
    typeof window !== "undefined" && window.devicePixelRatio >= 2 && !isMobile
      ? `${sceneUrl}${sceneUrl.includes("?") ? "&" : "?"}devicePixelRatio=2`
      : sceneUrl;

  return (
    <div
      ref={shellRef}
      className="hero-visual-shell"
      role="img"
      aria-label="CareerVeda industry-led career and placement system"
    >
      {/* The stage is the single local coordinate system: the robot is centred
          in it and every floating label is anchored to it, so the whole
          composition stays together whatever the grid column around it does.
          .hero-visual-shell stays a plain full-width wrapper — the grid child
          the responsive rules move around. */}
      <div className="hero-spline-stage">
        <div className="spline-glow" aria-hidden="true" />

        {!isLoaded && !showPoster && (
          <div className="spline-loader">
            <div className="loader-orbit" />
            <span>Loading CareerVeda Visual</span>
          </div>
        )}

        {shouldRender && (
          <div
            className={`spline-frame${isInteractive ? " is-interactive" : ""}`}
            aria-hidden="true"
          >
            <iframe
              className={`spline-scene ${isLoaded ? "is-loaded" : ""}`}
              src={sceneSrc}
              title="CareerVeda career growth visual"
              frameBorder="0"
              loading="lazy"
              // allow-scripts + allow-pointer-lock: the runtime boots, the scene renders
              // and tracks the cursor/pointer. pointer-lock is required for the 3D scene
              // to capture mouse movement for orbit/rotation controls.
              // allow-same-origin is NOT granted — the scene data is inlined in the embed
              // page, and its localStorage paths are desktop-app-only. Granting it back
              // would hand the frame its real spline.design origin for nothing.
              sandbox="allow-scripts allow-pointer-lock"
              allow="autoplay; fullscreen; xr-spatial-tracking; pointer-lock"
              onLoad={() => setIsLoaded(true)}
              onError={() => setHasFailed(true)}
            />
          </div>
        )}

        {/* The still is the scene for the fallback visitors above, who get no live
            frame; it is never interposed on anyone else's view. */}
        {showPoster && <SplineFallback />}

        {/* Covers the whole robot, not just the pill. Tapping the robot is the
            gesture people actually make, and when only the pill listened every
            such tap landed on a frame held at pointer-events: none and did
            nothing — the feature looked broken to anyone who did not first spot a
            103px label. The layer is transparent and is not the iframe, so native
            scrolling still passes through it untouched; only a tap acts.

            A sibling of .spline-frame, not a child: the frame is inert until
            activated and a child would inherit that and never be tappable. A div
            rather than a button because .hero-visual-shell is role="img" — a
            focusable child would be invisible to assistive tech while still
            catching keyboard focus, and this is a touch-only affordance on
            decoration. */}
        {showTapHint && (
          <div
            className="spline-tap-layer"
            aria-hidden="true"
            onPointerDown={() => setIsActive(true)}
          >
            <span className="spline-tap-hint">Tap to rotate</span>
          </div>
        )}

        <div className="floating-labels" aria-hidden="true">
          {labels.map((label) => (
            <span className={`ai-label ${label.id}`} key={label.id}>
              <span className="ai-label-inner">{label.text}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SplineHeroScene;
