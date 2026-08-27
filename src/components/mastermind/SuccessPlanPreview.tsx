import { Link } from 'react-router-dom';
import { Bot, CalendarDays, ExternalLink, HelpCircle, ListChecks, Target, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { inferSuccessPathStage } from '@/lib/mastermindSuccessPlan';

const ASK_FAITH_URL = 'https://airtable.com/appP01GhbZAtwT4nN/shrIRdOHFXijc8462';

export function SuccessPlanPreview() {
  const { data: cycle, isLoading } = useActiveCycle();

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!cycle?.cycle_id) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <Badge variant="secondary" className="w-fit">Success Plan</Badge>
          <CardTitle className="text-2xl">Build your 90-day plan first</CardTitle>
          <CardDescription>
            The portal gets useful after the planner knows the business result, bottleneck, and next 90 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="gap-2">
            <Link to="/cycle-setup">
              <Target className="h-4 w-4" />
              Build 90-Day Plan
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stage = inferSuccessPathStage(cycle);
  const planHref = `/cycle-setup?edit=${cycle.cycle_id}`;

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">Based on your 90-day plan</Badge>
            <CardTitle className="text-2xl leading-tight">{cycle.goal || 'Your active 90-day cycle'}</CardTitle>
            <CardDescription>
              Suggested path: <span className="font-medium text-foreground">{stage.label}</span>
            </CardDescription>
          </div>
          <Button variant="outline" asChild className="w-full gap-2 sm:w-auto">
            <Link to={planHref}>
              <Target className="h-4 w-4" />
              Edit Plan
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-primary" />
              Next Money Move
            </div>
            <p className="text-sm text-muted-foreground">{stage.nextMoneyMove}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-primary" />
              Messy Action Sprint
            </div>
            <p className="text-sm text-muted-foreground">{stage.messyActionSprint}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <HelpCircle className="h-4 w-4 text-primary" />
              Ask Faith
            </div>
            <p className="text-sm text-muted-foreground">{stage.askFaithPrompt}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="gap-2">
            <Link to="/weekly-plan">
              <CalendarDays className="h-4 w-4" />
              Plan This Week
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <a href={ASK_FAITH_URL} target="_blank" rel="noopener noreferrer">
              <HelpCircle className="h-4 w-4" />
              Ask Faith
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link to="/settings">
              <Bot className="h-4 w-4" />
              Enable Faith AI
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
