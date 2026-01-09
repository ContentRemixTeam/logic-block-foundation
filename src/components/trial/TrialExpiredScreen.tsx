import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle2, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface TrialExpiredScreenProps {
  expiredAt?: Date;
}

export function TrialExpiredScreen({ expiredAt }: TrialExpiredScreenProps) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleJoinClick = () => {
    window.open('https://faithmariah.com/join', '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Your Trial Has Ended</CardTitle>
          <CardDescription>
            {expiredAt
              ? `Your 3-day trial expired on ${format(expiredAt, 'MMMM d, yyyy')} at ${format(expiredAt, 'h:mm a')}`
              : 'Your trial period has expired'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">What happens now?</h3>
            <p className="text-sm text-muted-foreground">
              Your 90-day plan and all your data are saved, but you can't access them
              without an active Mastermind membership.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Join the Mastermind to:</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>Restore full access to your plan</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>Keep using tasks, habits, weekly planner</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>Weekly coaching and community support</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>Help executing your plan for 90 days</span>
              </li>
            </ul>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold mb-1">$997/year</div>
            <div className="text-sm text-muted-foreground mb-4">
              That's just $83/month • Payment plans available
            </div>
            <Button size="lg" className="w-full" onClick={handleJoinClick}>
              Join the Mastermind
            </Button>
          </div>

          <div className="text-center">
            <Button variant="ghost" onClick={handleSignOut} className="text-muted-foreground">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
