import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { COLUMN_COLORS } from '@/types/project';
import { cn } from '@/lib/utils';

interface CreateColumnFormProps {
  onSubmit: (name: string, color: string) => void;
  onCancel: () => void;
}

export function CreateColumnForm({ onSubmit, onCancel }: CreateColumnFormProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLUMN_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), color);
    }
  };

  return (
    <Card className="w-72 shrink-0 p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            placeholder="Column name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Color</p>
          <div className="grid grid-cols-6 gap-2">
            {COLUMN_COLORS.slice(0, 12).map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  'w-6 h-6 rounded-full border-2 border-transparent hover:scale-110 transition-transform',
                  color === c && 'ring-2 ring-primary ring-offset-2'
                )}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={!name.trim()}>
            Add
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
