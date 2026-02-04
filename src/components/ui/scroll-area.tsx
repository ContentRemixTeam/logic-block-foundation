import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  /** Enable keyboard scrolling when focused */
  enableKeyboardScroll?: boolean;
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({ className, children, enableKeyboardScroll = true, ...props }, ref) => {
  const viewportRef = React.useRef<HTMLDivElement>(null);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (!enableKeyboardScroll || !viewportRef.current) return;

    const viewport = viewportRef.current;
    const scrollAmount = 40;
    const pageAmount = viewport.clientHeight * 0.9;

    switch (e.key) {
      case 'ArrowDown':
        viewport.scrollTop += scrollAmount;
        e.preventDefault();
        break;
      case 'ArrowUp':
        viewport.scrollTop -= scrollAmount;
        e.preventDefault();
        break;
      case 'PageDown':
        viewport.scrollTop += pageAmount;
        e.preventDefault();
        break;
      case 'PageUp':
        viewport.scrollTop -= pageAmount;
        e.preventDefault();
        break;
      case 'Home':
        viewport.scrollTop = 0;
        e.preventDefault();
        break;
      case 'End':
        viewport.scrollTop = viewport.scrollHeight;
        e.preventDefault();
        break;
    }
  }, [enableKeyboardScroll]);

  return (
    <ScrollAreaPrimitive.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        className={cn(
          "h-full w-full rounded-[inherit]",
          enableKeyboardScroll && "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        tabIndex={enableKeyboardScroll ? 0 : undefined}
        onKeyDown={handleKeyDown}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
});
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-3 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-3 flex-col border-t border-t-transparent p-[1px]",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-muted-foreground/50 hover:bg-muted-foreground/70 transition-colors" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
