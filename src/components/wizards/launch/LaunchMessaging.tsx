import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { LaunchWizardData } from '@/types/launch';

interface LaunchMessagingProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

export function LaunchMessaging({ data, onChange }: LaunchMessagingProps) {
  const beliefShifts = data.beliefShifts || [
    { from: '', to: '' },
    { from: '', to: '' },
    { from: '', to: '' },
  ];
  
  const objectionsToAddress = Array.isArray(data.objectionsToAddress) 
    ? data.objectionsToAddress 
    : ['', '', ''];

  const updateBeliefShift = (index: number, field: 'from' | 'to', value: string) => {
    const newShifts = [...beliefShifts];
    newShifts[index] = { ...newShifts[index], [field]: value };
    onChange({ beliefShifts: newShifts });
  };

  const updateObjection = (index: number, value: string) => {
    const newObjections = [...objectionsToAddress];
    newObjections[index] = value;
    onChange({ objectionsToAddress: newObjections });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧠 Messaging Strategy
        </CardTitle>
        <CardDescription>
          What do people need to THINK and BELIEVE to be ready to buy when you open cart? 
          Map out the mental journey.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Current Mindset */}
        <div className="space-y-2">
          <Label className="text-base font-medium flex items-center gap-2">
            📍 Where is your audience RIGHT NOW mentally?
          </Label>
          <Textarea
            placeholder="Example: They're overwhelmed trying to grow their business. They've tried a bunch of tactics but nothing's working consistently. They're losing confidence and wondering if they're cut out for this."
            value={(data.currentMindset as string) || ''}
            onChange={(e) => onChange({ currentMindset: e.target.value })}
            className="min-h-[100px]"
          />
        </div>

        {/* Belief Shifts */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium flex items-center gap-2">
              🔄 What 3 belief shifts do they need to make?
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              These are the mental transitions from where they are now to being ready to invest in your solution.
            </p>
          </div>

          {[0, 1, 2].map((index) => (
            <div key={index} className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <Label className="text-sm font-medium">Belief Shift #{index + 1}</Label>
              <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">FROM believing:</Label>
                  <Input
                    placeholder={
                      index === 0 ? '"I need more tactics"' :
                      index === 1 ? '"I\'m not tech-savvy enough"' :
                      '"It works for others, not me"'
                    }
                    value={beliefShifts[index]?.from || ''}
                    onChange={(e) => updateBeliefShift(index, 'from', e.target.value)}
                  />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground mt-5" />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">TO believing:</Label>
                  <Input
                    placeholder={
                      index === 0 ? '"I need a proven system"' :
                      index === 1 ? '"The right tools make it simple"' :
                      '"I just need the right approach"'
                    }
                    value={beliefShifts[index]?.to || ''}
                    onChange={(e) => updateBeliefShift(index, 'to', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Objections */}
        <div className="space-y-3">
          <div>
            <Label className="text-base font-medium flex items-center gap-2">
              🛡️ Top 3 objections you need to address BEFORE the launch
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              What stops people from buying? Address these in your runway content.
            </p>
          </div>
          
          <div className="space-y-2">
            <Input
              placeholder="Objection #1 - e.g., I don't have time"
              value={objectionsToAddress[0] || ''}
              onChange={(e) => updateObjection(0, e.target.value)}
            />
            <Input
              placeholder="Objection #2 - e.g., It's too expensive"
              value={objectionsToAddress[1] || ''}
              onChange={(e) => updateObjection(1, e.target.value)}
            />
            <Input
              placeholder="Objection #3 - e.g., I've tried this before"
              value={objectionsToAddress[2] || ''}
              onChange={(e) => updateObjection(2, e.target.value)}
            />
          </div>
        </div>

        {/* Transformation */}
        <div className="space-y-2">
          <Label className="text-base font-medium flex items-center gap-2">
            ✨ What's the TRANSFORMATION you're selling?
          </Label>
          <p className="text-sm text-muted-foreground">
            Not features - the RESULT. Focus on the before → after.
          </p>
          <Textarea
            placeholder="Example: Go from posting randomly and getting no leads to a system that brings you 10+ qualified leads per week without spending money on ads."
            value={(data.transformationPromise as string) || ''}
            onChange={(e) => onChange({ transformationPromise: e.target.value })}
            className="min-h-[100px]"
          />
        </div>

        {/* Educational Alert */}
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-300">Why Messaging Matters</AlertTitle>
          <AlertDescription className="text-sm text-green-700 dark:text-green-400">
            <strong>Launches with pre-planned messaging convert 3-5x higher</strong> than launches 
            that wing it. When you address objections and create belief shifts BEFORE asking for 
            the sale, your conversion rate skyrockets.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
