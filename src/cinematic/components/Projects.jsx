import {useEffect, useRef} from "react";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {createPinnedScrub} from "../fx/pinned";
import {reducedMotionNow} from "../fx/registry";
import {projectsData} from "../data";
import {SectionLabel} from "./Atmosphere";

const MQ_DESKTOP = "(min-width: 900px)";

const N = projectsData.length;

/* Real category labels for the eight exhibited builds. Kept in the component
   because they are editorial copy for this presentation, not new projects. */
const CATEGORY = [
  "Enterprise AI",
  "Business Intelligence",
  "Enterprise AI",
  "Research Platform",
  "Agent Protocols",
  "Data Intelligence",
  "Evaluation",
  "Security",
];

/* The scroll sequence: the center hero is Enterprise Knowledge Copilot (index
   2) on entry, then each project takes a turn owning the center. */
const ORDER = [2, 0, 3, 6, 4, 1, 7, 5];

/* Center stage each project owns, as progress [0,1]. */
const tFor = new Array(N);
ORDER.forEach((project, s) => {
  tFor[project] = s / (N - 1);
});

/* Resting slots — one per project. x/y are fractions of the stage; w is card
   width as a fraction of stage width; z is camera depth (positive = closer);
   ry/rz are rotations; bri/blur dim distant planes; par drives cursor
   parallax per tier. The wall reads: two large projects on top, medium ones
   on the sides, small ones at the bottom corners, two rear screens forming
   the upper background wall. */
const SLOTS = [
  {x: 0.21, y: 0.13, z: -80,  w: 0.19, ry: 12,  rz: -5,  bri: 0.78, blur: 0.28, par: 5, tier: "front"},
  {x: 0.79, y: 0.13, z: -80,  w: 0.19, ry: -12, rz: 5,   bri: 0.78, blur: 0.28, par: 5, tier: "front"},
  {x: 0.5,  y: 0.09, z: -215, w: 0.16, ry: 0,   rz: 0,   bri: 0.55, blur: 1.2,  par: 3, tier: "back"},
  {x: 0.4,  y: 0.45, z: -35,  w: 0.15, ry: 10,  rz: -4,  bri: 0.82, blur: 0.18, par: 6, tier: "front"},
  {x: 0.6,  y: 0.45, z: -35,  w: 0.15, ry: -10, rz: 4,   bri: 0.82, blur: 0.18, par: 6, tier: "front"},
  {x: 0.17, y: 0.78, z: -20,  w: 0.125, ry: 8,  rz: 3,   bri: 0.86, blur: 0.1,  par: 6, tier: "front"},
  {x: 0.83, y: 0.78, z: -20,  w: 0.125, ry: -8, rz: -3,  bri: 0.86, blur: 0.1,  par: 6, tier: "front"},
  {x: 0.5,  y: 0.09, z: -315, w: 0.15, ry: 0,   rz: -2,  bri: 0.5,  blur: 1.7,  par: 3, tier: "back"},
];

/* The hero slot the active project grows into: centered, largest, straight-on. */
const HERO = {x: 0.5, y: 0.5, z: 150, w: 0.34, ry: 0, rz: 0, bri: 1, blur: 0, par: 8};

const lerp = (a, b, f) => a + (b - a) * f;
const smoothstep = (t) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
};

const GalleryCard = ({project, index, state}) => {
  const category = CATEGORY[index];
  const num = `P${String(index + 1).padStart(2, "0")}`;
  return (
    <div
      className={`ga-gallery-card-inner ga-gallery-accent--${project.accent}`}
      data-state={state}
      data-cursor
    >
      <span className="ga-gallery-lid" aria-hidden="true" />
      <div className="ga-gallery-laptop">
        <div className="ga-gallery-screen">
          <div className="ga-gallery-screen-bar">
            <span className="ga-gallery-screen-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="ga-gallery-screen-route">{num} · {project.accent}</span>
          </div>
          <div className="ga-gallery-screen-body">
            <span className="ga-gallery-screen-prompt" aria-hidden="true">
              <i>~/</i>
              <i>run</i>
              <i>--project</i>
              <i>{num.toLowerCase()}</i>
            </span>
            <span className="ga-gallery-screen-kicker">{category}</span>
            <span className="ga-gallery-screen-desc">{project.description}</span>
            <span className="ga-gallery-screen-chips">
              {project.stack.map((t) => (
                <em key={t}>{t}</em>
              ))}
            </span>
            <span className="ga-gallery-screen-caret" aria-hidden="true" />
          </div>
        </div>
        <span className="ga-gallery-laptop-base" aria-hidden="true">
          <i />
        </span>
      </div>
      <div className="ga-gallery-headline">
        <span className="ga-gallery-num">{num}</span>
        <h3>{project.name}</h3>
      </div>
      <span className="ga-gallery-cta">
        View project <em aria-hidden="true">→</em>
      </span>
      <span className="ga-gallery-edge" aria-hidden="true" />
    </div>
  );
};

