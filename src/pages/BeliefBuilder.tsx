import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Zap, Plus, Trash2, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useFormDraftProtection } from '@/hooks/useFormDraftProtection';

interface Belief {
  belief_id: string;
  limiting_belief: string;
  upgraded_belief: string;
  confidence_score: number;
  evidence_for_new_belief: string[];
  action_commitments: string[];
  created_at: string;
}

export default function BeliefBuilder() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBelief, setEditingBelief] = useState<Belief | null>(null);
  const [limitingBelief, setLimitingBelief] = useState('');
  const [upgradedBelief, setUpgradedBelief] = useState('');
  const [confidenceScore, setConfidenceScore] = useState([5]);
  const [newEvidence, setNewEvidence] = useState('');
  const [evidenceList, setEvidenceList] = useState<string[]>([]);
  const [newCommitment, setNewCommitment] = useState('');
  const [commitmentList, setCommitmentList] = useState<string[]>([]);

  // Draft protection for belief form
  const beliefDraftProtection = useFormDraftProtection<{
    limitingBelief: string;
    upgradedBelief: string;
    confidenceScore: number;
    evidenceList: string[];
    commitmentList: string[];
  }>({
    localStorageKey: `belief_draft_${editingBelief?.belief_id || 'new'}`,
    enabled: isDialogOpen,
  });

  // Save draft when form changes
  useEffect(() => {
    if (isDialogOpen && (limitingBelief || upgradedBelief)) {
      beliefDraftProtection.saveDraft({
        limitingBelief,
        upgradedBelief,
        confidenceScore: confidenceScore[0],
        evidenceList,
        commitmentList,
      });
    }
  }, [isDialogOpen, limitingBelief, upgradedBelief, confidenceScore, evidenceList, commitmentList]);

  // Restore draft when dialog opens for new belief
  useEffect(() => {
    if (isDialogOpen && !editingBelief && beliefDraftProtection.hasDraft && !limitingBelief && !upgradedBelief) {
      const draft = beliefDraftProtection.loadDraft();
      if (draft) {
        setLimitingBelief(draft.limitingBelief || '');
        setUpgradedBelief(draft.upgradedBelief || '');
        setConfidenceScore([draft.confidenceScore || 5]);
        setEvidenceList(draft.evidenceList || []);
        setCommitmentList(draft.commitmentList || []);
        toast.success('Draft restored - your previous unsaved belief has been restored');
      }
    }
  }, [isDialogOpen, editingBelief]);

  const { data: beliefs = [], isLoading } = useQuery({
    queryKey: ['beliefs'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('get-beliefs', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      return data as Belief[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (belief: any) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('create-belief', {
        body: belief,
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beliefs'] });
      toast.success('⚡ Belief created successfully!');
      beliefDraftProtection.clearDraft();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to create belief');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (belief: any) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('update-belief', {
        body: belief,
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beliefs'] });
      toast.success('⚡ Belief updated successfully!');
      beliefDraftProtection.clearDraft();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to update belief');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (beliefId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('delete-belief', {
        body: { belief_id: beliefId },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beliefs'] });
      toast.success('Belief deleted');
    },
    onError: () => {
      toast.error('Failed to delete belief');
    }
  });

  const resetForm = () => {
    setLimitingBelief('');
    setUpgradedBelief('');
    setConfidenceScore([5]);
    setEvidenceList([]);
    setCommitmentList([]);
    setNewEvidence('');
    setNewCommitment('');
    setEditingBelief(null);
  };

  const handleEdit = (belief: Belief) => {
    setEditingBelief(belief);
    setLimitingBelief(belief.limiting_belief);
    setUpgradedBelief(belief.upgraded_belief);
    setConfidenceScore([belief.confidence_score]);
    setEvidenceList(belief.evidence_for_new_belief || []);
    setCommitmentList(belief.action_commitments || []);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!limitingBelief.trim() || !upgradedBelief.trim()) {
      toast.error('Please fill in both belief fields');
      return;
    }

    const beliefData = {
      limiting_belief: limitingBelief,
      upgraded_belief: upgradedBelief,
      confidence_score: confidenceScore[0],
      evidence_for_new_belief: evidenceList,
      action_commitments: commitmentList
    };

    if (editingBelief) {
      updateMutation.mutate({ ...beliefData, belief_id: editingBelief.belief_id });
    } else {
      createMutation.mutate(beliefData);
    }
  };

  const addEvidence = () => {
    if (newEvidence.trim()) {
      setEvidenceList([...evidenceList, newEvidence.trim()]);
      setNewEvidence('');
    }
  };

  const removeEvidence = (index: number) => {
    setEvidenceList(evidenceList.filter((_, i) => i !== index));
  };

  const addCommitment = () => {
    if (newCommitment.trim()) {
      setCommitmentList([...commitmentList, newCommitment.trim()]);
      setNewCommitment('');
    }
  };

  const removeCommitment = (index: number) => {
    setCommitmentList(commitmentList.filter((_, i) => i !== index));
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Belief Builder</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Belief
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBelief ? 'Edit Belief' : 'Create New Belief'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Limiting Belief</Label>
                <Textarea
                  value={limitingBelief}
                  onChange={(e) => setLimitingBelief(e.target.value)}
                  placeholder="What's the old belief holding you back?"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Upgraded Belief</Label>
                <Textarea
                  value={upgradedBelief}
                  onChange={(e) => setUpgradedBelief(e.target.value)}
                  placeholder="What's the new empowering belief?"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Confidence: {confidenceScore[0]}/10</Label>
                <Slider
                  value={confidenceScore}
                  onValueChange={setConfidenceScore}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Evidence for New Belief</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newEvidence}
                    onChange={(e) => setNewEvidence(e.target.value)}
                    placeholder="Add evidence..."
                    onKeyPress={(e) => e.key === 'Enter' && addEvidence()}
                  />
                  <Button onClick={addEvidence} size="sm">Add</Button>
                </div>
                <div className="mt-2 space-y-1">
                  {evidenceList.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                      <span className="flex-1">{item}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeEvidence(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Action Commitments</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newCommitment}
                    onChange={(e) => setNewCommitment(e.target.value)}
                    placeholder="Add commitment..."
                    onKeyPress={(e) => e.key === 'Enter' && addCommitment()}
                  />
                  <Button onClick={addCommitment} size="sm">Add</Button>
                </div>
                <div className="mt-2 space-y-1">
                  {commitmentList.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                      <span className="flex-1">{item}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeCommitment(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleSave} 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Saving...
                  </>
                ) : (
                  editingBelief ? 'Update Belief' : 'Create Belief'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading beliefs...</div>
      ) : beliefs.length === 0 ? (
        <Card className="p-12 text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No beliefs yet</h3>
          <p className="text-muted-foreground mb-4">
            Start transforming limiting beliefs into empowering ones
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {beliefs.map((belief) => (
            <Card key={belief.belief_id} className="p-6">
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Limiting Belief</div>
                    <p className="text-sm line-through opacity-60">{belief.limiting_belief}</p>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Upgraded Belief
                    </div>
                    <p className="text-sm font-medium">{belief.upgraded_belief}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Confidence</span>
                    <span className="text-sm font-medium">{belief.confidence_score}/10</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(belief.confidence_score / 10) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(belief)}>
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Belief?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this belief and all associated evidence.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(belief.belief_id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      </div>
    </Layout>
  );
}
