import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Calendar, Users, DollarSign, Megaphone, Heart, Wrench } from 'lucide-react';
import { SummitWizardData, GOAL_OPTIONS, HOSTING_PLATFORMS, EMAIL_PLATFORMS } from '@/types/summit';
import { format, parseISO, differenceInDays } from 'date-fns';

interface StepProps {
  data: SummitWizardData;
  onEdit: (step: number) => void;
}

export function StepReviewCreate({ data, onEdit }: StepProps) {
  const effectiveDays = data.numDays === 0 ? data.customDays || 5 : data.numDays;
  const totalSessions = effectiveDays * data.sessionsPerDay;
  const effectiveCommission = data.affiliateCommission === 0 ? data.customCommission : data.affiliateCommission;

  // Calculate task count estimate
  const estimatedTasks = 
    15 + // Base tasks
    data.targetSpeakerCount * 3 + // Per speaker
    (data.hasSocialKit ? 5 : 0) + // Social kit
    data.engagementActivities.length * 2 + // Per activity
    (data.hasPostSummitOffer ? 8 : 0); // Post-summit offer

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getDaysUntil = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      const days = differenceInDays(parseISO(dateStr), new Date());
      if (days < 0) return 'Past';
      if (days === 0) return 'Today';
      return `${days} days`;
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summit Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Summit Overview
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onEdit(1)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{data.name || 'Untitled Summit'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Goal</span>
            <Badge variant="secondary">
              {GOAL_OPTIONS.find(g => g.value === data.primaryGoal)?.icon}{' '}
              {GOAL_OPTIONS.find(g => g.value === data.primaryGoal)?.label}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span>{effectiveDays} days • {totalSessions} sessions</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Format</span>
            <span className="capitalize">{data.sessionFormat} • {data.sessionLength} min</span>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onEdit(5)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Registration Opens</span>
            <div className="text-right">
              <span>{formatDate(data.registrationOpens)}</span>
              {getDaysUntil(data.registrationOpens) && (
                <span className="text-xs text-muted-foreground ml-2">({getDaysUntil(data.registrationOpens)})</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Summit Dates</span>
            <span>{formatDate(data.summitStartDate)} - {formatDate(data.summitEndDate)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cart Closes</span>
            <span>{formatDate(data.cartCloses)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Speakers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Speakers
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onEdit(3)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Target</span>
            <span>{data.targetSpeakerCount} speakers</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Recruitment Deadline</span>
            <span>{formatDate(data.speakerRecruitmentDeadline)}</span>
          </div>
          {data.speakersAreAffiliates !== 'none' && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Affiliate Commission</span>
              <span>{effectiveCommission}%</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All-Access Pass */}
      {data.hasAllAccessPass !== 'no' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              All-Access Pass
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onEdit(4)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium">${data.allAccessPrice || 'TBD'}</span>
            </div>
            {data.allAccessHasPaymentPlan && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Plan</span>
                <span>{data.allAccessPaymentPlanDetails || 'Yes'}</span>
              </div>
            )}
            {data.hasVipTier && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">VIP Tier</span>
                <span>${data.vipPrice}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Includes</span>
              <span>{data.allAccessIncludes.length} features</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tech & Marketing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Tech Stack
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onEdit(6)}>
              <Pencil className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>Hosting: {HOSTING_PLATFORMS.find(p => p.value === data.hostingPlatform)?.label || data.hostingPlatformOther || 'Not set'}</p>
            <p>Email: {EMAIL_PLATFORMS.find(p => p.value === data.emailPlatform)?.label || data.emailPlatformOther || 'Not set'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Marketing
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onEdit(7)}>
              <Pencil className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>{data.promotionMethods.length} channels</p>
            <p>Goal: {data.registrationGoal?.toLocaleString() || 'Not set'} registrations</p>
          </CardContent>
        </Card>
      </div>

      {/* Task Preview */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="h-5 w-5 text-primary" />
          <span className="font-medium">Ready to Create</span>
        </div>
        <p className="text-sm text-muted-foreground">
          This will create a summit project with approximately <strong>{estimatedTasks} tasks</strong> organized 
          into phases: Speaker Recruitment, Content Creation, Pre-Summit Promotion, Summit Live, and Post-Summit.
        </p>
      </div>
    </div>
  );
}
