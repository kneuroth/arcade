import { useState, useEffect } from "react";

/**
 * Detects whether the user is on a small / touch-first device where the
 * arcade games (designed for a keyboard/mouse and a wide screen) won't play
 * well. Combines a narrow-viewport check with a coarse-pointer check so we
 * catch phones but not touchscreen laptops with plenty of screen real estate.
 */
const MOBILE_QUERY = "(max-width: 768px), (pointer: coarse) and (max-width: 1024px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(MOBILE_QUERY).matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
