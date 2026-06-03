'use client';

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT_PX = 768; // matches Tailwind `md`

export function useIsMobile(): boolean {
  // Start `false` so SSR and first client paint render the desktop variant.
  // The effect runs after mount and updates to the real value.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMobile;
}
