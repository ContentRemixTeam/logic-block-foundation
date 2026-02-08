import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Instagram, Linkedin, Twitter, Video, Facebook, FileText, Youtube, Mail } from 'lucide-react';
import { ContentChallengeWizardData, AVAILABLE_PLATFORMS } from '@/types/contentChallenge';

interface StepPlatformSelectionProps {
  data: ContentChallengeWizardData;
  setData: (updates: Partial<ContentChallengeWizardData>) => void;
  goNext: () => void;
  goBack: () => void;
}

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
  tiktok: Video,
  facebook: Facebook,
  blog: FileText,
  youtube: Youtube,
  email: Mail,
};

export default function StepPlatformSelection({ data, setData }: StepPlatformSelectionProps) {
  const handlePlatformToggle = (platformId: string) => {
    const current = data.selectedPlatforms || [];
    let updated: string[];

    if (current.includes(platformId)) {
      updated = current.filter(id => id !== platformId);
    } else {
      if (current.length >= 3) {
        return; // Max 3 platforms
      }
      updated = [...current, platformId];
    }

    setData({
      selectedPlatforms: updated,
      platformOrder: updated,
    });
  };

  const selectedCount = data.selectedPlatforms?.length || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Which platforms do you want content for?</CardTitle>
          <CardDescription>
            Select 1-3 platforms. We'll generate quality content for each platform, one at a time.
            More platforms = more content to review, so start focused.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_PLATFORMS.map((platform) => {
              const Icon = PLATFORM_ICONS[platform.id] || FileText;
              const isSelected = data.selectedPlatforms?.includes(platform.id);
              const isDisabled = !isSelected && selectedCount >= 3;

              return (
                <label
                  key={platform.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : isDisabled
                      ? 'border-muted bg-muted/30 cursor-not-allowed opacity-50'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => !isDisabled && handlePlatformToggle(platform.id)}
                    disabled={isDisabled}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      {platform.name}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{platform.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Platform Order (if multiple selected) */}
      {selectedCount > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Platform Priority Order</CardTitle>
            <CardDescription>
              We'll generate content for each platform in this order. You can drag to reorder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.platformOrder?.map((platformId, index) => {
                const platform = AVAILABLE_PLATFORMS.find(p => p.id === platformId);
                if (!platform) return null;
                const Icon = PLATFORM_ICONS[platformId] || FileText;

                return (
                  <div
                    key={platformId}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    <Badge variant="outline" className="font-mono">
                      {index + 1}
                    </Badge>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{platform.name}</span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      30 posts
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div>
          <span className="font-medium">{selectedCount} platform{selectedCount !== 1 ? 's' : ''} selected</span>
          <span className="text-muted-foreground ml-2">
            = {selectedCount * 30} total pieces of content
          </span>
        </div>
        {selectedCount >= 1 && selectedCount <= 3 && (
          <Badge variant="secondary" className={selectedCount === 1 ? 'bg-green-500/10 text-green-600' : ''}>
            {selectedCount === 1 && '✓ Focused approach'}
            {selectedCount === 2 && '2 platforms'}
            {selectedCount === 3 && 'Maximum selected'}
          </Badge>
        )}
      </div>

      {selectedCount === 0 && (
        <p className="text-center text-muted-foreground py-4">
          Select at least one platform to continue
        </p>
      )}
    </div>
  );
}
