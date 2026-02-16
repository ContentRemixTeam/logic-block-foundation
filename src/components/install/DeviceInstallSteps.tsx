import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Share,
  PlusSquare,
  Check,
  Chrome,
  Apple,
  Download,
  MoreVertical,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { InstallStep } from '@/components/install/InstallStep';
import type { DeviceType } from '@/lib/deviceDetection';

interface DeviceInstallStepsProps {
  device: DeviceType;
  appName: 'Quick Add' | 'Boss Planner';
  /** If true, show a link to navigate to /quick-add before install steps */
  showOpenLink?: boolean;
}

export function DeviceInstallSteps({ device, appName, showOpenLink = false }: DeviceInstallStepsProps) {
  const isQuickAdd = appName === 'Quick Add';
  const pageUrl = isQuickAdd ? '/quick-add' : '/install';

  if (device === 'ios') {
    return (
      <div className="space-y-6">
        <InstallStep
          number={1}
          title={showOpenLink ? `Go to the ${appName} page` : `Stay on this page in Safari`}
          description={
            showOpenLink
              ? `First, navigate to the ${appName} page in Safari.`
              : "Make sure you're viewing this page in Safari (not Chrome or another browser)."
          }
          icon={<Apple className="h-6 w-6" />}
        />
        {showOpenLink && (
          <Button asChild variant="outline" className="w-full">
            <Link to={pageUrl} target="_blank">
              Open {appName} Page
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        )}
        <InstallStep
          number={2}
          title="Tap the Share button"
          description="Look at the bottom of Safari for a square with an upward arrow. Tap it."
          icon={<Share className="h-6 w-6" />}
          highlight
        />
        <InstallStep
          number={3}
          title='Tap "Add to Home Screen"'
          description='Scroll down in the share menu until you see "Add to Home Screen" with a + icon.'
          icon={<PlusSquare className="h-6 w-6" />}
        />
        <InstallStep
          number={4}
          title='Tap "Add" to confirm'
          description={`${appName} will appear on your home screen!`}
          icon={<Check className="h-6 w-6" />}
        />
      </div>
    );
  }

  if (device === 'android') {
    return (
      <div className="space-y-6">
        <InstallStep
          number={1}
          title={showOpenLink ? `Go to the ${appName} page in Chrome` : 'Stay on this page in Chrome'}
          description={
            showOpenLink
              ? `First, open the ${appName} page in Chrome browser.`
              : "Make sure you're in Chrome browser."
          }
          icon={<Chrome className="h-6 w-6" />}
        />
        {showOpenLink && (
          <Button asChild variant="outline" className="w-full">
            <Link to={pageUrl} target="_blank">
              Open {appName} Page
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        )}
        <InstallStep
          number={2}
          title="Tap the menu (⋮)"
          description="Look for three vertical dots in the top right corner."
          icon={<MoreVertical className="h-6 w-6" />}
          highlight
        />
        <InstallStep
          number={3}
          title='Tap "Add to Home screen" or "Install app"'
          description="Either option will install the app."
          icon={<PlusSquare className="h-6 w-6" />}
        />
        <InstallStep
          number={4}
          title='Confirm installation'
          description={`${appName} will appear on your home screen!`}
          icon={<Check className="h-6 w-6" />}
        />
      </div>
    );
  }

  // Desktop
  return (
    <div className="space-y-6">
      <InstallStep
        number={1}
        title={showOpenLink ? `Go to the ${appName} page` : 'Look for the install icon'}
        description={
          showOpenLink
            ? `Open the ${appName} page in Chrome or Edge.`
            : "Check the right side of your address bar for a ⊕ or computer icon."
        }
        icon={showOpenLink ? <Chrome className="h-6 w-6" /> : <Download className="h-6 w-6" />}
        highlight={!showOpenLink}
      />
      {showOpenLink && (
        <>
          <Button asChild variant="outline" className="w-full">
            <Link to={pageUrl} target="_blank">
              Open {appName} Page
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <InstallStep
            number={2}
            title="Look for the install icon"
            description="Check the right side of your address bar for a ⊕ or computer icon."
            icon={<Download className="h-6 w-6" />}
            highlight
          />
          <InstallStep
            number={3}
            title='Click "Install"'
            description='Click the icon, then "Install" in the popup.'
            icon={<Check className="h-6 w-6" />}
          />
        </>
      )}
      {!showOpenLink && (
        <>
          <InstallStep
            number={2}
            title='Click "Install"'
            description={`Click the icon, then "Install" in the popup. Or check the browser menu (⋮) for "Install ${appName}".`}
            icon={<PlusSquare className="h-6 w-6" />}
          />
          <InstallStep
            number={3}
            title="Launch from desktop"
            description="Find the app in your Start menu (Windows) or Applications (Mac)."
            icon={<Check className="h-6 w-6" />}
          />
        </>
      )}
    </div>
  );
}
