import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlashSaleWizardData, EMAIL_SEQUENCE_TYPES, generateEmailSequence } from '@/types/flashSale';
import { Mail, Clock, Zap, Flame } from 'lucide-react';

interface StepProps {
  data: FlashSaleWizardData;
  setData: (updates: Partial<FlashSaleWizardData>) => void;
}

const SEQUENCE_ICONS: Record<string, React.ReactNode> = {
  minimal: <Mail className="h-5 w-5" />,
  standard: <Clock className="h-5 w-5" />,
  aggressive: <Flame className="h-5 w-5" />,
};

export function StepEmailSequence({ data, setData }: StepProps) {
  // Generate email sequence when type changes
  useEffect(() => {
    if (data.startDate && data.endDate) {
      const emails = generateEmailSequence(data.emailSequenceType, data.startDate, data.endDate);
      setData({ emailsPlanned: emails });
    }
  }, [data.emailSequenceType, data.startDate, data.endDate]);

  const toggleEmail = (emailId: string, enabled: boolean) => {
    setData({
      emailsPlanned: data.emailsPlanned.map((email) =>
        email.id === emailId ? { ...email, enabled } : email
      ),
    });
  };

  const updateEmailSubject = (emailId: string, subject: string) => {
    setData({
      emailsPlanned: data.emailsPlanned.map((email) =>
        email.id === emailId ? { ...email, subject } : email
      ),
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-purple-500/10">
          <Mail className="h-8 w-8 text-purple-500" />
        </div>
        <h2 className="text-2xl font-bold">Email Sequence</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Plan your email touchpoints throughout the sale
        </p>
      </div>

      {/* List Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Email List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Do you have an existing email list?</Label>
              <p className="text-sm text-muted-foreground">
                Flash sales work best with warm audiences
              </p>
            </div>
            <Switch
              checked={data.hasExistingList}
              onCheckedChange={(checked) => setData({ hasExistingList: checked })}
            />
          </div>

          {data.hasExistingList && (
            <div className="space-y-2">
              <Label>Approximate list size</Label>
              <Input
                placeholder="e.g., 500, 2000, 10k+"
                value={data.listSize}
                onChange={(e) => setData({ listSize: e.target.value })}
              />
            </div>
          )}

          {!data.hasExistingList && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Tip:</strong> Without an email list, focus heavily on social media promotion. 
                Consider running a quick freebie campaign first to build your list.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sequence Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Intensity</CardTitle>
          <CardDescription>
            How many emails will you send during the sale?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.emailSequenceType}
            onValueChange={(v) => setData({ emailSequenceType: v as FlashSaleWizardData['emailSequenceType'] })}
            className="space-y-3"
          >
            {(Object.entries(EMAIL_SEQUENCE_TYPES) as [keyof typeof EMAIL_SEQUENCE_TYPES, typeof EMAIL_SEQUENCE_TYPES[keyof typeof EMAIL_SEQUENCE_TYPES]][]).map(([key, config]) => (
              <Label
                key={key}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  data.emailSequenceType === key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={key} className="mt-0.5" />
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    {SEQUENCE_ICONS[key]}
                  </div>
                  <div>
                    <p className="font-medium">{config.label}</p>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Email Schedule */}
      {data.emailsPlanned.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email Schedule</CardTitle>
            <CardDescription>
              Customize your email subjects and toggle emails on/off
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.emailsPlanned.map((email, index) => (
              <div
                key={email.id}
                className={`p-4 rounded-lg border ${
                  email.enabled ? 'bg-background' : 'bg-muted/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                        Email {index + 1}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {email.sendTimeLabel}
                      </span>
                    </div>
                    
                    <div>
                      <p className="font-medium text-sm mb-1">{email.name}</p>
                      <Input
                        placeholder="Email subject line..."
                        value={email.subject}
                        onChange={(e) => updateEmailSubject(email.id, e.target.value)}
                        disabled={!email.enabled}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  
                  <Switch
                    checked={email.enabled}
                    onCheckedChange={(checked) => toggleEmail(email.id, checked)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Copy Hint */}
      <Card className="border-dashed border-2 bg-muted/30">
        <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium">AI can write your entire email sequence</p>
              <p className="text-sm text-muted-foreground">
                Generate all {data.emailsPlanned.filter(e => e.enabled).length} emails in the Review step
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
