import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface InstallStepProps {
  number: number;
  title: string;
  description: string;
  icon: ReactNode;
  highlight?: boolean;
  emoji?: string;
}

export function InstallStep({ 
  number, 
  title, 
  description, 
  icon,
  highlight = false,
  emoji,
}: InstallStepProps) {
  return (
    <div className={cn(
      "flex gap-4 items-start p-4 rounded-xl border transition-all",
      highlight 
        ? "bg-primary/5 border-primary/30 shadow-sm" 
        : "bg-card border-border"
    )}>
      <div className={cn(
        "shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg",
        highlight 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-muted-foreground"
      )}>
        {emoji || number}
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-primary">{icon}</span>
          <h3 className="font-semibold text-base">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
