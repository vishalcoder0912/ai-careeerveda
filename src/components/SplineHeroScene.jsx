import {useEffect,useRef,useState} from "react";

const labels = [
  "Personalized Learning",
  "Expert Mentorship",
  "Interview Support",
  "Placement Focus",
  "Verified Projects",
  "Career Programs",
  "Hiring Partners",
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
  // setting these from the effect painted a loader frame that was never shown
  // (the still replaced it) and forced a second render for values that were
  // known before the first paint. matchMedia is idempotent, so reading it in
  // the initializer and again in the effect below costs nothing.
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
  // On a phone the still poster is the resting hero until the scene is asked for.
  // Kept separate from useFallback (which is the permanent still for
  // reduced-motion / save-data / 2g): here the poster is only a stand-in that the
  // first gesture upgrades to the live robot.
  const [phoneResting] = useState(() => isPhone());

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
      },{timeout: phoneResting ? 3000 : 2000});
    };

    // Phones: the live scene is a ~1 MB WebGL app on its own thread, and booting
    // it during the first seconds of the load is what pins the mobile score down —
    // it contends for a CPU the page is still painting on and for the bandwidth
    // the hero needs. So on a phone the still poster stands in until the visitor's
    // first gesture (scroll/tap — which happens within a second on a landing page)
    // and only then does the identical live robot boot, into a page that is
    // already up. Nothing is withheld: every phone visitor still gets the scene,
    // just after the page rather than racing it.
    if (phoneResting) {
      const events = ["pointerdown","touchstart","wheel","scroll","keydown"];
      const onFirst = () => {
        events.forEach((e) => window.removeEventListener(e,onFirst));
        start();
      };
      events.forEach((e) => window.addEventListener(e,onFirst,{once: true,passive: true}));
      return () => {
        cancelled = true;
        events.forEach((e) => window.removeEventListener(e,onFirst));
      };
    }

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
  },[phoneResting]);

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
  // The phone poster shows only while the scene has not been requested yet; the
  // first gesture flips shouldRender and the live iframe takes over from there.
  const showPoster = showFallback || (phoneResting && !shouldRender);
  // Desktop drives the robot with a cursor, which can hover over the scene without
  // committing to it, so there the frame takes pointer events as normal. On touch
  // it takes them only once the visitor has asked for it.
  const isInteractive = !isTouch || isActive;
  const showTapHint = isTouch && shouldRender && !showPoster && !isActive;

  return (
    <div
      ref={shellRef}
      className="hero-visual-shell"
      role="img"
      aria-label="CareerVeda industry-led career and placement system"
    >
      <div className="spline-glow" aria-hidden="true" />

      {!isLoaded && !showPoster && (
        <div className="spline-loader">
          <div className="loader-orbit" />
          <span>Loading CareerVeda Visual</span>
        </div>
      )}

      {showPoster ? (
        <SplineFallback />
      ) : (
        shouldRender && (
          <div
            className={`spline-frame${isInteractive ? " is-interactive" : ""}`}
            aria-hidden="true"
          >
            <iframe
              className={`spline-scene ${isLoaded ? "is-loaded" : ""}`}
              src={sceneUrl}
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
        )
      )}

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
        {labels.map((label,index) => (
          <span className={`ai-label label-${index + 1}`} key={label}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default SplineHeroScene;
