import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { MASTERMIND_URL } from '@/constants/moneyMovesConfig';
import { useMembership } from '@/hooks/useMembership';

export function MastermindCTA() {
  const { membershipTier, membershipStatus } = useMembership();
  const isMember = membershipTier === 'mastermind' && membershipStatus === 'active';
  if (isMember) return null;

  return (
    <Card className="editorial-card p-6 bg-gradient-to-br from-primary/5 to-accent/10 border-primary/20">
      <h3 className="font-display text-2xl text-foreground mb-2">
        Want coaching on your next rung?
      </h3>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        This is the kind of work we keep doing inside the Becoming Boss Mastermind —
        coaching, accountability, and the next honest move every week.
      </p>
      <Button asChild>
        <a href={MASTERMIND_URL} target="_blank" rel="noreferrer">
          Join the Mastermind
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </a>
      </Button>
    </Card>
  );
}
