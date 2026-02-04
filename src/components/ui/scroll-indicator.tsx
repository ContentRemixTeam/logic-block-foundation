import * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollIndicatorProps {
  children: React.ReactNode;
  className?: string;
  /** Show gradient shadows to indicate more content */
  showShadows?: boolean;
}

/**
 * A wrapper that shows gradient shadows at top/bottom when content is scrollable.
 * Use this around ScrollArea to provide visual affordance for scrolling.
 */
export function ScrollIndicator({ 
  children, 
  className,
  showShadows = true,
}: ScrollIndicatorProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = React.useState({
    canScrollUp: false,
    canScrollDown: false,
  });

  const checkScroll = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find the ScrollArea viewport inside
    const viewport = container.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) return;

    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const threshold = 5; // Small threshold for rounding errors

    setScrollState({
      canScrollUp: scrollTop > threshold,
      canScrollDown: scrollTop + clientHeight < scrollHeight - threshold,
    });
  }, []);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find the viewport and attach scroll listener
    const viewport = container.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) return;

    viewport.addEventListener('scroll', checkScroll, { passive: true });
    
    // Initial check
    checkScroll();

    // Re-check on resize
    const observer = new ResizeObserver(checkScroll);
    observer.observe(viewport);

    return () => {
      viewport.removeEventListener('scroll', checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  // Also check after a short delay for dynamic content
  React.useEffect(() => {
    const timer = setTimeout(checkScroll, 100);
    return () => clearTimeout(timer);
  }, [children, checkScroll]);

  const prefersReducedMotion = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {children}
      
      {/* Top shadow */}
      {showShadows && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-background to-transparent z-10",
            prefersReducedMotion ? "" : "transition-opacity duration-200",
            scrollState.canScrollUp ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
        />
      )}
      
      {/* Bottom shadow */}
      {showShadows && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background to-transparent z-10",
            prefersReducedMotion ? "" : "transition-opacity duration-200",
            scrollState.canScrollDown ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
