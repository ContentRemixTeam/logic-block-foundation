import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Printer, Smartphone, Monitor, CheckCircle2 } from 'lucide-react';

interface PDFInstructionsModalProps {
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  cycleTitle?: string;
  isDownloading?: boolean;
}

export function PDFInstructionsModal({ 
  open, 
  onClose, 
  onDownload, 
  cycleTitle = '90-Day Business Plan',
  isDownloading = false
}: PDFInstructionsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Download className="h-6 w-6 text-primary" />
            Your PDF is Ready!
          </DialogTitle>
          <DialogDescription className="text-base">
            {cycleTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick Download Button */}
          <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl p-4 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-3 text-center">
              Click below to download your plan immediately
            </p>
            <Button
              size="lg"
              className="w-full gap-2 h-12 text-base"
              onClick={onDownload}
              disabled={isDownloading}
            >
              <Download className="h-5 w-5" />
              {isDownloading ? 'Downloading...' : 'Download PDF Now'}
            </Button>
          </div>

          {/* Instructions Sections */}
          <div className="space-y-3">
            {/* Desktop Instructions */}
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Monitor className="h-4 w-4 text-blue-500" />
                On Desktop/Laptop
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                <li>• Click the <strong>Download PDF Now</strong> button above</li>
                <li>• Check your <strong>Downloads folder</strong></li>
                <li>• To save from browser: press <strong>Ctrl+S</strong> (Win) or <strong>Cmd+S</strong> (Mac)</li>
                <li>• To print: press <strong>Ctrl+P</strong> (Win) or <strong>Cmd+P</strong> (Mac)</li>
              </ul>
            </div>

            {/* Mobile Instructions */}
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Smartphone className="h-4 w-4 text-green-500" />
                On Mobile/Tablet
              </div>
              <div className="text-xs text-muted-foreground space-y-2 ml-6">
                <div>
                  <p className="font-medium text-foreground">iPhone/iPad:</p>
                  <p>Tap Share icon → "Save to Files" → Choose location → Save</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Android:</p>
                  <p>Tap ⋮ menu → "Download" → Find in Downloads folder</p>
                </div>
              </div>
            </div>

            {/* Print Instructions */}
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Printer className="h-4 w-4 text-purple-500" />
                Printing Your Plan
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                <li>• Desktop: <strong>Ctrl+P</strong> (Win) or <strong>Cmd+P</strong> (Mac)</li>
                <li>• Mobile: Share → Print</li>
                <li>• Tip: Print double-sided to save paper!</li>
              </ul>
            </div>
          </div>

          {/* Reassurance */}
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-700 dark:text-green-400">
              Don't worry! Your plan is saved in your account. You can re-download it anytime from your Cycles page.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              I'll Download Later
            </Button>
            <Button onClick={onDownload} disabled={isDownloading} className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Download Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
