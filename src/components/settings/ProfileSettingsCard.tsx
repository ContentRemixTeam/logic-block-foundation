import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

/**
 * Profile settings card — the ONE place a user manages the name we greet
 * them by. Fixes the "Hi, Info" bug for shared inboxes: we now store an
 * explicit `first_name` rather than parsing the email prefix anywhere.
 */
export function ProfileSettingsCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [initialName, setInitialName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('first_name')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const v = (data?.first_name as string | null) ?? '';
      setFirstName(v);
      setInitialName(v);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const dirty = firstName.trim() !== initialName.trim();

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const value = firstName.trim() || null;
      const { error } = await supabase
        .from('user_profiles')
        .update({ first_name: value })
        .eq('id', user.id);
      if (error) throw error;
      setInitialName(value ?? '');
      await qc.invalidateQueries({ queryKey: ['user-profile-first-name', user.id] });
      toast({ title: 'Saved', description: value ? `We'll call you ${value}.` : 'Name cleared.' });
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message ?? 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>How the planner greets you — optional.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="settings-first-name">Your name</Label>
          <Input
            id="settings-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Faith"
            maxLength={40}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to be greeted without a name.
          </p>
        </div>

        <div className="space-y-1">
          <Label>Email</Label>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={!dirty || saving || loading} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
