import * as React from "react";
import { cn } from "@/lib/utils";

type CardCategory = 'plan' | 'do' | 'review' | 'info' | 'mindset';

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  category?: CardCategory;
  showAccent?: boolean;
  children: React.ReactNode;
}

const categoryConfig: Record<CardCategory, { color: string; label: string; borderColor: string }> = {
  plan: { 
    color: 'bg-primary', 
    label: 'PLANNING',
    borderColor: 'border-t-primary'
  },
  do: { 
    color: 'bg-[hsl(173,80%,40%)]', 
    label: 'ACTION',
    borderColor: 'border-t-[hsl(173,80%,40%)]'
  },
  review: { 
    color: 'bg-[hsl(55,90%,70%)]', 
    label: 'REVIEW',
    borderColor: 'border-t-[hsl(55,90%,70%)]'
  },
  info: { 
    color: 'bg-[hsl(220,9%,46%)]', 
    label: 'INFO',
    borderColor: 'border-t-[hsl(220,9%,46%)]'
  },
  mindset: { 
    color: 'bg-[hsl(270,70%,60%)]', 
    label: 'MINDSET',
    borderColor: 'border-t-[hsl(270,70%,60%)]'
  },
};

const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ className, category, showAccent = true, children, ...props }, ref) => {
    const config = category ? categoryConfig[category] : null;

    return (
      <div
        ref={ref}
        className={cn(
          "bg-card rounded-[20px] p-6",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]",
          "hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
          "transition-shadow duration-200",
          config && "border-t-[3px]",
          config?.borderColor,
          className
        )}
        {...props}
      >
        {config && showAccent && (
          <div className="flex items-center gap-2 mb-3">
            <div className={cn("w-1.5 h-1.5 rounded-full", config.color)} />
            <span className="text-[11px] font-medium tracking-[0.1em] uppercase text-foreground-muted">
              {config.label}
            </span>
          </div>
        )}
        {children}
      </div>
    );
  }
);
PremiumCard.displayName = "PremiumCard";

interface PremiumCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const PremiumCardHeader = React.forwardRef<HTMLDivElement, PremiumCardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 mb-4", className)}
      {...props}
    >
      {children}
    </div>
  )
);
PremiumCardHeader.displayName = "PremiumCardHeader";

interface PremiumCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

const PremiumCardTitle = React.forwardRef<HTMLHeadingElement, PremiumCardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
);
PremiumCardTitle.displayName = "PremiumCardTitle";

interface PremiumCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const PremiumCardDescription = React.forwardRef<HTMLParagraphElement, PremiumCardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-foreground-muted", className)}
      {...props}
    >
      {children}
    </p>
  )
);
PremiumCardDescription.displayName = "PremiumCardDescription";

interface PremiumCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const PremiumCardContent = React.forwardRef<HTMLDivElement, PremiumCardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props}>
      {children}
    </div>
  )
);
PremiumCardContent.displayName = "PremiumCardContent";

export {
  PremiumCard,
  PremiumCardHeader,
  PremiumCardTitle,
  PremiumCardDescription,
  PremiumCardContent,
};
