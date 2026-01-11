import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { ReactNode } from 'react';

interface QuestCardProps {
  children: ReactNode;
  className?: string;
  ornate?: boolean;
  title?: string;
  icon?: ReactNode;
}

export function QuestCard({ 
  children, 
  className, 
  ornate = false,
  title,
  icon
}: QuestCardProps) {
  const { isQuestMode } = useTheme();
  
  if (!isQuestMode) {
    return (
      <div className={cn("rounded-lg border bg-card p-4", className)}>
        {title && (
          <div className="flex items-center gap-2 mb-3">
            {icon}
            <h3 className="font-semibold">{title}</h3>
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative rounded-xl p-5",
        "bg-gradient-to-b from-[hsl(40,30%,99%)] to-[hsl(40,22%,96%)]",
        "border-2 border-[hsl(45,50%,78%)]",
        "shadow-[0_4px_12px_hsl(45,40%,30%,0.08),inset_0_1px_0_hsl(45,90%,98%)]",
        ornate && "quest-card-ornate",
        className
      )}
    >
      {/* Ornate corner decorations */}
      {ornate && (
        <>
          <div className="absolute top-2 left-3 text-quest-gold text-sm drop-shadow-sm">✦</div>
          <div className="absolute top-2 right-3 text-quest-gold text-sm drop-shadow-sm">✦</div>
          <div className="absolute bottom-2 left-3 text-quest-gold text-sm drop-shadow-sm">✦</div>
          <div className="absolute bottom-2 right-3 text-quest-gold text-sm drop-shadow-sm">✦</div>
        </>
      )}
      
      {/* Title with quest styling */}
      {title && (
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-quest-gold/20">
          {icon && (
            <div className="text-quest-gold">
              {icon}
            </div>
          )}
          <h3 className="font-cinzel font-semibold text-[hsl(30,50%,25%)] tracking-wide">
            {title}
          </h3>
        </div>
      )}
      
      {children}
    </div>
  );
}
