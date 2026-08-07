import {Suspense, useRef} from "react";
import {useInView} from "framer-motion";

/* Wraps a heavy, below-the-fold component so its chunk is not fetched until the
   reader is actually heading towards it.

   React.lazy() alone does not do this. It splits the code into its own file, but
   the import still resolves the moment the component mounts — and a component
   inside a page mounts with the page, fold or no fold. That is how the home page
   ended up downloading three.js: the effect was lazy, but it was also on screen
   as far as React was concerned.

   The placeholder holds the section's height so nothing below it jumps when the
   real component arrives. `once` keeps it mounted after the first hit — scrolling
   back up should not tear the section down. */
const DeferUntilVisible = ({children, minHeight = 0, margin = "300px", className}) => {
  const ref = useRef(null);
  const isNear = useInView(ref, {once: true, margin});

  return (
    <div ref={ref} className={className} style={minHeight ? {minHeight} : undefined}>
      {isNear ? <Suspense fallback={null}>{children}</Suspense> : null}
    </div>
  );
};

export default DeferUntilVisible;
