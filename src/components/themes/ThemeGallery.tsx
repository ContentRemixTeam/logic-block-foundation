/**
 * Theme Gallery
 * Shows unlocked and locked themes with preview/apply functionality
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Palette, Lock, Check, Sparkles, RotateCcw, Loader2 } from 'lucide-react';
import { useUnlockedThemes, AppTheme } from '@/hooks/useUnlockedThemes';
import { useDelightSettings } from '@/hooks/useDelightSettings';
import { testConfetti } from '@/lib/celebrationService';
import { cn } from '@/lib/utils';

function ThemePreviewModal({
  theme,
  open,
  onOpenChange,
  onApply,
  isApplying,
  isActive,
}: {
  theme: AppTheme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: () => void;
  isApplying: boolean;
  isActive: boolean;
}) {
  const handleTestConfetti = () => {
    if (theme.config.fx.confetti.enabled) {
      testConfetti(theme.config.fx.confetti.style, theme.config.fx.confetti.intensity);
    } else {
      testConfetti('classic', 'medium');
    }
  };

  // Get preview colors from tokens
  const tokens = theme.config.tokens;
  const previewBg = tokens['--background'] || '#ffffff';
  const previewPrimary = tokens['--primary'] || '#6366f1';
  const previewCard = tokens['--card'] || '#f8fafc';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{theme.preview_emoji}</span>
            {theme.name}
          </DialogTitle>
          <DialogDescription>
            Preview this theme before applying it
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Color Preview */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Colors</p>
            <div className="flex gap-2">
              {Object.entries(tokens).slice(0, 6).map(([key, value]) => (
                <div
                  key={key}
                  className="w-10 h-10 rounded-lg border shadow-sm"
                  style={{ backgroundColor: value }}
                  title={key}
                />
              ))}
            </div>
          </div>

          {/* Sample UI Preview */}
          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: previewBg }}
          >
            <div
              className="p-3 rounded-md mb-2"
              style={{ backgroundColor: previewCard }}
            >
              <p className="text-sm font-medium" style={{ color: previewPrimary }}>
                Sample Card
              </p>
              <p className="text-xs text-muted-foreground">Preview text</p>
            </div>
            <div
              className="inline-block px-3 py-1.5 rounded-md text-sm font-medium text-white"
              style={{ backgroundColor: previewPrimary }}
            >
              Sample Button
            </div>
          </div>

          {/* FX Info */}
          {(theme.config.fx.confetti.enabled || theme.config.fx.sound.enabled) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>
                Includes {theme.config.fx.confetti.enabled && 'confetti'}
                {theme.config.fx.confetti.enabled && theme.config.fx.sound.enabled && ' & '}
                {theme.config.fx.sound.enabled && 'sound effects'}
              </span>
            </div>
          )}

          {/* Test Confetti Button */}
          <Button variant="outline" size="sm" onClick={handleTestConfetti} className="w-full">
            <Sparkles className="h-4 w-4 mr-2" />
            Test Celebration
          </Button>
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onApply} disabled={isApplying || isActive}>
            {isApplying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isActive ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Active
              </>
            ) : (
              'Apply Theme'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThemeCard({
  theme,
  isActive,
  onApply,
  isApplying,
}: {
  theme: AppTheme;
  isActive: boolean;
  onApply: (id: string) => void;
  isApplying: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  // Get a preview color
  const primaryColor = theme.config.tokens['--primary'] || 
    theme.config.tokens['--accent'] || 
    '#6366f1';

  return (
    <>
      <div
        className={cn(
          'relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md',
          isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          !theme.is_unlocked && 'opacity-60'
        )}
        onClick={() => theme.is_unlocked && setPreviewOpen(true)}
      >
        {/* Lock overlay for locked themes */}
        {!theme.is_unlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        {/* Active indicator */}
        {isActive && (
          <div className="absolute top-2 right-2">
            <Badge variant="default" className="text-xs">
              <Check className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
        )}

        {/* Theme preview */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl border"
            style={{ backgroundColor: primaryColor + '20' }}
          >
            {theme.preview_emoji || '🎨'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{theme.name}</p>
            <div className="flex gap-1 mt-1">
              {Object.values(theme.config.tokens).slice(0, 4).map((color, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* FX badges */}
        {theme.is_unlocked && (theme.config.fx.confetti.enabled || theme.config.fx.sound.enabled) && (
          <div className="flex gap-1 mt-2">
            {theme.config.fx.confetti.enabled && (
              <Badge variant="secondary" className="text-xs">
                🎊 {theme.config.fx.confetti.style}
              </Badge>
            )}
            {theme.config.fx.sound.enabled && (
              <Badge variant="secondary" className="text-xs">
                🔊
              </Badge>
            )}
          </div>
        )}
      </div>

      {theme.is_unlocked && (
        <ThemePreviewModal
          theme={theme}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          onApply={() => {
            onApply(theme.id);
            setPreviewOpen(false);
          }}
          isApplying={isApplying}
          isActive={isActive}
        />
      )}
    </>
  );
}

export function ThemeGallery() {
  const { themes, unlockedThemes, lockedThemes, applyTheme, isApplying, revertToDefault, isReverting } = useUnlockedThemes();
  const { settings } = useDelightSettings();

  const handleApply = async (themeId: string) => {
    await applyTheme(themeId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Themes
            </CardTitle>
            <CardDescription>
              Unlock themes by completing monthly challenges
            </CardDescription>
          </div>
          {settings.active_theme_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => revertToDefault()}
              disabled={isReverting}
            >
              {isReverting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Revert to Default
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Unlocked Themes */}
        {unlockedThemes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Unlocked</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {unlockedThemes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isActive={settings.active_theme_id === theme.id}
                  onApply={handleApply}
                  isApplying={isApplying}
                />
              ))}
            </div>
          </div>
        )}

        {/* Locked Themes */}
        {lockedThemes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Locked ({lockedThemes.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lockedThemes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isActive={false}
                  onApply={handleApply}
                  isApplying={isApplying}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Complete monthly challenges to unlock more themes!
            </p>
          </div>
        )}

        {themes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Palette className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No themes available yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
