import {
  Share,
  PlusSquare,
  Check,
  Chrome,
  Apple,
  Download,
  MoreVertical,
  Smartphone,
} from 'lucide-react';
import { InstallStep } from '@/components/install/InstallStep';
import type { DeviceType } from '@/lib/deviceDetection';

interface DeviceInstallStepsProps {
  device: DeviceType;
  appName?: string;
}

export function DeviceInstallSteps({ device, appName = 'Boss Planner' }: DeviceInstallStepsProps) {
  if (device === 'ios') {
    return (
      <div className="space-y-3">
        <InstallStep
          number={1}
          title="Open this page in Safari"
          description="iOS only allows home screen apps from Safari. If you're in Chrome, Instagram, or another app, copy the URL and paste it in Safari."
          icon={<Apple className="h-5 w-5" />}
          highlight
        />
        <InstallStep
          number={2}
          title="Tap the Share button"
          description="It's the square icon with an arrow pointing up — usually at the bottom of your screen (iPhone) or top (iPad)."
          icon={<Share className="h-5 w-5" />}
          emoji="↑"
        />
        <InstallStep
          number={3}
          title={`Scroll down and tap "Add to Home Screen"`}
          description="You may need to scroll down in the share menu to find it. It has a ＋ icon next to it."
          icon={<PlusSquare className="h-5 w-5" />}
          emoji="＋"
        />
        <InstallStep
          number={4}
          title={`Tap "Add" in the top right`}
          description={`Done! ${appName} will appear on your home screen just like a regular app.`}
          icon={<Check className="h-5 w-5" />}
          emoji="✓"
        />
      </div>
    );
  }

  if (device === 'android') {
    return (
      <div className="space-y-3">
        <InstallStep
          number={1}
          title="Open this page in Chrome"
          description="Chrome works best for installing. If you see a popup asking to install, tap it!"
          icon={<Chrome className="h-5 w-5" />}
          highlight
        />
        <InstallStep
          number={2}
          title="Tap the menu ⋮ (three dots)"
          description="Look in the top-right corner of Chrome for three vertical dots."
          icon={<MoreVertical className="h-5 w-5" />}
          emoji="⋮"
        />
        <InstallStep
          number={3}
          title={`Tap "Add to Home screen" or "Install app"`}
          description="Either option works — they both install the app to your home screen."
          icon={<PlusSquare className="h-5 w-5" />}
          emoji="＋"
        />
        <InstallStep
          number={4}
          title="Confirm and you're done!"
          description={`${appName} will appear on your home screen. Open it anytime!`}
          icon={<Check className="h-5 w-5" />}
          emoji="✓"
        />
      </div>
    );
  }

  // Desktop
  return (
    <div className="space-y-3">
      <InstallStep
        number={1}
        title="Use Chrome or Edge"
        description="These browsers support installing web apps. Firefox and Safari don't offer this feature."
        icon={<Chrome className="h-5 w-5" />}
        highlight
      />
      <InstallStep
        number={2}
        title="Look for the install icon in the address bar"
        description="You should see a small ⊕ icon or a monitor icon on the right side of the address bar."
        icon={<Download className="h-5 w-5" />}
        emoji="⊕"
      />
      <InstallStep
        number={3}
        title={`Click "Install"`}
        description={`${appName} will open as a standalone window and appear in your Start menu (Windows) or Applications (Mac).`}
        icon={<Check className="h-5 w-5" />}
        emoji="✓"
      />
    </div>
  );
}
