import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lightbulb, X, Settings } from 'lucide-react';

const STORAGE_KEY = 'hasSeenDailyPageCustomizeTip';

export function CustomizeTip() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!isVisible) return null;

  return (
    <Alert className="relative border-primary/20 bg-primary/5 mb-4">
      <Lightbulb className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-sm">
          <strong>Tip:</strong> You can customize which sections appear on this page.{' '}
          <Button 
            variant="link" 
            className="p-0 h-auto text-primary" 
            asChild
          >
            <Link to="/settings/daily-page">
              <Settings className="h-3 w-3 mr-1 inline" />
              Personalize your daily page
            </Link>
          </Button>
        </span>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