export const ProjectsSection = () => {
  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const stageRef = useRef(null);
  const cardsRef = useRef(null);
  const bgRef = useRef(null);
  const reflectRef = useRef(null);
  const cardEls = useRef([]);
  const listRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return undefined;
    const reduced = reducedMotionNow();

    /* Mobile list: the row crossing mid-screen becomes the lit "hero". */
    if (!window.matchMedia(MQ_DESKTOP).matches) {
      const rows = Array.from(listRef.current?.children || []);
      if (reduced || !rows.length) return undefined;
      const sts = rows.map((row) =>
        ScrollTrigger.create({
          trigger: row,
          start: "top 60%",
          end: "bottom 40%",
          onToggle: (self) => {
            row.dataset.state = self.isActive ? "active" : "front";
          },
        }),
      );
      rows.forEach((row) => {
        row.dataset.state = "front";
      });
      return () => sts.forEach((st) => st.kill());
    }

    let W = 0;
    let H = 0;
    const measure = () => {
      W = stage.clientWidth;
      H = stage.clientHeight;
    };
    measure();

    const boot = {p: 0};
    const mouse = {x: 0, y: 0, tx: 0, ty: 0};

    const apply = (p) => {
      if (!W || !H) return;
      const mx = mouse.x;
      const my = mouse.y;

      /* Gentle camera drift — the wall leans with the cursor. */
      if (cardsRef.current) {
        cardsRef.current.style.transform =
          `rotateX(${(my * 1.4).toFixed(2)}deg) rotateY(${(mx * 2).toFixed(2)}deg)`;
      }
      if (bgRef.current) {
        bgRef.current.style.transform =
          `translate3d(${(mx * 2).toFixed(1)}px, ${(my * 2).toFixed(1)}px, 0) scale(1.05)`;
      }

      let activeCount = 0;

      cardEls.current.forEach((el, i) => {
        if (!el) return;
        const slot = SLOTS[i];
        const d = Math.abs(p - tFor[i]) * N;
        const a = smoothstep(1 - Math.min(1, d));
        if (a > 0.5) activeCount += 1;

        const x = lerp(slot.x, HERO.x, a);
        const y = lerp(slot.y, HERO.y, a);
        const z = lerp(slot.z, HERO.z, a);
        const w = lerp(slot.w, HERO.w, a) * W;
        const bri = lerp(slot.bri, HERO.bri, a);
        const blur = lerp(slot.blur, HERO.blur, a);
        const ry = lerp(slot.ry, HERO.ry, a);
        const rz = lerp(slot.rz, HERO.rz, a);
        const par = lerp(slot.par, HERO.par, a);
        const ox = mx * par;
        const oy = my * par * 0.7;

        el.style.width = `${w.toFixed(1)}px`;
        el.style.transform =
          `translate(-50%, -50%) translate3d(${((x - 0.5) * W + ox).toFixed(1)}px, ` +
          `${((y - 0.5) * H + oy).toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(1)}deg) ` +
          `rotateZ(${rz.toFixed(1)}deg)`;
        el.style.filter = `brightness(${bri.toFixed(3)}) blur(${blur.toFixed(2)}px)`;
        el.style.zIndex = String(Math.round(1000 + z + a * 200));
        el.dataset.state = a > 0.55 ? "active" : slot.tier;
      });

      stage.classList.toggle("ga-gallery-front", activeCount > 0);

      const reflect = reflectRef.current;
      if (reflect) {
        const breathe = Math.sin(p * Math.PI * 2);
        reflect.style.width = `${(HERO.w * W * (0.92 + 0.05 * breathe)).toFixed(0)}px`;
        reflect.style.opacity = (activeCount
          ? (0.52 + 0.05 * breathe).toFixed(3)
          : "0");
        reflect.style.transform =
          `translate(-50%, -12%) scale(${(1 + breathe * 0.05).toFixed(3)})`;
      }
    };

    const onPointer = (e) => {
      const r = stage.getBoundingClientRect();
      mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    stage.addEventListener("pointermove", onPointer, {passive: true});

    let raf = 0;
    let running = false;
    const frame = () => {
      if (!running) return;
      mouse.x += (mouse.tx - mouse.x) * 0.07;
      mouse.y += (mouse.ty - mouse.y) * 0.07;
      apply(boot.p);
      raf = requestAnimationFrame(frame);
    };

    if (!reduced) {
      running = true;
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => {
      measure();
      apply(boot.p);
    };
    window.addEventListener("resize", onResize);

    /* The fixed cinematic navbar sits above this dark room. While the room is
       on screen, give it the room's surface so the scene stays continuous. */
    const io = new IntersectionObserver((entries) => {
      document.body.classList.toggle("ga-gallery-active", entries[0].isIntersecting);
    });
    io.observe(section);

    let cleanup = () => {};
    if (!reduced) {
      cleanup = createPinnedScrub({
        section,
        pinEl: pinRef.current,
        end: "+=820%",
        scrub: 1.2,
        onUpdate: (proxy) => {
          boot.p = proxy.p;
        },
      });
    } else {
      apply(0);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      stage.removeEventListener("pointermove", onPointer);
      io.disconnect();
      document.body.classList.remove("ga-gallery-active");
      cleanup();
    };
  }, []);

  return (
    <section className="ga-projects ga-gallery" id="ga-projects" ref={sectionRef}>
      <div className="ga-gallery-pin" ref={pinRef}>
        <div className="ga-gallery-bg" ref={bgRef} aria-hidden="true">
          <span className="ga-gallery-halo" />
          <span className="ga-gal-wall" />
          <span className="ga-gal-streak ga-gal-streak--a" />
          <span className="ga-gal-streak ga-gal-streak--b" />
          <span className="ga-gallery-haze" />
          <span className="ga-gallery-floor" />
        </div>

        <div className="ga-gallery-rings" aria-hidden="true">
          <span className="ga-gallery-ring ga-gallery-ring--outer" />
          <span className="ga-gallery-ring ga-gallery-ring--mid" />
          <span className="ga-gallery-ring ga-gallery-ring--inner" />
        </div>

        <header className="ga-gal-head">
          <div className="ga-gal-head-l">
            <span className="ga-gal-label">Projects</span>
            <span className="ga-gal-rule" aria-hidden="true" />
            <SectionLabel index="08">Portfolio</SectionLabel>
          </div>
          <div className="ga-gal-head-r" aria-hidden="true">
            <span>Explore</span>
            <span>Interact</span>
          </div>
        </header>

        <div className="ga-gal-side ga-gal-side--left" aria-hidden="true">
          <span>Ideas</span>
          <span>Interfaces</span>
          <span>Experiences</span>
          <span>Real Impact</span>
        </div>

        <div className="ga-gal-side ga-gal-side--right" aria-hidden="true">
          <span>Foundation</span>
          <span>Orchestration</span>
          <span>Safety</span>
        </div>

        <div className="ga-gallery-stage" ref={stageRef}>
          <div className="ga-gallery-cards" ref={cardsRef}>
            {projectsData.map((p, i) => (
              <div
                className="ga-gallery-card"
                key={p.id}
                ref={(el) => {
                  if (el) cardEls.current[i] = el;
                }}
              >
                <GalleryCard project={p} index={i} />
              </div>
            ))}
          </div>
          <span className="ga-gallery-reflect" ref={reflectRef} aria-hidden="true" />
        </div>

        <p className="ga-gallery-note">scroll walks the gallery — hover a project to lift it</p>

        <footer className="ga-gal-foot">
          <span className="ga-gal-foot-l">Real projects · real stories</span>
          <span className="ga-gal-foot-r">Designing a brighter tomorrow</span>
        </footer>
      </div>

      {/* Mobile composition — one hero plus the surrounding builds, stacked */}
      <div className="ga-gallery-list" ref={listRef}>
        {projectsData.map((p, i) => (
          <div
            className={`ga-gallery-row ${i === ORDER[0] ? "ga-gallery-row--hero" : ""}`}
            key={p.id}
            data-state={i === ORDER[0] ? "active" : "front"}
          >
            <GalleryCard project={p} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProjectsSection;