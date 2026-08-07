import {useEffect,useRef} from "react";
import {motion} from "framer-motion";
import {Link} from "react-router-dom";
import {SPLINE_SCENE_URL} from "../config/spline";
import SplineHeroScene from "./SplineHeroScene";
import ShapeGrid from "./ShapeGrid";

const Hero = ({stats}) => {
  const heroRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    // Phones do not get the parallax, and so do not get gsap. It is a decorative
    // scrub on the hero as you scroll away from it — worth 45 KB of download plus
    // its parse and its per-frame scroll work on a desktop, not on the device
    // where that cost lands during the first seconds of the load and competes
    // with the paint. Same reasoning as the particle field in
    // RecommendedCourses1, which is desktop-only for the same reason.
    if (window.matchMedia("(max-width: 900px)").matches) return undefined;

    let context;
    let cancelled = false;

    // gsap + ScrollTrigger is ~115 KB, and none of it is needed to paint the
    // hero — it only animates the hero as you scroll away from it. Imported at
    // the top of the file it sat in the entry chunk, blocking first paint on a
    // library whose first frame runs after the visitor has already scrolled.
    // Imported here, it downloads after the page is on screen.
    (async () => {
      const [{default: gsap}, {ScrollTrigger}] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      context = gsap.context(() => {
        gsap.fromTo(
          ".hero-visual-shell",
          // No `filter` on either end: it was blur(0px) -> blur(0px), which
          // animates nothing but still puts the hero — the largest element on the
          // page, and the one holding the 3D scene — behind a filter layer that
          // the browser re-rasterises for the whole scrub.
          {scale: 1,rotate: 0},
          {
            scale: 1.18,
            rotate: 1.2,
            ease: "none",
            scrollTrigger: {
              trigger: heroRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          },
        );

        if (document.querySelector(".ai-label")) {
          gsap.to(".ai-label", {
            opacity: 0,
            y: -20,
            stagger: 0.04,
            ease: "none",
            scrollTrigger: {
              trigger: heroRef.current,
              start: "30% top",
              end: "80% top",
              scrub: true,
            },
          });
        }
      },heroRef);
    })();

    return () => {
      cancelled = true;
      context?.revert();
    };
  },[]);

  return (
    <section ref={heroRef} id="top" className="hero-shell">
      {/* The hero's own grid. The page-wide layer in HomePage cannot reach here:
          .hero-shell paints an opaque dark gradient over it. Brighter strokes
          than the page layer, because this is the one dark field on the page. */}
      <div className="hero-grid-layer" aria-hidden="true">
        <ShapeGrid
          shape="square"
          direction="diagonal"
          speed={0.1}
          squareSize={90}
          hoverTrailAmount={5}
          borderColor="rgba(255, 255, 255, 0.16)"
          hoverFillColor="rgba(45, 212, 191, 0.26)"
          /* No vignette: at full strength it flooded the hero's corners and
             took the teal glow behind the 3D scene with them. */
          vignetteColor="rgba(2, 6, 23, 0)"
        />
      </div>

      <div className="hero-word" aria-hidden="true">
        CAREERVEDA
      </div>
      <div className="hero-vignette" />

      <div className="hero-layout">
        <motion.div
          className="hero-copy"
          initial={{opacity: 0,y: 24}}
          animate={{opacity: 1,y: 0}}
          transition={{duration: 0.7,ease: "easeOut"}}
        >
          <p className="eyebrow">From Learning to Placement — We Guide Every Step</p>
          <h1>Launch Your Career with Industry-Led Programs</h1>
          <p>
            Master Data Analytics, Product Management, Data Science and Generative AI
            through live classes, hands-on projects, expert mentorship, and dedicated
            placement support designed to help you become job-ready.
          </p>
          <p className="trust-line text-sm font-semibold text-slate-200/80">
            Personalized learning, expert mentorship, interview support and 100% placement focus
          </p>
          <div className="hero-actions">
            <Link className="primary-action" to="/#consultation">
              Get in Touch
            </Link>
            <Link className="secondary-action" to="/programs">
              Explore Programs
            </Link>
          </div>
        </motion.div>

        <SplineHeroScene sceneUrl={SPLINE_SCENE_URL} />
      </div>

      <div className="stat-strip">
        {stats.map(([value,label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Hero;