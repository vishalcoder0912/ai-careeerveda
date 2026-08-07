import React from "react";
import {motion,useReducedMotion} from "framer-motion";

import {fadeUpVariants, itemVariants, containerVariants, hoverLift} from "./motionVariants";

// Reveal a single element on scroll. `as` picks the underlying tag.
// forwardRef so callers can reach the underlying DOM node (e.g. to use it as a
// pointer eventSource); passing no ref is unchanged.
export const Reveal = React.forwardRef(
  ({as = "div", variants = fadeUpVariants, amount = 0.2, className, children, ...rest}, ref) => {
    const reduce = useReducedMotion();
    const Comp = motion[as] ?? motion.div;
    return (
      <Comp
        ref={ref}
        className={className}
        variants={reduce ? undefined : variants}
        initial={reduce ? false : "hidden"}
        whileInView={reduce ? undefined : "visible"}
        viewport={{once: true, amount}}
        {...rest}
      >
        {children}
      </Comp>
    );
  },
);
Reveal.displayName = "Reveal";

// Container whose StaggerItem children reveal in sequence when it enters view.
export const StaggerGroup = ({as = "div", stagger = 0.1, amount = 0.2, className, children, ...rest}) => {
  const reduce = useReducedMotion();
  const Comp = motion[as] ?? motion.div;
  return (
    <Comp
      className={className}
      variants={reduce ? undefined : containerVariants(stagger)}
      initial={reduce ? false : "hidden"}
      whileInView={reduce ? undefined : "visible"}
      viewport={{once: true, amount}}
      {...rest}
    >
      {children}
    </Comp>
  );
};

// A child of StaggerGroup. Set `interactive` to add the smooth hover lift.
// `variants` is an explicit prop rather than something callers pass through
// `rest`, so that a caller overriding the reveal can't also reinstate motion for
// a reader who asked for none.
export const StaggerItem = ({
  as = "div",
  interactive = false,
  variants = itemVariants,
  className,
  children,
  ...rest
}) => {
  const reduce = useReducedMotion();
  const Comp = motion[as] ?? motion.div;
  const hover = !reduce && interactive ? hoverLift : {};
  return (
    <Comp
      className={className}
      variants={reduce ? undefined : variants}
      {...hover}
      {...rest}
    >
      {children}
    </Comp>
  );
};
