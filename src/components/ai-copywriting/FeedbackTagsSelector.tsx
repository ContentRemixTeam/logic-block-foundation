import { Badge } from '@/components/ui/badge';
import { TAG_LABELS } from '@/types/learningInsights';
import { cn } from '@/lib/utils';

interface FeedbackTagsSelectorProps {
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  variant: 'success' | 'improvement';
}

export function FeedbackTagsSelector({ 
  tags, 
  selected, 
  onToggle, 
  variant 
}: FeedbackTagsSelectorProps) {
  const isSuccess = variant === 'success';
  
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isSelected = selected.includes(tag);
        return (
          <Badge
            key={tag}
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer transition-colors",
              isSelected && isSuccess && "bg-green-500 hover:bg-green-600 text-white",
              isSelected && !isSuccess && "bg-amber-500 hover:bg-amber-600 text-white",
              !isSelected && isSuccess && "hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30",
              !isSelected && !isSuccess && "hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30"
            )}
            onClick={() => onToggle(tag)}
          >
            {TAG_LABELS[tag] || tag.replace(/_/g, ' ')}
          </Badge>
        );
      })}
    </div>
  );
}
