import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useBoardMutations } from '@/hooks/useProjectBoards';
import { BOARD_TEMPLATES } from '@/types/project';

interface CreateBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBoardModal({ open, onOpenChange }: CreateBoardModalProps) {
  const [name, setName] = useState('');
  const [templateIndex, setTemplateIndex] = useState<number | null>(null);
  const { createBoard } = useBoardMutations();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const columns = templateIndex !== null
      ? BOARD_TEMPLATES[templateIndex].columns
      : [
          { name: 'To Do', color: '#94A3B8' },
          { name: 'In Progress', color: '#F59E0B' },
          { name: 'Done', color: '#10B981' },
        ];

    createBoard.mutate(
      { name: name.trim(), columns },
      {
        onSuccess: () => {
          setName('');
          setTemplateIndex(null);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
          <DialogDescription>
            Organize your projects with a custom board layout.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="board-name">Board Name</Label>
            <Input
              id="board-name"
              placeholder="e.g., Q1 Projects"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <Label>Template</Label>
            <RadioGroup
              value={templateIndex?.toString() ?? 'blank'}
              onValueChange={(v) => setTemplateIndex(v === 'blank' ? null : parseInt(v))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="blank" id="blank" />
                <Label htmlFor="blank" className="font-normal cursor-pointer">
                  Blank (To Do, In Progress, Done)
                </Label>
              </div>

              {BOARD_TEMPLATES.map((template, idx) => (
                <div key={template.name} className="flex items-start space-x-2">
                  <RadioGroupItem value={idx.toString()} id={`template-${idx}`} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={`template-${idx}`} className="font-normal cursor-pointer">
                      {template.name}
                    </Label>
                    <div className="flex gap-1 mt-1">
                      {template.columns.map((col) => (
                        <div
                          key={col.name}
                          className="text-[10px] px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: col.color }}
                        >
                          {col.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createBoard.isPending}>
              {createBoard.isPending ? 'Creating...' : 'Create Board'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
