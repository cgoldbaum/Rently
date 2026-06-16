import { useEffect, useRef, useState } from 'react';

/**
 * Anima un número entero desde su valor anterior hasta `value` con easing.
 * Devuelve el valor actual para renderizar. No usa reanimated (es JS puro),
 * así se puede interpolar dentro de un <Text> sin componentes extra.
 */
export function useCountUp(value: number, duration = 600): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}
