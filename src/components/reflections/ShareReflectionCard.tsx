import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Copy, ExternalLink, ChevronDown, Check, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { COMMUNITY_OPTIONS, DEFAULT_SHARE_URL } from '@/constants/community';
import type { ReflectionData } from './WeeklyReflectionForm';
import { cn } from '@/lib/utils';

interface ShareReflectionCardProps {
  data: ReflectionData;
  cycleGoal?: string;
  focusArea?: string;
  shareCount: number;
  onShare: () => void;
}

function formatToBullets(text: string): string {
  if (!text.trim()) return '';
  
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // Remove existing bullet if present
      const cleaned = line.replace(/^[-•*]\s*/, '');
      return `- ${cleaned}`;
    })
    .join('\n');
}

export function ShareReflectionCard({
  data,
  cycleGoal,
  focusArea,
  shareCount,
  onShare,
}: ShareReflectionCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const weekEnd = new Date(data.weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekRange = `${format(data.weekStartDate, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;

  const generatedPost = useMemo(() => {
    const parts: string[] = [];

    // Header
    parts.push(`✨ Weekly Wins + Lessons (${weekRange})\n`);

    // Wins
    if (data.wins.trim()) {
      parts.push(`🏆 Wins:`);
      parts.push(formatToBullets(data.wins));
      parts.push('');
    }

    // What went well
    if (data.wentWell.trim()) {
      parts.push(`💪 What went well:`);
      parts.push(formatToBullets(data.wentWell));
      parts.push('');
    }

    // What I learned
    if (data.learned.trim()) {
      parts.push(`💡 What I learned:`);
      parts.push(formatToBullets(data.learned));
      parts.push('');
    }

    // Next week focus
    if (data.nextWeekFocus.trim()) {
      parts.push(`🎯 Next week focus:`);
      parts.push(formatToBullets(data.nextWeekFocus));
      parts.push('');
    }

    // 90-day goal section
    if (data.includeGoal && cycleGoal) {
      parts.push('---');
      parts.push(`🎯 My 90-day goal: ${cycleGoal}`);
      if (focusArea) {
        parts.push(`📍 Focus area: ${focusArea.toUpperCase()}`);
      }
      parts.push('');
    }

    // Engagement prompt
    parts.push('---');
    parts.push(`What's one win you're proud of this week? 👇`);

    // Prompts footer
    if (data.includePrompts) {
      parts.push('');
      parts.push(`(Prompts I used: Wins • What went well • What I learned)`);
    }

    return parts.join('\n');
  }, [data, weekRange, cycleGoal, focusArea]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPost);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Failed to copy',
        description: 'Please try selecting and copying the text manually.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleCopyPost = async () => {
    const success = await copyToClipboard();
    if (success) {
      toast({
        title: 'Copied!',
        description: "Now tap 'Open Group' and paste your post.",
      });
    }
  };

  const handleOpenGroup = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyAndOpen = async (url: string) => {
    const success = await copyToClipboard();
    if (success) {
      toast({
        title: 'Copied!',
        description: 'Paste your post in the group (Cmd+V / long-press → Paste)',
      });
      
      // Trigger confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      
      // Increment share count
      onShare();
      
      // Open the group
      setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
      }, 300);
    }
  };

  const hasContent = data.wins.trim() || data.wentWell.trim() || data.learned.trim();

  return (
    <Card className="relative overflow-hidden">
      {/* Confetti animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <Sparkles className="h-12 w-12 text-primary animate-ping" />
        </div>
      )}

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Share to Community
        </CardTitle>
        <CardDescription>
          Preview your post and share it with the group
          {shareCount > 0 && (
            <span className="ml-2 text-primary font-medium">
              🔥 Weeks shared: {shareCount}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview */}
        <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
          {hasContent ? (
            generatedPost
          ) : (
            <span className="text-muted-foreground italic">
              Start typing your reflection above to see a preview...
            </span>
          )}
        </div>

        {/* Mobile helper text */}
        <p className="text-xs text-muted-foreground hidden sm:hidden">
          📱 On iPhone: tap in the post box → Paste
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCopyPost}
            disabled={!hasContent}
            className="flex-1 min-h-[44px]"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Post
              </>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!hasContent} className="flex-1 min-h-[44px]">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Group
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {COMMUNITY_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.key}
                  onClick={() => handleOpenGroup(option.url)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={!hasContent}
                className={cn(
                  'flex-1 min-h-[44px]',
                  hasContent && 'bg-primary hover:bg-primary/90'
                )}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy + Open Group
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {COMMUNITY_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.key}
                  onClick={() => handleCopyAndOpen(option.url)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
