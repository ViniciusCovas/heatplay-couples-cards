import { useEffect, useRef } from 'react';
import { ActiveCardClock } from '@/lib/activeCardClock';

/** Preview only. Pauses for hidden tabs, lost focus and any overlay. No network. */
export function useActiveCardTime(cardKey: string, active: boolean) {
  const state = useRef({ key: cardKey, clock: new ActiveCardClock() });
  useEffect(() => {
    if (state.current.key !== cardKey) state.current = { key: cardKey, clock: new ActiveCardClock() };
    const clock = state.current.clock;
    const update = () => {
      if (active && document.visibilityState === 'visible' && document.hasFocus()) clock.resume(performance.now());
      else clock.pause(performance.now());
    };
    update();
    document.addEventListener('visibilitychange', update);
    window.addEventListener('blur', update);
    window.addEventListener('focus', update);
    return () => {
      clock.pause(performance.now());
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('blur', update);
      window.removeEventListener('focus', update);
    };
  }, [cardKey, active]);
  return () => state.current.clock.read(performance.now());
}
