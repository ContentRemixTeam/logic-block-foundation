import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { ShareToGroupButton } from "@/components/sharing";

interface ReflectionListProps {
  items: string[];
  onChange: (updated: string[]) => void;
  label: string;
  placeholder?: string;
  shareableType?: 'win' | 'lesson' | 'challenge' | 'intention';
}

export function ReflectionList({ items, onChange, label, placeholder, shareableType }: ReflectionListProps) {
  const addField = () => {
    onChange([...items, ""]);
  };

  const removeField = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateField = (index: number, value: string) => {
    onChange(items.map((item, i) => (i === index ? value : item)));
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={item}
            onChange={(e) => updateField(index, e.target.value)}
            placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
          />
          {shareableType && item.trim() && (
            <ShareToGroupButton content={item} contentType={shareableType} />
          )}
          {items.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeField(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addField}>
        <Plus className="h-4 w-4 mr-2" />
        Add {label}
      </Button>
    </div>
  );
}
