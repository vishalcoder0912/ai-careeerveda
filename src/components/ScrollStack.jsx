// ScrollStack — React Bits (JavaScript + CSS variant). Cards pin with
// position: sticky and stack as the page (or the container) scrolls; buried
// cards scale, dim, blur or tilt by how many cards cover them.
// https://reactbits.dev
import { Children, Fragment, isValidElement, useLayoutEffect, useRef } from 'react';
import './ScrollStack.css';

const resolveOffset = (value, size) => {
  if (typeof value === 'number') return value;
  const text = String(value).trim();
  if (text.endsWith('%')) return (parseFloat(text) / 100) * size;
  return parseFloat(text) || 0;
};

const toLength = value => (typeof value === 'number' ? `${value}px` : value);

const scrollsInside = (node, stop, delta) => {
  for (let element = node; element && element !== stop; element = element.parentElement) {
    if (element.scrollHeight <= element.clientHeight + 1) continue;
    const overflow = getComputedStyle(element).overflowY;
    if (overflow !== 'auto' && overflow !== 'scroll') continue;
    if (delta > 0 ? element.scrollTop + element.clientHeight < element.scrollHeight - 1 : element.scrollTop > 0) {
      return true;
    }
  }
  return false;
};

export const ScrollStackItem = ({ children, itemClassName = '', style }) => (
  <div className={`scroll-stack-card ${itemClassName}`.trim()} style={style}>
    {children}
    <span className="scroll-stack-card__shade" aria-hidden="true" />
  </div>
);

