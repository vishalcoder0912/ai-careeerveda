import {Suspense, useEffect, useRef, useState} from "react";

/* Wraps a heavy, below-the-fold component so its chunk is not fetched until the
   reader is actually heading towards it.

   React.lazy() alone does not do this. It splits the code into its own file, but
   the import still resolves the moment the component mounts — and a component
   inside a page mounts with the page, fold or no fold. That is how the home page
   ended up downloading three.js: the effect was lazy, but it was also on screen
   as far as React was concerned.

   The placeholder holds the section's height so nothing below it jumps when the
   real component arrives. `once` keeps it mounted after the first hit — scrolling
   back up should not tear the section down.

   The visibility check is an IntersectionObserver rather than framer-motion's
   useInView: this wrapper's only dependency was that hook, and one API call is
   not worth the animation library in the entry chunk. */
// A bad percent escape in the URL (`#100%off`) makes decodeURIComponent throw
// URIError. In a hash listener that would abort the deep-link lookup entirely,
// so fall back to the literal fragment — it is still a valid element id.
const decodeHashId = () => {
  const hash = window.location.hash.slice(1);
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
};

const DeferUntilVisible = ({children, minHeight = 0, margin = "300px", className}) => {
  const ref = useRef(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsNear(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      {rootMargin: margin},
    );
    observer.observe(el);

    // A deep link can point into a deferred section that is nowhere near the
    // viewport. The hash scroller broadcasts a request; if the requested id is
    // not in the DOM at all it must belong to an unmounted wrapper, so every
    // wrapper mounts and whichever owns the target reveals it. Once the target
    // exists, only its owning wrapper reacts.
    const mountForHash = (event) => {
      const id = event?.detail?.id || decodeHashId();
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) {
        setIsNear(true);
        return;
      }
      if (el.contains(target)) {
        setIsNear(true);
        window.dispatchEvent(new CustomEvent("cv:hash-target-mounted", {detail: {id}}));
      }
    };
    window.addEventListener("hashchange", mountForHash);
    window.addEventListener("cv:hash-target-request", mountForHash);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", mountForHash);
      window.removeEventListener("cv:hash-target-request", mountForHash);
    };
  }, [margin]);

  // The placeholder height lasts only until the chunk arrives, so a section
  // that renders nothing (e.g. no featured alumni) leaves no blank gap.
  const placeholder = minHeight ? <div style={{minHeight}} /> : null;

  return (
    <div ref={ref} className={className}>
      {isNear ? <Suspense fallback={placeholder}>{children}</Suspense> : placeholder}
    </div>
  );
};

export default DeferUntilVisible;