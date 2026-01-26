import { useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTextSelection } from '@/hooks/useTextSelection';
import { TextSelectionToolbar } from './TextSelectionToolbar';
import { CreateFromSelectionModal } from './CreateFromSelectionModal';
import { cn } from '@/lib/utils';

interface SelectableNoteContentProps {
  content: string;
  renderContent?: (content: string) => React.ReactNode;
  className?: string;
  maxHeight?: string;
  sourceNoteId?: string;
  sourceNoteTitle?: string;
  sourceType?: 'entry' | 'page';
  showHint?: boolean;
}

export function SelectableNoteContent({
  content,
  renderContent,
  className,
  maxHeight = '400px',
  sourceNoteId,
  sourceNoteTitle,
  sourceType = 'entry',
  showHint = true,
}: SelectableNoteContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { selection, clearSelection } = useTextSelection(containerRef);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'task' | 'idea'>('task');
  const [selectedText, setSelectedText] = useState('');

  const handleSaveAsTask = () => {
    if (selection) {
      setSelectedText(selection.text);
      setModalType('task');
      setModalOpen(true);
      clearSelection();
    }
  };

  const handleSaveAsIdea = () => {
    if (selection) {
      setSelectedText(selection.text);
      setModalType('idea');
      setModalOpen(true);
      clearSelection();
    }
  };

  return (
    <div className="space-y-1">
      <div className="relative group" ref={containerRef}>
        <ScrollArea style={{ maxHeight }}>
          <pre className={cn(
            "whitespace-pre-wrap font-mono text-sm bg-muted/30 rounded-lg p-4 border select-text",
            className
          )}>
            {renderContent ? renderContent(content) : content}
          </pre>
        </ScrollArea>

        {/* Selection Toolbar */}
        <TextSelectionToolbar
          x={selection?.x ?? 0}
          y={selection?.y ?? 0}
          visible={!!selection}
          onSaveAsTask={handleSaveAsTask}
          onSaveAsIdea={handleSaveAsIdea}
        />

        {/* Create Modal */}
        <CreateFromSelectionModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          type={modalType}
          selectedText={selectedText}
          sourceNoteId={sourceNoteId}
          sourceNoteTitle={sourceNoteTitle}
          sourceType={sourceType}
        />
      </div>
      
      {/* Hint text */}
      {showHint && (
        <p className="text-xs text-muted-foreground px-1">
          💡 <span className="hidden sm:inline">Highlight text to save as task or idea</span>
          <span className="sm:hidden">Long-press to select text</span>
        </p>
      )}
    </div>
  );
}
