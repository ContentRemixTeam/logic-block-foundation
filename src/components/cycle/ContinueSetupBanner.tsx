import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ContinueSetupBannerProps {
  draftStep?: number;
  onDiscard: () => void;
  onClose?: () => void;
}

export function ContinueSetupBanner({ draftStep, onDiscard, onClose }: ContinueSetupBannerProps) {
  const navigate = useNavigate();
  
  const stepNames = [
    'Dates & Goal',
    'Business Diagnostic', 
    'Audience & Message',
    'Lead Gen Strategy',
    'Nurture Strategy',
    'Your Offers',
    '90-Day Breakdown',
    'Habits & Reminders',
    'First 3 Days'
  ];
  
  const stepName = draftStep && draftStep > 0 && draftStep <= stepNames.length 
    ? stepNames[draftStep - 1] 
    : null;

  return (
    <Card className="border-primary bg-gradient-to-r from-primary/5 to-primary/10 mb-6 relative overflow-hidden">
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Continue Your 90-Day Setup</h3>
              <p className="text-sm text-muted-foreground">
                You have an incomplete plan saved
                {stepName && <span> • Last on: <strong>{stepName}</strong></span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDiscard}
            >
              Start Fresh
            </Button>
            <Button 
              size="sm" 
              onClick={() => navigate('/cycle-setup')}
              className="gap-1"
            >
              Continue Setup
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
