import { useCallback, useEffect, useState } from 'react';

// Current content width of an element (0 until measured). Returns a callback ref.
export function useElementWidth() {
  const [node, setNode] = useState(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);

  return [setNode, width];
}

// Combine several callback refs into one stable ref.
export function useMergedRef(...refs) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((el) => refs.forEach((r) => r(el)), refs);
}
