import { useLocation } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";

/**
 * Lightweight calm-editorial page transition.
 * Fades + lifts route content in on every pathname change.
 * No heavy framer-motion dependency.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [key, setKey] = useState(location.pathname);

  useEffect(() => {
    setKey(location.pathname);
  }, [location.pathname]);

  return (
    <div key={key} className="page-transition-enter">
      {children}
    </div>
  );
}
