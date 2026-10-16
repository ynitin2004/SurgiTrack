import { useEffect, useState } from 'react';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// true once the element has scrolled into view (and stays true). Charts mount
// their data only then, so their entry animation plays when the user can see
// it. Returns a callback ref, so elements that appear later are observed too.
export function useInView({ threshold = 0.25 } = {}) {
  const [node, setNode] = useState(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (inView || !node) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [node, inView, threshold]);

  return [setNode, inView];
}

// Shared Recharts animation settings; disabled for prefers-reduced-motion.
export function useChartAnimation(duration = 1100) {
  const [off] = useState(reducedMotion);
  return off
    ? { isAnimationActive: false }
    : { isAnimationActive: true, animationBegin: 80, animationDuration: duration, animationEasing: 'ease-out' };
}
