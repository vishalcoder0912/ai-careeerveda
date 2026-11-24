import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";

import "./motion-primitives.css";

/* Scroll reveals and staggered entries.

   These used to be framer-motion: `motion` elements with variants, whileInView
   and viewport={{once, amount}}, which pulled the whole animation library into
   the entry chunk (~127 KB minified) for what are two composited properties on
   a one-time entry. Now an IntersectionObserver flips an attribute and CSS
   handles the transition — the same easing and the same movement, declared in
   motion-primitives.css, with reduced motion falling out of the same media
   query the rest of the site already reads.

   The public props are unchanged so no call site had to move:
     Reveal        — one element, animates when it enters view
     StaggerGroup  — children (StaggerItems) reveal in sequence when it enters
     StaggerItem   — a child of StaggerGroup; `interactive` adds the hover lift
   `amount` maps to the IntersectionObserver threshold; a non-numeric value
   ("some", as BlogPage passes) means "any part visible" and becomes 0. */

// Whether the visitor has scrolled since the app started. Registered when this
// module loads, i.e. during boot, before anything renders.
let scrolledSinceBoot = false;
if (typeof window !== "undefined") {
  window.addEventListener(
    "scroll",
    () => {
      scrolledSinceBoot = true;
    },
    {once: true, passive: true},
  );
}

// Entering view is a data attribute, not React state: React never writes
// `data-in-view` (it is not a prop), so a re-render of the host element cannot
// wipe it, and flipping it costs no render at all — the browser starts the CSS
// transition when the attribute lands.
const revealNow = (el) => {
  if (el) el.dataset.inView = "true";
};

// Same flag, but painted on the first frame instead of fading in. Used for
// content that is already on screen when it mounts: the element is inert until
// it is inserted, so dropping the transition for this one change is what keeps
// the first paint at full opacity (and the LCP from being delayed by a 0.7s
// fade). The inline override is lifted on the next frame, after the browser has
// painted, without changing the opacity again — so nothing re-animates.
const revealInstantly = (el) => {
  if (!el) return;
  el.style.transition = "none";
  // "instant" is a distinct value from the observer's "true": the CSS uses it
  // to suppress the 0.9s entrance keyframes too. Disabling only the transition
  // (as this did before) left those animations running, so above-fold LCP text
  // was hidden for up to 0.9s after React re-rendered over the snapshot.
  el.dataset.inView = "instant";
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      el.style.transition = "";
    });
  }
};

// An element already inside the untouched first viewport must never be painted
// hidden. The observer path answers one tick after mount — under CPU pressure,
// seconds — long enough to become the page's LCP ("element render delay") on
// every route whose hero heading is a Reveal, and long enough to flash every
// above-fold heading invisible as the app boots over its own prerendered
// markup. This check runs in the ref callback, before the first paint:
// boot-time, above-fold content renders visible immediately.
//
// Gated on the visitor not having scrolled since boot: a section that mounted
// because a READING visitor scrolled to it (every DeferUntilVisible child) must
// keep its observer-driven entrance — that reveal is the animation, and this
// check has no business cancelling it.
//
// Not gated on scrollY > 0, as it used to be. A phone visitor scrolls the
// prerendered page while the JS is still loading; when React then re-renders
// over it, everything they were looking at was hidden and faded back in — the
// content on screen visibly disappeared. What they can already see stays.
const revealIfAboveFold = (el) => {
  if (!el || typeof window === "undefined") return;
  // At the top (the original rule, which also covers a client-side route change
  // after ScrollToTop) or still where the visitor was when JS booted.
  if (window.scrollY > 0 && scrolledSinceBoot) return;
  const rect = el.getBoundingClientRect();
  const viewport = window.innerHeight || document.documentElement.clientHeight;
  if (rect.top < viewport && rect.bottom > 0) revealInstantly(el);
};

