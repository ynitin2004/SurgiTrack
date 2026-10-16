import { useEffect, useState } from 'react';

const VARS = [
  'accent', 'accent-wash', 'ink', 'ink-2', 'muted', 'grid', 'axis', 'surface',
  'pie-1', 'pie-2', 'pie-3', 'pie-4', 'pie-other',
];

function read() {
  const cs = getComputedStyle(document.documentElement);
  return Object.fromEntries(VARS.map((v) => [v, cs.getPropertyValue(`--${v}`).trim()]));
}

// Recharts sets SVG presentation attributes, which can't reliably take var(),
// so resolve the CSS tokens to concrete colors and re-read on theme change.
export function useThemeColors() {
  const [colors, setColors] = useState(read);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setColors(read());
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return colors;
}
