// Inline prompt shown next to AI "Generate" actions when the user has no API key.
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AI_KEY_SETTINGS_PATH, NO_API_KEY_MESSAGE } from '@/lib/aiKeyErrors';

interface MissingAIKeyNoticeProps {
  className?: string;
  message?: string;
}

export function MissingAIKeyNotice({ className, message }: MissingAIKeyNoticeProps) {
  return (
    <p
      className={cn(
        'flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground',
        className
      )}
    >
      <KeyRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{message || NO_API_KEY_MESSAGE}</span>
      <Link to={AI_KEY_SETTINGS_PATH} className="font-medium text-primary underline underline-offset-2">
        Add a key
      </Link>
    </p>
  );
}
