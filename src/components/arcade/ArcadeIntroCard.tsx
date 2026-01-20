import { useArcade } from '@/hooks/useArcade';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Intro card for users who haven't used the gamification system yet.
 * Shows when user has no pet selected or 0 coins earned.
 */
export function ArcadeIntroCard() {
  const { user } = useAuth();
  const { wallet, pet, settings } = useArcade();

  // Don't show if arcade is disabled
  if (!settings?.arcade_enabled) return null;

  // Don't show if user has already engaged (has coins or a pet)
  const hasEngaged = (wallet?.total_coins_earned ?? 0) > 0 || pet !== null;
  if (hasEngaged) return null;

  return (
    <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border-primary/30">
      <CardContent className="py-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                🎮 Make Planning Fun!
                <Badge variant="secondary" className="text-xs">New</Badge>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Complete your Daily Top 3 tasks to earn coins and grow your pet!
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span>Pick 3 tasks</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                <span>Earn 5 coins each</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🐣</span>
                <span>Hatch a pet daily</span>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Link to="/arcade">
                <Button size="sm" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Get Started
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" size="sm">
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
