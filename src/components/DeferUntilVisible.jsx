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
    return () => observer.disconnect();
  }, [margin]);

  return (
    <div ref={ref} className={className} style={minHeight ? {minHeight} : undefined}>
      {isNear ? <Suspense fallback={null}>{children}</Suspense> : null}
    </div>
  );
};

export default DeferUntilVisible;