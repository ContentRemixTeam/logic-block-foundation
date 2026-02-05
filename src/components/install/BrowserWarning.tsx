import { AlertTriangle, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { DeviceInfo, getCurrentUrl } from '@/lib/deviceDetection';

interface BrowserWarningProps {
  deviceInfo: DeviceInfo;
}

export function BrowserWarning({ deviceInfo }: BrowserWarningProps) {
  const [copied, setCopied] = useState(false);
  
  if (deviceInfo.canInstall) {
    return null;
  }
  
  const currentUrl = getCurrentUrl();
  
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const getInstructions = () => {
    if (deviceInfo.device === 'ios') {
      return {
        title: "⚠️ Wrong Browser for iPhone",
        message: deviceInfo.installMessage,
        action: "Copy this page's URL, then open Safari and paste it there.",
        showCopy: true,
      };
    }
    
    if (deviceInfo.device === 'android') {
      return {
        title: "⚠️ Switch to Chrome",
        message: deviceInfo.installMessage,
        action: "Copy this page's URL, then open Chrome and paste it there.",
        showCopy: true,
      };
    }
    
    if (deviceInfo.device === 'desktop') {
      return {
        title: "⚠️ Browser Not Supported",
        message: deviceInfo.installMessage,
        action: "Copy this page's URL and open it in Chrome or Edge to install.",
        showCopy: true,
      };
    }
    
    return {
      title: "⚠️ Installation May Not Work",
      message: "Your browser may not support app installation.",
      action: "Try opening this page in Chrome for the best experience.",
      showCopy: true,
    };
  };
  
  const instructions = getInstructions();
  
  return (
    <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-4 mb-6">
      <div className="flex gap-3">
        <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-bold text-destructive">{instructions.title}</h3>
            <p className="text-sm mt-1">{instructions.message}</p>
          </div>
          
          <p className="text-sm font-medium">{instructions.action}</p>
          
          {instructions.showCopy && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleCopyUrl}
                variant="outline"
                className="flex-1 border-destructive/50 hover:bg-destructive/10"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Page URL
                  </>
                )}
              </Button>
              
              {deviceInfo.device === 'ios' && (
                <Button 
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    // Try to open in Safari - this may not work on all devices
                    // but provides a clear action for users
                    window.location.href = currentUrl;
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  I'm in Safari Now
                </Button>
              )}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            <strong>Quick tip:</strong> {deviceInfo.device === 'ios' 
              ? "Open Safari → tap the address bar → paste the URL → tap Go"
              : "Open Chrome → tap the address bar → paste the URL → tap Enter"
            }
          </div>
        </div>
      </div>
    </div>
  );
}
