// Framer-motion variant objects and factories, kept out of motionPrimitives.jsx
// so that file exports only React components — otherwise Fast Refresh can't
// preserve component state on save and has to full-reload the page.

// Shared easing — matches the cubic-bezier already used in OutcomeStories.
const EASE = [0.22, 1, 0.36, 1];

/* Every reveal here animates opacity and transform only.

   They used to animate `filter: blur()` too — 8px resolving to 0 on a single
   reveal, 6px on every staggered card. Opacity and transform are handed to the
   compositor and cost the main thread nothing per frame. A filter is not: the
   browser re-rasterises the element on every frame of the animation, and a blur
   samples a neighbourhood around each pixel, so the cost scales with the area of
   the thing being revealed. On the home page that is full-width cards and section
   headings, and it was the single biggest item in the profile — 704ms of style
   and layout, with framer-motion's frames as the three longest tasks on the page.

   The blur was doing about 100ms of visual work per reveal that nobody would
   miss; the fade and the rise carry the effect on their own. */
export const fadeUpVariants = {
  hidden: {opacity: 0, y: 28},
  visible: {opacity: 1, y: 0, transition: {duration: 0.7, ease: EASE}},
};

// Staggered child reveal used inside StaggerGroup. The rise is proportional to
// the duration: a shorter reveal that still travels 40px reads as a jerk rather
// than a lift, so a caller asking for a quicker card gets a shorter throw too.
export const makeItemVariants = (duration = 0.65) => ({
  hidden: {opacity: 0, y: 40 * (duration / 0.65), scale: 0.97},
  visible: {opacity: 1, y: 0, scale: 1, transition: {duration, ease: EASE}},
});

export const itemVariants = makeItemVariants();

// Container that releases its children one after another.
export const containerVariants = (stagger = 0.1) => ({
  hidden: {},
  visible: {transition: {staggerChildren: stagger, delayChildren: 0.05}},
});

// Smooth hover lift for interactive cards. Border/shadow are handled in CSS.
export const hoverLift = {
  whileHover: {y: -6, transition: {type: "spring", stiffness: 320, damping: 22}},
  whileTap: {scale: 0.99},
};
