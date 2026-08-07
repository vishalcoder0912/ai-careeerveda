import { useLayoutEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import { useLenis } from '../lib/smoothScroll';
import { computeCardPin } from './scrollStackPin';
import './ScrollStack.css';

export const ScrollStackItem = ({ children, itemClassName = '' }) => (
  <div className={`scroll-stack-card ${itemClassName}`.trim()}>{children}</div>
);

const ScrollStack = ({
  children,
  className = '',
  itemDistance = 100,
  itemScale = 0.03,
  itemStackDistance = 30,
  stackPosition = '20%',
  scaleEndPosition = '10%',
  baseScale = 0.85,
  scaleDuration = 0.5,
  rotationAmount = 0,
  blurAmount = 0,
  useWindowScroll = false,
  onStackComplete
}) => {
  const scrollerRef = useRef(null);
  const stackCompletedRef = useRef(false);
  const animationFrameRef = useRef(null);
  const lenisRef = useRef(null);
  const cardsRef = useRef([]);
  const sharedLenis = useLenis();
  // Natural (untransformed) layout offsets, measured outside the scroll path so
  // the transforms we write never feed back into the positions we read.
  const offsetsRef = useRef([]);
  // Untransformed card heights, read in the same pass as the offsets. Needed
  // because a card taller than the viewport has to be pinned differently.
  const heightsRef = useRef([]);
  const endOffsetRef = useRef(0);
  const lastTransformsRef = useRef(new Map());

  const calculateProgress = useCallback((scrollTop, start, end) => {
    if (scrollTop < start) return 0;
    if (scrollTop > end) return 1;
    return (scrollTop - start) / (end - start);
  }, []);

  const parsePercentage = useCallback((value, containerHeight) => {
    if (typeof value === 'string' && value.includes('%')) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value);
  }, []);

  const getScrollData = useCallback(() => {
    if (useWindowScroll) {
      return { scrollTop: window.scrollY, containerHeight: window.innerHeight };
    }
    const scroller = scrollerRef.current;
    return { scrollTop: scroller.scrollTop, containerHeight: scroller.clientHeight };
  }, [useWindowScroll]);

  // Strip transforms, read layout, restore. Reads and writes stay batched, and
  // the result is the position each card would occupy with no transform at all.
  const measure = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const cards = cardsRef.current;
    const endElement = scroller.querySelector('.scroll-stack-end');

    const previous = cards.map(card => card.style.transform);
    cards.forEach(card => {
      card.style.transform = 'none';
    });

    const scrollTop = useWindowScroll ? window.scrollY : scroller.scrollTop;
    const containerTop = useWindowScroll ? 0 : scroller.getBoundingClientRect().top;
    const toOffset = element => element.getBoundingClientRect().top - containerTop + scrollTop;

    offsetsRef.current = cards.map(toOffset);
    heightsRef.current = cards.map(card => card.getBoundingClientRect().height);
    endOffsetRef.current = endElement ? toOffset(endElement) : 0;

    cards.forEach((card, i) => {
      card.style.transform = previous[i];
    });

    lastTransformsRef.current.clear();
  }, [useWindowScroll]);

  const updateCardTransforms = useCallback(() => {
    const cards = cardsRef.current;
    const offsets = offsetsRef.current;
    const heights = heightsRef.current;
    if (!cards.length || offsets.length !== cards.length) return;

    const { scrollTop, containerHeight } = getScrollData();
    const stackPositionPx = parsePercentage(stackPosition, containerHeight);
    const scaleEndPositionPx = parsePercentage(scaleEndPosition, containerHeight);
    const pinEnd = endOffsetRef.current - containerHeight / 2;

    const pinAt = i =>
      computeCardPin({
        cardTop: offsets[i],
        cardHeight: heights[i] || 0,
        index: i,
        containerHeight,
        stackPositionPx,
        itemStackDistance
      });

    let topCardIndex = 0;
    for (let j = 0; j < cards.length; j++) {
      if (scrollTop >= pinAt(j).pinStart) {
        topCardIndex = j;
      }
    }

    cards.forEach((card, i) => {
      const cardTop = offsets[i];
      const { stackOffset, pinStart } = pinAt(i);
      // The scale has to finish at or after the pin, or a card whose pin is
      // delayed by its overflow would be interpolated over a negative range.
      const triggerEnd = Math.max(pinStart + 1, cardTop - scaleEndPositionPx);

      const scaleProgress = calculateProgress(scrollTop, pinStart, triggerEnd);
      const targetScale = baseScale + i * itemScale;
      const scale = 1 - scaleProgress * (1 - targetScale);
      const rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0;
      const blur = blurAmount && i < topCardIndex ? (topCardIndex - i) * blurAmount : 0;

      let translateY = 0;
      if (scrollTop >= pinStart) {
        translateY = Math.min(scrollTop, pinEnd) - cardTop + stackOffset;
      }

      const next = {
        translateY: Math.round(translateY * 100) / 100,
        scale: Math.round(scale * 10000) / 10000,
        rotation: Math.round(rotation * 100) / 100,
        blur: Math.round(blur * 100) / 100
      };

      const last = lastTransformsRef.current.get(i);
      const hasChanged =
        !last ||
        last.translateY !== next.translateY ||
        last.scale !== next.scale ||
        last.rotation !== next.rotation ||
        last.blur !== next.blur;

      if (hasChanged) {
        card.style.transform = `translate3d(0, ${next.translateY}px, 0) scale(${next.scale}) rotate(${next.rotation}deg)`;
        card.style.filter = next.blur > 0 ? `blur(${next.blur}px)` : '';
        lastTransformsRef.current.set(i, next);
      }
    });

    const lastIndex = cards.length - 1;
    const lastPinStart = offsets[lastIndex] - stackPositionPx - itemStackDistance * lastIndex;
    const isInView = scrollTop >= lastPinStart && scrollTop <= pinEnd;
    if (isInView !== stackCompletedRef.current) {
      stackCompletedRef.current = isInView;
      if (isInView) onStackComplete?.();
    }
  }, [
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    rotationAmount,
    blurAmount,
    onStackComplete,
    calculateProgress,
    parsePercentage,
    getScrollData
  ]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cards = Array.from(scroller.querySelectorAll('.scroll-stack-card'));
    cardsRef.current = cards;
    const transformsCache = lastTransformsRef.current;

    cards.forEach((card, i) => {
      if (i < cards.length - 1) {
        card.style.marginBottom = `${itemDistance}px`;
      }
      card.style.transformOrigin = 'top center';
      card.style.backfaceVisibility = 'hidden';
      card.style.willChange = prefersReducedMotion ? 'auto' : 'transform, filter';
      if (prefersReducedMotion) {
        card.style.transform = '';
        card.style.filter = '';
      }
    });

    if (prefersReducedMotion) {
      transformsCache.clear();
      return () => {
        cardsRef.current = [];
      };
    }

    measure();
    updateCardTransforms();

    // When the app is already running a Lenis (SmoothScrollProvider, at the
    // root), use it. Constructing a second one here would put two instances on
    // window scroll, each writing the position the other just read — they fight
    // every frame and the page stutters. This component only ever needed a
    // scroll signal, not ownership of the scroll.
    //
    // sharedLenis is null when smooth scrolling is off or when the stack is its
    // own scroller (useWindowScroll false), and then it builds its own as before.
    const canShare = Boolean(sharedLenis) && useWindowScroll;

    const lenis =
      canShare
        ? sharedLenis
        : new Lenis({
            ...(useWindowScroll
              ? {}
              : {wrapper: scroller, content: scroller.querySelector('.scroll-stack-inner')}),
            duration: 1.2,
            easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 2,
            lerp: 0.1,
            syncTouch: true,
            syncTouchLerp: 0.075
          });

    lenis.on('scroll', updateCardTransforms);

    // Only drive the rAF loop for an instance we own. The shared one is already
    // being driven by the provider (off gsap.ticker), and calling raf() on it
    // twice per frame doubles its easing rate.
    if (!canShare) {
      const raf = time => {
        lenis.raf(time);
        animationFrameRef.current = requestAnimationFrame(raf);
      };
      animationFrameRef.current = requestAnimationFrame(raf);
    }

    lenisRef.current = canShare ? null : lenis;

    // Re-measure on layout changes (resize, font swap, images settling) rather
    // than on every scroll tick.
    let remeasureFrame = null;
    const scheduleRemeasure = () => {
      if (remeasureFrame) return;
      remeasureFrame = requestAnimationFrame(() => {
        remeasureFrame = null;
        measure();
        updateCardTransforms();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleRemeasure);
    cards.forEach(card => resizeObserver.observe(card));
    window.addEventListener('resize', scheduleRemeasure);
    if (document.fonts?.ready) document.fonts.ready.then(scheduleRemeasure).catch(() => {});

    return () => {
      window.removeEventListener('resize', scheduleRemeasure);
      resizeObserver.disconnect();
      if (remeasureFrame) cancelAnimationFrame(remeasureFrame);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      // Always detach our own listener; only destroy an instance we created.
      // Destroying the shared one here would end smooth scrolling for the whole
      // app the moment this section unmounts.
      lenis.off('scroll', updateCardTransforms);
      if (!canShare) lenis.destroy();

      lenisRef.current = null;
      stackCompletedRef.current = false;
      cardsRef.current = [];
      offsetsRef.current = [];
      transformsCache.clear();
    };
  }, [
    itemDistance,
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    scaleDuration,
    rotationAmount,
    blurAmount,
    useWindowScroll,
    onStackComplete,
    measure,
    updateCardTransforms,
    sharedLenis
  ]);

  return (
    <div className={`scroll-stack-scroller ${className}`.trim()} ref={scrollerRef}>
      <div className="scroll-stack-inner">
        {children}
        {/* Spacer so the last pin can release cleanly */}
        <div className="scroll-stack-end" />
      </div>
    </div>
  );
};

export default ScrollStack;
