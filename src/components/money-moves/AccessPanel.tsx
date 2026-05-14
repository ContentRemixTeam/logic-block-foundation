import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Youtube } from 'lucide-react';
import { useMembership } from '@/hooks/useMembership';
import {
  MONEY_MOVES_PORTAL,
  MONEY_MOVES_YOUTUBE,
  MONEY_MOVES_YOUTUBE_SUB,
} from '@/constants/moneyMovesConfig';

export function AccessPanel() {
  const { isMember } = useMembership();

  if (isMember) {
    return (
      <Card className="editorial-card p-6 space-y-3">
        <h3 className="font-display text-xl text-foreground">Mastermind access</h3>
        <p className="text-sm text-muted-foreground">
          You already have ongoing access. Keep using this tracker after the sprint —
          we'll keep coaching the next rung inside the Mastermind.
        </p>
        <Button variant="outline" size="sm" asChild>
          <a href={MONEY_MOVES_PORTAL} target="_blank" rel="noreferrer">
            Open portal
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="editorial-card p-6 space-y-3">
      <h3 className="font-display text-xl text-foreground">Watch the sessions</h3>
      <p className="text-sm text-muted-foreground">
        Free sessions stream live on Faith's YouTube channel. Subscribe so you don't miss
        the Live tab going up.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <a href={MONEY_MOVES_YOUTUBE_SUB} target="_blank" rel="noreferrer">
            <Youtube className="mr-1.5 h-4 w-4" />
            Subscribe
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={MONEY_MOVES_YOUTUBE} target="_blank" rel="noreferrer">
            Open YouTube
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </Card>
  );
}