const ScrollStack = ({
  children,
  className = '',
  itemDistance = 100,
  itemStackDistance = 24,
  stackPosition = '15%',
  itemScale = 0.05,
  baseScale = 0.8,
  dimAmount = 0.2,
  blurAmount = 0,
  tiltAmount = 0,
  rotationAmount = 0,
  holdDistance = 200,
  smoothScroll = true,
  snap = false,
  useWindowScroll = false,
  onStackComplete
}) => {
  const rootRef = useRef(null);
  const innerRef = useRef(null);
  const endRef = useRef(null);
  const settingsRef = useRef(null);
  const scheduleRef = useRef(null);
  const measureRef = useRef(null);
  const items = Children.toArray(children);

  useLayoutEffect(() => {
    settingsRef.current = {
      itemDistance,
      itemStackDistance,
      stackPosition,
      itemScale,
      baseScale,
      dimAmount,
      blurAmount,
      tiltAmount,
      rotationAmount,
      holdDistance,
      smoothScroll,
      snap,
      onStackComplete
    };
    // Props can change geometry (itemDistance, stackPosition, ...). Re-measure
    // before the next paint so a scrub never runs against stale card sizes.
    measureRef.current?.();
    scheduleRef.current?.();
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    const inner = innerRef.current;
    const end = endRef.current;
    if (!root || !inner || !end) return undefined;

    const windowed = useWindowScroll;
    const target = windowed ? window : root;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cache = new Map();
    let frame = 0;
    let glide = 0;
    let rest = 0;
    let complete = false;
    let gliding = false;
    let pressed = false;
    let current = 0;
    let goal = 0;
    let written = 0;
    let last = 0;
    let points = [];
    let reach = 0;
    // Geometry is measured once (and on resize/content change) instead of on
    // every scroll frame. Reading offsetHeight/getBoundingClientRect for every
    // slot mid-scrub forces a layout flush each frame — the source of the
    // "heavy" feel on long pages. The cached values live in scroll-content
    // coordinates, so they stay valid as the window scrolls.
    let metrics = null;
    let slots = [];
    let lastWidth = 0;

    const readScroll = () => (windowed ? window.scrollY : root.scrollTop);
    const maxScroll = () =>
      windowed ? document.documentElement.scrollHeight - window.innerHeight : root.scrollHeight - root.clientHeight;
    const writeScroll = value => {
      written = value;
      target.scrollTo({ top: value, behavior: 'instant' });
    };

    const write = (key, value, apply) => {
      if (cache.get(key) === value) return false;
      cache.set(key, value);
      apply(value);
      return true;
    };

    // One layout pass, done off the scroll path. Everything the scrub needs is
    // stored in scroll-content coordinates; update() then derives live positions
    // from readScroll() alone, so a scrub never forces layout.
    const measure = () => {
      const settings = settingsRef.current;
      if (!settings) return;
      slots = Array.from(inner.children).filter(child => child.hasAttribute('data-stack-slot'));
      if (!slots.length) return;

      const viewHeight = windowed ? window.innerHeight : root.clientHeight;
      const viewTop = windowed ? 0 : root.getBoundingClientRect().top + root.clientTop;
      const stackTop = resolveOffset(settings.stackPosition, viewHeight);
      const offset = settings.itemStackDistance;
      const padTop = windowed ? 0 : stackTop;
      const base = inner.getBoundingClientRect().top + readScroll() - viewTop;

      const heights = [];
      const natural = [];
      // offsetTop cannot be used here: for a sticky element it reports the
      // current stuck position, not the static one. Accumulate the same
      // card-height + itemDistance steps the layout uses instead, so the
      // cached positions hold no matter where the reader has scrolled to.
      let flow = padTop;
      slots.forEach(slot => {
        const height = slot.offsetHeight;
        heights.push(height);
        natural.push(base + flow);
        flow += height + settingsRef.current.itemDistance;
      });
      const lastPin = stackTop + (slots.length - 1) * offset;
      const endHeight =
        settings.holdDistance + (windowed ? 0 : Math.max(0, viewHeight - lastPin - heights[heights.length - 1]));

      metrics = {
        viewTop,
        stackTop,
        offset,
        heights,
        natural,
        padTop,
        endHeight,
        reach: Math.max(40, (heights[0] + settings.itemDistance - offset) / 2),
        points: natural.map((top, i) => top - stackTop - i * offset)
      };
      lastWidth = root.clientWidth;
    };

    const update = () => {
      frame = 0;
      const settings = settingsRef.current;
      if (!settings || !metrics) return;
      const {viewTop, stackTop, offset, heights, natural, padTop, endHeight} = metrics;
      const scroll = readScroll();

      let moved = write('padTop', padTop, value => {
        inner.style.paddingTop = `${value}px`;
      });
      moved =
        write('endHeight', endHeight, value => {
          end.style.height = `${value}px`;
        }) || moved;

      points = metrics.points;
      reach = metrics.reach;

      // Sticky positions derived from cached document coordinates + the live
      // scroll offset — no getBoundingClientRect() on the scrub path.
      const tops = natural.map((top, i) => Math.max(viewTop + stackTop + i * offset, top - scroll + viewTop));
      const depths = slots.map(() => 0);
      let lastCover = 0;
      for (let j = 1; j < slots.length; j++) {
        const pinBefore = viewTop + stackTop + (j - 1) * offset;
        const start = pinBefore + heights[j - 1];
        const span = Math.max(1, start - pinBefore - offset);
        const cover = Math.min(1, Math.max(0, (start - tops[j]) / span));
        for (let i = 0; i < j; i++) depths[i] += cover;
        lastCover = cover;
      }

      const dimStep = Math.min(Math.max(settings.dimAmount, 0), 1);
      slots.forEach((slot, i) => {
        const card = slot.firstElementChild;
        if (!card) return;

        if (motion.matches) {
          // Reduced motion removes the depth animation but keeps the same
          // sticky stack, card order and reading flow.
          write(`transform${i}`, '', value => {
            card.style.transform = value;
          });
          write(`filter${i}`, '', value => {
            card.style.filter = value;
          });
          write(`dim${i}`, '0', value => {
            card.style.setProperty('--scroll-stack-dim', value);
          });
          return;
        }

        const depth = depths[i];
        const lean = Math.min(depth, 1);
        const scale = Math.max(Math.min(settings.baseScale, 1), 1 - depth * settings.itemScale);
        const tilt = -lean * settings.tiltAmount;
        const turn = lean * settings.rotationAmount * (i % 2 ? -1 : 1);
        const blur = depth * settings.blurAmount;
        const dim = 1 - Math.pow(1 - dimStep, depth);
        // The press/about stacks use no tilt or rotation. A plain 2D scale
        // composites far more cheaply than a perspective/rotateX 3D context on
        // large, content-heavy cards; keep the full transform only when asked.
        let transform = '';
        if (depth >= 0.0005) {
          transform =
            settings.tiltAmount === 0 && settings.rotationAmount === 0
              ? `scale(${scale.toFixed(4)})`
              : `perspective(1200px) rotateX(${tilt.toFixed(2)}deg) rotate(${turn.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
        }
        write(`transform${i}`, transform, value => {
          card.style.transform = value;
        });
        write(`filter${i}`, blur > 0.01 ? `blur(${blur.toFixed(2)}px)` : '', value => {
          card.style.filter = value;
        });
        write(`dim${i}`, dim.toFixed(3), value => {
          card.style.setProperty('--scroll-stack-dim', value);
        });
      });

      const done = slots.length > 1 && lastCover >= 0.999;
      if (done !== complete) {
        complete = done;
        if (done) settings.onStackComplete?.();
      }

      if (moved) schedule();
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Without clearing the write cache, a preference flip could leave the
    // previous depth transform/filter in place because the neutral value was
    // never written.
    const onMotionChange = () => {
      cache.clear();
      schedule();
    };
    motion.addEventListener?.("change", onMotionChange);

    const step = now => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (Math.abs(readScroll() - written) > 2) {
        gliding = false;
        glide = 0;
        settleSoon();
        return;
      }
      current += (goal - current) * (1 - Math.pow(0.9, dt * 60));
      if (Math.abs(goal - current) < 0.5) current = goal;
      writeScroll(current);
      if (current === goal) {
        gliding = false;
        glide = 0;
        settleSoon();
        return;
      }
      glide = requestAnimationFrame(step);
    };

    const glideTo = value => {
      goal = Math.min(Math.max(value, 0), maxScroll());
      if (motion.matches) {
        writeScroll(goal);
        return;
      }
      if (gliding) return;
      gliding = true;
      current = readScroll();
      written = current;
      last = performance.now();
      glide = requestAnimationFrame(step);
    };

    const settle = () => {
      rest = 0;
      if (!settingsRef.current?.snap || gliding || pressed || !points.length) return;
      const now = readScroll();
      const nearest = points.reduce((best, point) => (Math.abs(point - now) < Math.abs(best - now) ? point : best));
      const gap = Math.abs(nearest - now);
      if (gap > 1 && gap < reach) glideTo(nearest);
    };

    const settleSoon = () => {
      window.clearTimeout(rest);
      rest = window.setTimeout(settle, 140);
    };

    const onScroll = () => {
      schedule();
      if (!gliding) settleSoon();
    };

    const onWheel = event => {
      if (!settingsRef.current?.smoothScroll || motion.matches || event.defaultPrevented || event.ctrlKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const page = windowed ? window.innerHeight : root.clientHeight;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? page : 1);
      if (!delta || scrollsInside(event.target, windowed ? document.body : root, delta)) return;
      const base = gliding ? goal : readScroll();
      if ((delta < 0 && base <= 0) || (delta > 0 && base >= maxScroll() - 0.5)) return;
      event.preventDefault();
      window.clearTimeout(rest);
      glideTo(base + delta);
    };

    const onPress = () => {
      pressed = true;
      window.clearTimeout(rest);
    };

    const onRelease = () => {
      if (!pressed) return;
      pressed = false;
      settleSoon();
    };

    // Re-measure on viewport / card-size changes, never on scroll. Observing
    // the slots (rather than `inner`) avoids a feedback loop: writing padding
    // and the end spacer changes inner's box but never a card's own size.
    measure();
    const rootObserver = new ResizeObserver(() => {
      if (root.clientWidth !== lastWidth) measure();
      schedule();
    });
    rootObserver.observe(root);
    const cardObserver = new ResizeObserver(() => {
      measure();
      schedule();
    });
    slots.forEach(slot => cardObserver.observe(slot));

    const onResize = () => {
      measure();
      schedule();
    };
    // Late-loading media above the stack shifts `inner` without changing any
    // observed box. One re-measure after load keeps the cached document
    // coordinates in sync with the final layout.
    const onLoad = () => {
      measure();
      schedule();
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    target.addEventListener('wheel', onWheel, { passive: false });
    target.addEventListener('pointerdown', onPress, { passive: true });
    window.addEventListener('pointerup', onRelease, { passive: true });
    window.addEventListener('pointercancel', onRelease, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('load', onLoad, { once: true });
    measureRef.current = measure;
    scheduleRef.current = schedule;
    update();

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(glide);
      window.clearTimeout(rest);
      rootObserver.disconnect();
      cardObserver.disconnect();
      target.removeEventListener('scroll', onScroll);
      target.removeEventListener('wheel', onWheel);
      target.removeEventListener('pointerdown', onPress);
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', onLoad);
      motion.removeEventListener?.("change", onMotionChange);
      measureRef.current = null;
      scheduleRef.current = null;
    };
  }, [useWindowScroll]);

  return (
    <div
      ref={rootRef}
      className={`scroll-stack ${useWindowScroll ? 'scroll-stack--window' : 'scroll-stack--contained'} ${className}`.trim()}
      {...(useWindowScroll ? {} : {'data-lenis-prevent': ''})}
    >
      <div ref={innerRef} className="scroll-stack__inner">
        {items.map((child, index) => {
          const gap = itemDistance - (items.length - index) * itemStackDistance;
          return (
            <Fragment key={isValidElement(child) ? (child.key ?? index) : index}>
              {index > 0 && (
                <div aria-hidden="true" style={{ height: Math.max(0, gap), marginTop: Math.min(0, gap) }} />
              )}
              <div
                data-stack-slot=""
                className="scroll-stack__slot"
                style={{
                  top: `calc(${toLength(stackPosition)} + ${index * itemStackDistance}px)`,
                  marginBottom: (items.length - 1 - index) * itemStackDistance,
                  zIndex: index + 1
                }}
              >
                {child}
              </div>
            </Fragment>
          );
        })}
        <div ref={endRef} className="scroll-stack__end" aria-hidden="true" />
      </div>
    </div>
  );
};

export default ScrollStack;
