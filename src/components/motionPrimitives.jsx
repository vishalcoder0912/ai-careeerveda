import React, {createContext, useContext, useEffect, useLayoutEffect, useRef, useState} from "react";

import "./motion-primitives.css";

/* Scroll reveals and staggered entries.

   These used to be framer-motion: `motion` elements with variants, whileInView
   and viewport={{once, amount}}, which pulled the whole animation library into
   the entry chunk (~127 KB minified) for what are two composited properties on
   a one-time entry. Now an IntersectionObserver flips a class and CSS handles
   the transition — the same easing and the same movement, declared in
   motion-primitives.css, with reduced motion falling out of the same media
   query the rest of the site already reads.

   The public props are unchanged so no call site had to move:
     Reveal        — one element, animates when it enters view
     StaggerGroup  — children (StaggerItems) reveal in sequence when it enters
     StaggerItem   — a child of StaggerGroup; `interactive` adds the hover lift
   `amount` maps to the IntersectionObserver threshold; a non-numeric value
   ("some", as BlogPage passes) means "any part visible" and becomes 0. */

const useInViewOnce = ({ref, amount, rootMargin}) => {
  const [inView, setInView] = useState(false);

  // An element already inside the untouched first viewport must never be
  // painted hidden. The observer path answers one tick after mount — under CPU
  // pressure, seconds — long enough to become the page's LCP
  // ("element render delay") on every route whose hero heading is a Reveal,
  // and long enough to flash every above-fold heading invisible as the app
  // boots over its own prerendered markup. This layout-effect check runs
  // before the first paint: boot-time, above-fold content renders visible
  // immediately.
  //
  // Gated on scrollY being at the top: a section that mounted because a
  // READING visitor scrolled to it (every DeferUntilVisible child) must keep
  // its observer-driven entrance — that reveal is the animation, and this hook
  // has no business cancelling it.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return undefined;
    if (window.scrollY > 0) return undefined;
    const rect = el.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < viewport && rect.bottom > 0) {
      setInView(true);
    }
    return undefined;
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }

    const threshold = typeof amount === "number" ? Math.min(1, Math.max(0, amount)) : 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {threshold, rootMargin},
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [amount, rootMargin, ref]);

  return inView;
};

// Reveal a single element on scroll. `as` picks the underlying tag.
// forwardRef so callers can reach the underlying DOM node (e.g. to use it as a
// pointer eventSource); passing no ref is unchanged.
export const Reveal = React.forwardRef(
  ({as = "div", amount = 0.2, className, children, ...rest}, ref) => {
    const ownRef = useRef(null);
    const mergeRef = (node) => {
      ownRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    const inView = useInViewOnce({ref: ownRef, amount, rootMargin: "0px"});

    const Comp = as;
    return (
      <Comp
        ref={mergeRef}
        className={`cv-reveal${inView ? " is-in-view" : ""} ${className ?? ""}`.trim()}
        {...rest}
      >
        {children}
      </Comp>
    );
  },
);
Reveal.displayName = "Reveal";

// A child of StaggerGroup, numbered so its transition can start on its own
// beat. The group's entry is the trigger for all of them — the observer fires
// on the container, and the children only ever add or remove a class.
const StaggerContext = createContext(null);

export const StaggerGroup = ({as = "div", stagger = 0.1, amount = 0.2, className, children, ...rest}) => {
  const ref = useRef(null);
  const inView = useInViewOnce({ref, amount, rootMargin: "0px"});
  // Render-order counter, so the first child gets delay 0, the next stagger,
  // and so on. Lives in a ref because it is a running total, not state.
  const indexRef = useRef(0);
  // A fresh value each render: StaggerItems read it during their own render,
  // so the counter must not be shared across remounts of the group.
  const value = {stagger, inView, next: () => indexRef.current++};

  const Comp = as;
  return (
    <Comp ref={ref} className={className} {...rest}>
      <StaggerContext.Provider value={value}>{children}</StaggerContext.Provider>
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
  // Index is consumed once per mounted item; a caller that does not wrap the
  // item in a StaggerGroup gets delay 0, which is just an immediate reveal.
  // (useState's lazy initializer rather than a ref write: the hooks lint rule
  // forbids touching ref.current during render, and the initializer runs only
  // on mount — exactly the once-per-item consumption wanted.)
  const [index] = useState(() => (ctx ? ctx.next() : 0));

  const delay = `calc(0.05s + ${index} * ${ctx ? ctx.stagger : 0}s)`;

  const Comp = as;
  const classes = [
    "cv-stagger-item",
    ctx?.inView ? "is-in-view" : "",
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