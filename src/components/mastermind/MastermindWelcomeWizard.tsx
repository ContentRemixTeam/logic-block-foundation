import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UntypedQueryResult {
  error: unknown;
}

interface UntypedQuery extends PromiseLike<UntypedQueryResult> {
  upsert(values: Record<string, unknown>, options: { onConflict: string }): UntypedQuery;
}

const db = supabase as unknown as { from(table: string): UntypedQuery };
const MAX_LENGTH = 500;

interface MastermindWelcomeWizardProps {
  onComplete: () => void;
}

export function MastermindWelcomeWizard({ onComplete }: MastermindWelcomeWizardProps) {
  const [values, setValues] = useState({
    business_context: '',
    reason_joined: '',
    support_preference: '',
    capacity_constraints: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setValue = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    const normalized = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, value.trim()]),
    ) as typeof values;
    if (Object.values(normalized).some((value) => !value)) {
      setError('Please answer each welcome question.');
      return;
    }
    if (Object.values(normalized).some((value) => value.length > MAX_LENGTH)) {
      setError(`Keep each answer to ${MAX_LENGTH} characters or fewer.`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error('Sign in to save your welcome profile.');
      const savedAt = new Date().toISOString();
      const result = await db.from('mastermind_onboarding_profiles').upsert(
        {
          user_id: auth.user.id,
          ...normalized,
          draft: normalized,
          completed_at: savedAt,
          updated_at: savedAt,
        },
        { onConflict: 'user_id' },
      );
      if (result.error) throw result.error;
      onComplete();
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message
          ? caught.message
          : 'We could not save your welcome profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    ['business_context', 'What are you building right now?', 'Business context'],
    ['reason_joined', 'Why did you join the Mastermind?', 'Reason joined'],
    ['support_preference', 'How do you prefer to be supported?', 'Support preference'],
    [
      'capacity_constraints',
      'What capacity constraints should your plan respect?',
      'Capacity constraints',
    ],
  ] as const;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Welcome to the Mastermind</CardTitle>
        <CardDescription>
          Tell us what support needs to fit around. This is durable context; your next screen
          builds the actual 90-day plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {fields.map(([key, prompt, label]) => (
          <div className="space-y-2" key={key}>
            <Label htmlFor={key}>{prompt}</Label>
            <Input
              id={key}
              value={values[key]}
              onChange={(event) => setValue(key, event.target.value)}
              aria-label={label}
              maxLength={MAX_LENGTH}
              className="min-h-11"
            />
          </div>
        ))}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          className="min-h-11 w-full sm:w-auto"
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? 'Saving…' : 'Continue to my 90-day plan'}
        </Button>
      </CardContent>
    </Card>
  );
}
