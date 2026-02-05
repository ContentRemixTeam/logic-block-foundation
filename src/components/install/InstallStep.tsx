import { ReactNode } from 'react';

interface InstallStepProps {
  number: number;
  title: string;
  description: string;
  icon: ReactNode;
  highlight?: boolean;
}

export function InstallStep({ 
  number, 
  title, 
  description, 
  icon,
  highlight = false,
}: InstallStepProps) {
  return (
    <div className={`flex gap-4 ${highlight ? 'bg-primary/5 -mx-4 px-4 py-3 rounded-lg' : ''}`}>
      <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-muted-foreground">{icon}</span>
          <h3 className="font-medium">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
