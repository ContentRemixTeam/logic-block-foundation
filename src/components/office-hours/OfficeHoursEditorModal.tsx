import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OfficeHoursEditor } from './OfficeHoursEditor';

interface OfficeHoursEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OfficeHoursEditorModal({ open, onOpenChange }: OfficeHoursEditorModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Office Hours</DialogTitle>
        </DialogHeader>
        <OfficeHoursEditor 
          onSave={() => onOpenChange(false)} 
          onCancel={() => onOpenChange(false)}
          showCancel={true}
        />
      </DialogContent>
    </Dialog>
  );
}
