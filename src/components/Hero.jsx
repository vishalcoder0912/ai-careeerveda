import {Link} from "react-router-dom";
import {SPLINE_SCENE_URL} from "../config/spline";
import SplineHeroScene from "./SplineHeroScene";

const Hero = ({stats}) => {
  /* ponytail: keep the decorative robot static; scroll-linked transforms made
     the largest visual repaint every frame and added no product value. */
  /*
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
  */

  return (
    <section id="top" className="hero-shell">
      {/* No canvas here anymore. This section's ShapeGrid used to be the
          site's ONE grid, anchored to this box so the navbar strip above and
          the hero below shared one origin — but a document-anchored lattice can
          only serve its own section. The single grid now lives in
          CareerVedaBackground (Layout-level): one CursorGrid fixed to the
          viewport at the same 90px spacing, running behind the navbar, this
          hero and every section below it without resetting. The layer div
          itself stays — navbar-hero-merge.css paints the teal atmosphere that
          hugs the top of the document as its ::after. */}
      <div className="hero-grid-layer" aria-hidden="true" />

      <div className="hero-word" aria-hidden="true">
        CAREERVEDA
      </div>
      <div className="hero-vignette" />

      <div className="hero-layout">
        <div className="hero-copy cv-hero-enter">
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
        </div>

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
