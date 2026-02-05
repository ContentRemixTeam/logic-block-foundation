import { Apple, Chrome, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeviceType } from '@/lib/deviceDetection';
import { cn } from '@/lib/utils';

interface DeviceSelectorProps {
  selectedDevice: DeviceType;
  onSelectDevice: (device: DeviceType) => void;
  detectedDevice: DeviceType;
}

export function DeviceSelector({ 
  selectedDevice, 
  onSelectDevice,
  detectedDevice,
}: DeviceSelectorProps) {
  const devices: { type: DeviceType; label: string; icon: React.ReactNode }[] = [
    { type: 'ios', label: 'iPhone/iPad', icon: <Apple className="h-5 w-5" /> },
    { type: 'android', label: 'Android', icon: <Chrome className="h-5 w-5" /> },
    { type: 'desktop', label: 'Desktop', icon: <Monitor className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-center">Choose your device:</p>
      <div className="grid grid-cols-3 gap-2">
        {devices.map(({ type, label, icon }) => (
          <Button
            key={type}
            variant={selectedDevice === type ? "default" : "outline"}
            className={cn(
              "flex flex-col h-auto py-3 gap-1",
              selectedDevice === type && "ring-2 ring-primary ring-offset-2"
            )}
            onClick={() => onSelectDevice(type)}
          >
            {icon}
            <span className="text-xs">{label}</span>
            {detectedDevice === type && (
              <span className="text-[10px] opacity-70">(detected)</span>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
