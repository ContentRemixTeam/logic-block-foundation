import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DEFAULT_SHARE_URL } from "@/constants/community";

interface ShareToGroupButtonProps {
  content: string;
  contentType: 'win' | 'lesson' | 'challenge' | 'intention';
  disabled?: boolean;
}

const CONTENT_FORMATTING = {
  win: { emoji: '🏆', label: 'Win' },
  lesson: { emoji: '💡', label: 'Lesson' },
  challenge: { emoji: '💪', label: 'Challenge overcome' },
  intention: { emoji: '🎯', label: 'Intention' },
} as const;

export function ShareToGroupButton({ content, contentType, disabled }: ShareToGroupButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!content.trim()) return;

    const { emoji, label } = CONTENT_FORMATTING[contentType];
    const formattedContent = `${emoji} ${label}: ${content}`;

    try {
      await navigator.clipboard.writeText(formattedContent);
      setCopied(true);
      
      toast({
        title: `Your ${contentType} is copied!`,
        description: "Open the post editor and paste it there",
      });

      // Open community group after brief delay
      setTimeout(() => {
        window.open(DEFAULT_SHARE_URL, '_blank');
        setCopied(false);
      }, 500);
    } catch (err) {
      toast({
        title: "Couldn't copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const isDisabled = disabled || !content.trim();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleShare}
      disabled={isDisabled}
      className="h-8 w-8 opacity-60 hover:opacity-100 transition-opacity"
      title={`Share ${contentType} to group`}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <ExternalLink className="h-4 w-4" />
      )}
    </Button>
  );
}
