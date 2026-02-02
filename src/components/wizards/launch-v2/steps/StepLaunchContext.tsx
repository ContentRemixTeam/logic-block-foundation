// Step 1: Launch Context (Q1-Q3)
// Determines experience level, offer type, list status, and launch style

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Sparkles, Rocket } from 'lucide-react';
import {
  LaunchWizardV2Data,
  LaunchExperience,
  OfferType,
  EmailListStatus,
  LaunchStyle,
  LAUNCH_EXPERIENCE_OPTIONS,
  OFFER_TYPE_OPTIONS,
  EMAIL_LIST_STATUS_OPTIONS,
  LAUNCH_STYLE_OPTIONS,
  TEACHING_CONTENT,
} from '@/types/launchV2';

interface StepLaunchContextProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
}

export function StepLaunchContext({ data, onChange }: StepLaunchContextProps) {
  const isFirstTime = data.launchExperience === 'first-time';
  const hasLaunchedBefore = data.launchExperience === 'launched-before' || data.launchExperience === 'launched-recently';

  return (
    <div className="space-y-8">
      {/* Teaching intro */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Let's get to know your launch
          </CardTitle>
          <CardDescription>
            These questions help us personalize your experience and task list.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Q1: Launch Experience */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">
          Is this your first launch?
        </Label>
        <RadioGroup
          value={data.launchExperience}
          onValueChange={(value) => onChange({ 
            launchExperience: value as LaunchExperience,
            // Clear previous launch fields if switching to first-time
            ...(value === 'first-time' ? {
              previousLaunchLearnings: '',
              whatWentWell: '',
              whatToImprove: '',
            } : {})
          })}
          className="space-y-3"
        >
          {LAUNCH_EXPERIENCE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-start space-x-3">
              <RadioGroupItem 
                value={option.value} 
                id={`experience-${option.value}`}
                className="mt-1"
              />
              <div className="flex-1">
                <Label 
                  htmlFor={`experience-${option.value}`} 
                  className="cursor-pointer font-medium"
                >
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>

        {/* Teaching content for first-timers */}
        {isFirstTime && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex gap-3">
              <Lightbulb className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800 dark:text-green-200">
                {TEACHING_CONTENT.firstTimeLauncher}
              </p>
            </div>
          </div>
        )}

        {/* Previous launch reflection for experienced launchers */}
        {hasLaunchedBefore && (
          <div className="mt-4 space-y-4 p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm font-medium">
              Quick reflection on your last launch:
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="what-went-well" className="text-sm">
                  What went well?
                </Label>
                <Textarea
                  id="what-went-well"
                  value={data.whatWentWell}
                  onChange={(e) => onChange({ whatWentWell: e.target.value })}
                  placeholder="e.g., My email sequence converted well..."
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="what-to-improve" className="text-sm">
                  What would you do differently?
                </Label>
                <Textarea
                  id="what-to-improve"
                  value={data.whatToImprove}
                  onChange={(e) => onChange({ whatToImprove: e.target.value })}
                  placeholder="e.g., Start promoting earlier..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Q2: Offer Type */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">
          What type of offer are you launching?
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {OFFER_TYPE_OPTIONS.map((option) => (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                data.offerType === option.value 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                  : 'border-border'
              }`}
              onClick={() => onChange({ offerType: option.value as OfferType })}
            >
              <CardContent className="p-4 text-center">
                <span className="text-2xl mb-2 block">{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Other offer type input */}
        {data.offerType === 'other' && (
          <div className="mt-3">
            <Label htmlFor="other-offer-type" className="text-sm">
              Describe your offer type
            </Label>
            <Input
              id="other-offer-type"
              value={data.otherOfferType}
              onChange={(e) => onChange({ otherOfferType: e.target.value })}
              placeholder="e.g., Done-for-you service, Template pack..."
              className="mt-1"
            />
          </div>
        )}
      </div>

      {/* Q3: Email List Status */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">
          Do you have an email list for this launch?
        </Label>
        <RadioGroup
          value={data.emailListStatus}
          onValueChange={(value) => onChange({ emailListStatus: value as EmailListStatus })}
          className="space-y-3"
        >
          {EMAIL_LIST_STATUS_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem 
                value={option.value} 
                id={`list-${option.value}`}
              />
              <Label 
                htmlFor={`list-${option.value}`} 
                className="cursor-pointer flex items-center gap-2"
              >
                {option.label}
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    option.color === 'green' ? 'border-green-500 text-green-600' :
                    option.color === 'yellow' ? 'border-yellow-500 text-yellow-600' :
                    option.color === 'red' ? 'border-red-500 text-red-600' :
                    'border-blue-500 text-blue-600'
                  }`}
                >
                  {option.color === 'green' ? '✓ Great' :
                   option.color === 'yellow' ? 'Okay' :
                   option.color === 'red' ? 'We\'ll work with it' :
                   'Growing'}
                </Badge>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Contextual advice based on list status */}
        {data.emailListStatus === 'starting-zero' && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>No list? No problem.</strong> We'll add visibility and list-building tasks to your launch plan. Social media, collaborations, and direct outreach can work great for first launches.
            </p>
          </div>
        )}

        {data.emailListStatus === 'small-nervous' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Small lists can convert!</strong> A warm, engaged audience of 100 people often outperforms a cold list of 10,000. We'll focus on nurturing and activating who you have.
            </p>
          </div>
        )}

        {data.emailListStatus === 'not-using-email' && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-950/30 rounded-lg border border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-800 dark:text-gray-200">
              <strong>No email? That's fine.</strong> Many successful launches happen through social media, DMs, or in-person conversations. We'll focus on your other channels instead.
            </p>
          </div>
        )}
      </div>

      {/* Q4: Launch Style - NEW */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          What type of launch is this?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          This helps us tailor your tasks and timeline.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LAUNCH_STYLE_OPTIONS.map((option) => (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                data.launchStyle === option.value 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                  : 'border-border'
              }`}
              onClick={() => onChange({ launchStyle: option.value as LaunchStyle })}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{option.icon}</span>
                  <div className="flex-1">
                    <span className="font-medium text-sm block">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Style-specific guidance */}
        {data.launchStyle === 'challenge' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Challenge launches</strong> work great for building engagement! We'll help you plan daily topics, group setup, and the pitch transition.
            </p>
          </div>
        )}

        {data.launchStyle === 'webinar' && (
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-800 dark:text-purple-200">
              <strong>Webinar launches</strong> are conversion machines! We'll help you plan your pitch timing, show-up strategy, and replay approach.
            </p>
          </div>
        )}

        {data.launchStyle === 'flash-sale' && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Flash sales</strong> need a warm audience! We'll create an urgent email sequence and countdown strategy.
            </p>
          </div>
        )}

        {data.launchStyle === 'beta' && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Beta launches</strong> are about learning! We'll focus on feedback collection and testimonial gathering.
            </p>
          </div>
        )}

        {data.launchStyle === 'evergreen' && (
          <div className="mt-4 p-4 bg-teal-50 dark:bg-teal-950/30 rounded-lg border border-teal-200 dark:border-teal-800">
            <p className="text-sm text-teal-800 dark:text-teal-200">
              <strong>Evergreen funnels</strong> run on autopilot! We'll help you set up an automated sequence that sells while you sleep.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
