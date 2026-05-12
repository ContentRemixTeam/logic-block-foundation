import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    to?: string;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    to?: string;
  };
  tips?: string[];
  className?: string;
  children?: ReactNode;
}

/**
 * Calm, editorial empty state.
 * Use anywhere a list/board/page has no data yet.
 */
export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  tips,
  className,
  children,
}: EmptyStateProps) {
  const PrimaryIcon = primaryAction?.icon;

  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center text-center px-6 py-12 sm:py-16 animate-fade-in",
        className,
      )}
    >
      {Icon && (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </div>
      )}

      {eyebrow && (
        <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
          {eyebrow}
        </p>
      )}

      <h2 className="font-display text-2xl sm:text-[26px] leading-tight text-foreground">
        {title}
      </h2>

      {description && (
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground max-w-sm">
          {description}
        </p>
      )}

      {(primaryAction || secondaryAction) && (
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          {primaryAction &&
            (primaryAction.to ? (
              <Button asChild size="sm" className="gap-1.5">
                <Link to={primaryAction.to}>
                  {PrimaryIcon && <PrimaryIcon className="h-4 w-4" />}
                  {primaryAction.label}
                </Link>
              </Button>
            ) : (
              <Button size="sm" onClick={primaryAction.onClick} className="gap-1.5">
                {PrimaryIcon && <PrimaryIcon className="h-4 w-4" />}
                {primaryAction.label}
              </Button>
            ))}
          {secondaryAction &&
            (secondaryAction.to ? (
              <Button asChild variant="ghost" size="sm">
                <Link to={secondaryAction.to}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}

      {tips && tips.length > 0 && (
        <ul className="mt-8 w-full space-y-1.5 text-left text-[13px] text-muted-foreground">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground/40">·</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}

      {children}
    </div>
  );
}
