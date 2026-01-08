import * as React from "react";
import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HelpButtonProps {
  title: string;
  description: string;
  tips?: string[];
  learnMoreHref?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  size?: "sm" | "default";
  className?: string;
}

export function HelpButton({
  title,
  description,
  tips,
  learnMoreHref,
  side = "top",
  align = "center",
  size = "sm",
  className,
}: HelpButtonProps) {
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const buttonSize = size === "sm" ? "h-6 w-6" : "h-7 w-7";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            buttonSize,
            "rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors",
            className
          )}
          aria-label={`Help: ${title}`}
        >
          <HelpCircle className={iconSize} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-72 p-4 space-y-3"
      >
        <div className="space-y-1">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {tips && tips.length > 0 && (
          <ul className="space-y-1.5">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-xs">
                <span className="text-primary mt-0.5">•</span>
                <span className="text-muted-foreground">{tip}</span>
              </li>
            ))}
          </ul>
        )}

        {learnMoreHref && (
          <a
            href={learnMoreHref}
            className="inline-flex items-center text-xs text-primary hover:underline"
          >
            Learn more →
          </a>
        )}
      </PopoverContent>
    </Popover>
  );
}