// Reveals the node this ref is attached to: immediately when it mounts above
// the fold, on intersection for everything that starts below it.
//
// The above-fold check lives in the ref callback rather than a mount effect
// because a ref runs during the commit that attaches the node, before paint.
// That keeps the original guarantee (no invisible first paint, no flash on
// hydration) without the mount-only `useState` update the effect needed: there
// is nothing to store, because "in view" is a DOM flag rather than render
// state. Nothing re-renders when a group enters view either — previously the
// group's state change redrew every child just to start their transitions.
const useRevealOnView = ({amount, rootMargin}) => {
  // Hold the node in state, not only in a ref: React can replace the DOM node
  // without changing props, and an effect that read a ref once would then keep
  // observing a detached node while the visible one stayed hidden.
  const [element, setElement] = useState(null);

  const attach = useCallback((node) => {
    revealIfAboveFold(node);
    setElement((current) => (current === node ? current : node));
  }, []);

  useEffect(() => {
    const el = element;
    if (!el || typeof IntersectionObserver === "undefined") {
      revealNow(el);
      return undefined;
    }

    const threshold = typeof amount === "number" ? Math.min(1, Math.max(0, amount)) : 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // An above-fold element was already made fully visible at attach time.
          // Writing "true" here would swap in the keyframe animation and flash
          // the LCP text back to opacity 0 after it had painted.
          if (el.dataset.inView !== "instant") revealNow(el);
          observer.disconnect();
        }
      },
      {threshold, rootMargin},
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [amount, rootMargin, element]);

  return attach;
};

// Reveal a single element on scroll. `as` picks the underlying tag.
// forwardRef so callers can reach the underlying DOM node (e.g. to use it as a
// pointer eventSource); passing no ref is unchanged.
export const Reveal = React.forwardRef(
  ({as = "div", amount = 0.2, className, children, ...rest}, ref) => {
    const attach = useRevealOnView({amount, rootMargin: "0px"});
    // One stable callback ref for both the reveal hook and the caller's ref, so
    // React attaches the node once instead of detaching and re-attaching it on
    // every render.
    const mergeRef = useCallback(
      (node) => {
        attach(node);
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [attach, ref],
    );

    const Comp = as;
    return (
      <Comp ref={mergeRef} className={`cv-reveal ${className ?? ""}`.trim()} {...rest}>
        {children}
      </Comp>
    );
  },
);
Reveal.displayName = "Reveal";

// A child of StaggerGroup, numbered so its transition can start on its own
// beat. The group's entry is the trigger for all of them — the observer fires
// on the container, and the children only ever add a class.
const StaggerContext = createContext(null);

// Each child gets its own provider, so its value must be built here rather than
// in the group's map (hooks cannot run in a callback). Memoizing on the two real
// inputs keeps the object identity stable across unrelated group renders: a
// fresh `{stagger, index}` would force every StaggerItem to redraw each time.
const StaggerSlot = ({stagger, index, children}) => {
  const value = useMemo(() => ({stagger, index}), [stagger, index]);
  return <StaggerContext.Provider value={value}>{children}</StaggerContext.Provider>;
};

export const StaggerGroup = ({as = "div", stagger = 0.1, amount = 0.2, className, children, ...rest}) => {
  const attach = useRevealOnView({amount, rootMargin: "0px"});
  const Comp = as;

  // Derive the beat from the CURRENT children instead of a running counter. A
  // counter kept growing as items were filtered/unmounted/re-added, so a card
  // restored after a filter change could inherit delay 20 (2s of "nothing
  // happened") even though it was the first item on screen.
  const items = React.Children.toArray(children);

  return (
    <Comp
      ref={attach}
      // The sentinel class is what motion-primitives.css hangs the group's
      // entered state on; the caller's class is untouched.
      className={["cv-stagger-group", className ?? ""].filter(Boolean).join(" ")}
      {...rest}
    >
      {items.map((child, index) => (
        <StaggerSlot key={child.key ?? index} stagger={stagger} index={index}>
          {child}
        </StaggerSlot>
      ))}
    </Comp>
  );
};

export const StaggerItem = ({
  as = "div",
  interactive = false,
  className,
  children,
  style,
  ...rest
}) => {
  const ctx = useContext(StaggerContext);
  // A StaggerItem outside a group still reveals, with no stagger delay.
  const index = ctx ? ctx.index : 0;
  const delay = `calc(0.05s + ${index} * ${ctx ? ctx.stagger : 0}s)`;

  const Comp = as;
  const classes = [
    "cv-stagger-item",
    interactive ? "cv-interactive" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Comp
      className={classes}
      // Merged, not replaced: a caller's own style (an accent variable, say)
      // used to wipe the stagger delay, so those items all entered at once.
      style={ctx ? {["--cv-delay"]: delay, ...style} : style}
      {...rest}
    >
      {children}
    </Comp>
  );
};
