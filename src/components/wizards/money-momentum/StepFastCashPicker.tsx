import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Clock, Package, Calendar, MessageSquare, 
  Zap, Target, AlertTriangle, Sparkles, Eye
} from 'lucide-react';
import { 
  MoneyMomentumData, 
  BuyerType, 
  CashSpeed, 
  ReadyAsset, 
  WeeklyCapacity, 
  SellingComfort,
  calculateRecommendedLane,
  LANE_DEFINITIONS
} from '@/types/moneyMomentum';
import { useEffect } from 'react';

interface StepFastCashPickerProps {
  data: MoneyMomentumData;
  onChange: (updates: Partial<MoneyMomentumData>) => void;
}

export function StepFastCashPicker({ data, onChange }: StepFastCashPickerProps) {
  // Auto-calculate lane when answers change
  useEffect(() => {
    if (data.hasExistingBuyers && data.cashSpeed && data.weeklyCapacity && data.sellingComfort) {
      const lane = calculateRecommendedLane(data);
      if (lane !== data.recommendedLane) {
        onChange({ recommendedLane: lane });
      }
    }
  }, [data.hasExistingBuyers, data.cashSpeed, data.readyAssets, data.weeklyCapacity, data.sellingComfort]);

  const handleAssetChange = (asset: ReadyAsset, checked: boolean) => {
    if (checked) {
      onChange({ readyAssets: [...data.readyAssets, asset] });
    } else {
      onChange({ readyAssets: data.readyAssets.filter(a => a !== asset) });
    }
  };

  const allQuestionsAnswered = 
    data.hasExistingBuyers && 
    data.cashSpeed && 
    data.readyAssets.length > 0 && 
    data.weeklyCapacity && 
    data.sellingComfort;

  const laneInfo = data.recommendedLane ? LANE_DEFINITIONS[data.recommendedLane] : null;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Let's find the RIGHT offer for your reality right now.</h2>
        <p className="text-muted-foreground">
          You don't need 20 ideas. You need the ONE offer you can sell THIS WEEK.<br />
          Answer 5 quick questions and we'll show you what to focus on.
        </p>
      </div>

      {/* Question 1: Buyers */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Do you have buyers already?</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.hasExistingBuyers || ''}
            onValueChange={(value) => onChange({ hasExistingBuyers: value as BuyerType })}
            className="space-y-3"
          >
            {[
              { value: 'past-clients', label: 'Yes - Past clients/customers', desc: "I've sold before" },
              { value: 'past-students', label: 'Yes - Past students/members', desc: 'They know me' },
              { value: 'email-list', label: 'Yes - Email list/warm audience', desc: 'Engaged followers' },
              { value: 'cold-audience', label: 'No - Building from scratch', desc: 'Cold audience' },
            ].map(({ value, label, desc }) => (
              <Label
                key={value}
                htmlFor={`buyer-${value}`}
                className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
              >
                <RadioGroupItem value={value} id={`buyer-${value}`} />
                <div>
                  <div className="font-medium">{label}</div>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Question 2: Speed */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">How fast do you need cash?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={data.cashSpeed || ''}
            onValueChange={(value) => onChange({ cashSpeed: value as CashSpeed })}
            className="space-y-3"
          >
            {[
              { value: '24-48-hours', label: '24-48 hours', desc: 'Emergency mode', icon: Zap },
              { value: 'within-7-days', label: 'Within 7 days', desc: 'This week', icon: Calendar },
              { value: 'within-30-days', label: 'Within 30 days', desc: 'This month', icon: Target },
            ].map(({ value, label, desc, icon: Icon }) => (
              <Label
                key={value}
                htmlFor={`speed-${value}`}
                className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
              >
                <RadioGroupItem value={value} id={`speed-${value}`} />
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{label}</div>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>

          {data.cashSpeed === '24-48-hours' && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                <strong>Emergency mode:</strong> We'll focus on service offers you can sell and deliver immediately.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Question 3: Assets */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">What do you have ready to sell?</CardTitle>
          </div>
          <CardDescription>Select all that apply</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { value: 'recordings', label: 'Recordings', desc: 'Workshops, trainings, courses' },
              { value: 'templates', label: 'Templates/resources', desc: 'Ready to share' },
              { value: 'expertise-only', label: 'Expertise only', desc: 'Can teach/coach live' },
              { value: 'active-clients', label: 'Active clients', desc: 'Can upsell/add-on' },
              { value: 'nothing-built', label: 'Nothing built', desc: 'Will create as I go' },
            ].map(({ value, label, desc }) => (
              <Label
                key={value}
                htmlFor={`asset-${value}`}
                className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <Checkbox
                  id={`asset-${value}`}
                  checked={data.readyAssets.includes(value as ReadyAsset)}
                  onCheckedChange={(checked) => handleAssetChange(value as ReadyAsset, !!checked)}
                />
                <div>
                  <div className="font-medium">{label}</div>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </Label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Question 4: Capacity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">How much time do you have THIS WEEK to work on revenue?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={data.weeklyCapacity || ''}
            onValueChange={(value) => onChange({ weeklyCapacity: value as WeeklyCapacity })}
            className="space-y-3"
          >
            {[
              { value: '2-hours', label: '2 hours', desc: 'Very limited' },
              { value: '5-hours', label: '5 hours', desc: 'Part-time' },
              { value: '10-plus-hours', label: '10+ hours', desc: 'Full focus' },
            ].map(({ value, label, desc }) => (
              <Label
                key={value}
                htmlFor={`capacity-${value}`}
                className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
              >
                <RadioGroupItem value={value} id={`capacity-${value}`} />
                <div>
                  <div className="font-medium">{label}</div>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>

          {data.weeklyCapacity === '2-hours' && (
            <Alert className="bg-primary/5 border-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
              <AlertDescription>
                Limited time = focus on quick wins: Audits, session packs, or selling what you already have.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Question 5: Selling Style */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">How comfortable are you selling live?</CardTitle>
          </div>
          <CardDescription>Calls, DMs, workshops</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.sellingComfort || ''}
            onValueChange={(value) => onChange({ sellingComfort: value as SellingComfort })}
            className="space-y-3"
          >
            {[
              { value: 'very-comfortable', label: 'Very comfortable', desc: 'I love live selling' },
              { value: 'somewhat-comfortable', label: 'Somewhat comfortable', desc: 'I can do it' },
              { value: 'not-comfortable', label: 'Not comfortable', desc: 'I prefer automated/passive' },
            ].map(({ value, label, desc }) => (
              <Label
                key={value}
                htmlFor={`comfort-${value}`}
                className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
              >
                <RadioGroupItem value={value} id={`comfort-${value}`} />
                <div>
                  <div className="font-medium">{label}</div>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Recommendation Card */}
      {allQuestionsAnswered && laneInfo && (
        <Card className="border-primary bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              <CardTitle>🎯 Your Fast Cash Lane: {laneInfo.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg">{laneInfo.description}</p>
            <div>
              <p className="font-medium mb-2">Focus on:</p>
              <p className="text-muted-foreground">{laneInfo.focus}</p>
            </div>

            {data.recommendedLane === 'mixed' && (
              <Alert>
                <Sparkles className="h-5 w-5" />
                <AlertDescription>
                  <strong>Your Fast Cash Priorities (in order):</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Quick service offers (audits, sessions)</li>
                    <li>Existing content bundles or relaunches</li>
                    <li>Community/group offerings</li>
                  </ol>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-2 pt-4 border-t">
              <Badge variant="outline" className="text-xs">
                Based on your answers
              </Badge>
              <span className="text-sm text-muted-foreground">
                We'll show you the most relevant ideas next.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show All Ideas Option */}
      {allQuestionsAnswered && (
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Want to see ALL ideas instead of just the recommended ones?
          </p>
          <Button
            variant={data.showAllIdeas ? 'default' : 'outline'}
            onClick={() => onChange({ showAllIdeas: !data.showAllIdeas })}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            {data.showAllIdeas ? 'Showing All Ideas' : 'Show All Ideas'}
          </Button>
        </div>
      )}
    </div>
  );
}
