import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Lightbulb, 
  Package, 
  Crown, 
  Clock, 
  Users, 
  Zap, 
  CreditCard, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  MessageSquare,
  Send
} from 'lucide-react';
import { MoneyMomentumData, SelectedAction, BrainstormedIdea, formatCurrency } from '@/types/moneyMomentum';

interface StepRevenueActionsProps {
  data: MoneyMomentumData;
  onChange: (updates: Partial<MoneyMomentumData>) => void;
}

const TIME_OPTIONS = [
  { value: '15min', label: '15 minutes' },
  { value: '30min', label: '30 minutes' },
  { value: '1hour', label: '1 hour' },
  { value: '2hours', label: '2+ hours' },
];

export function StepRevenueActions({ data, onChange }: StepRevenueActionsProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [brainstormInputs, setBrainstormInputs] = useState<Record<string, Record<string, string>>>({});

  // Determine which brainstorm sections to show based on user context
  const showAllAccessPass = data.currentOffers.length >= 2;
  const showVipTier = data.currentOffers.length >= 1 || data.offerType === 'custom-project';
  const showPaymentPlans = 
    data.currentOffers.some(o => o.price >= 500) || 
    (data.projectPriceMax && data.projectPriceMax >= 500);
  const showPastClientBonuses = data.hasPastCustomers === true && data.pastCustomersComfortable > 0;
  
  // Build dynamic brainstorm sections based on context
  const BRAINSTORM_SECTIONS = [
    ...(showAllAccessPass ? [{ id: 'all_access', title: 'All-Access Pass', icon: Package, color: 'text-blue-500', description: 'Bundle multiple offers' }] : []),
    ...(showVipTier ? [{ id: 'vip_tier', title: 'VIP/Premium Tier', icon: Crown, color: 'text-amber-500', description: 'Upgrade existing offers' }] : []),
    { id: 'intensive', title: 'Quick Intensives', icon: Clock, color: 'text-green-500', description: 'Sell your time this week' },
    ...(showPastClientBonuses ? [{ id: 'past_client_bonus', title: 'Past Client Bonuses', icon: Users, color: 'text-purple-500', description: 'Re-engage previous buyers' }] : []),
    { id: 'direct_outreach', title: 'Direct Outreach', icon: MessageSquare, color: 'text-indigo-500', description: 'Personal DMs, calls, emails' },
    ...(data.hasRunFlashSale === true ? [{ id: 'flash_sale', title: 'Flash Sale Replay', icon: Zap, color: 'text-red-500', description: 'Run a successful sale again' }] : []),
    ...(showPaymentPlans ? [{ id: 'payment_plan', title: 'Payment Plans', icon: CreditCard, color: 'text-cyan-500', description: 'Make high-ticket accessible' }] : []),
    { id: 'custom', title: 'Your Custom Idea', icon: Sparkles, color: 'text-pink-500', description: 'Something unique to you' },
  ] as const;

  // Other action options - universal actions that work for everyone
  const OTHER_ACTIONS = [
    { id: 'follow-up-leads', label: 'Follow up with warm leads', hasInput: true, inputLabel: 'How many?' },
    { id: 'email-past-customers', label: 'Email past customers about', hasInput: true, inputLabel: 'About what?' },
    { id: 'post-daily', label: 'Post daily about offer on social', hasInput: true, inputLabel: 'Which offer?' },
    { id: 'book-calls', label: 'Book discovery/sales calls', hasInput: true, inputLabel: 'How many?' },
    { id: 'ask-referrals', label: 'Ask for referrals from past clients', hasInput: false },
    { id: 'text-top-leads', label: 'Text/call top 10 warmest leads', hasInput: false },
    { id: 'host-training', label: 'Host free training to pitch', hasInput: true, inputLabel: 'Which offer?' },
    { id: 'partner-affiliate', label: 'Partner/affiliate opportunity', hasInput: false },
    { id: 'other', label: 'Other action', hasInput: true, inputLabel: 'Describe' },
  ];

  const toggleSection = (id: string) => {
    setExpandedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleBrainstormInput = (sectionId: string, field: string, value: string) => {
    setBrainstormInputs(prev => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {}),
        [field]: value,
      },
    }));
  };

  const saveBrainstormIdea = (type: BrainstormedIdea['type']) => {
    const sectionInputs = brainstormInputs[type] || {};
    if (Object.keys(sectionInputs).length === 0) return;
    
    const newIdea: BrainstormedIdea = { type, data: sectionInputs };
    const existingIndex = data.brainstormedIdeas.findIndex(i => i.type === type);
    
    if (existingIndex >= 0) {
      const updated = [...data.brainstormedIdeas];
      updated[existingIndex] = newIdea;
      onChange({ brainstormedIdeas: updated });
    } else {
      onChange({ brainstormedIdeas: [...data.brainstormedIdeas, newIdea] });
    }
  };

  const isActionSelected = (actionId: string) => 
    data.selectedActions.some(a => a.id === actionId);

  const toggleAction = (actionId: string, label: string, fromBrainstorm = false, brainstormType?: string) => {
    if (isActionSelected(actionId)) {
      onChange({ 
        selectedActions: data.selectedActions.filter(a => a.id !== actionId) 
      });
    } else if (data.selectedActions.length < 5) {
      const newAction: SelectedAction = {
        id: actionId,
        action: label,
        details: '',
        why: '',
        timePerDay: '30min',
        fromBrainstorm,
        brainstormType,
      };
      onChange({ selectedActions: [...data.selectedActions, newAction] });
    }
  };

  const updateAction = (actionId: string, updates: Partial<SelectedAction>) => {
    onChange({
      selectedActions: data.selectedActions.map(a => 
        a.id === actionId ? { ...a, ...updates } : a
      ),
    });
  };

  const getBrainstormActionLabel = (type: string) => {
    const inputs = brainstormInputs[type] || {};
    switch (type) {
      case 'all_access':
        return `Create & pitch ${inputs.name || 'All-Access Pass'}`;
      case 'vip_tier':
        return `Offer VIP version of ${inputs.offer || 'offer'}`;
      case 'intensive':
        return `Sell ${inputs.type || 'intensive'} sessions`;
      case 'past_client_bonus':
        return `Reach out to ${inputs.clientName || 'past client'} with custom offer`;
      case 'direct_outreach':
        return `Direct outreach to ${inputs.target || 'warm contacts'}`;
      case 'flash_sale':
        return `Run flash sale on ${inputs.offer || 'offer'}`;
      case 'payment_plan':
        return `Add payment plan to ${inputs.offer || 'offer'}`;
      case 'custom':
        return inputs.idea || 'Custom revenue idea';
      default:
        return type;
    }
  };

  // Calculate total time commitment
  const totalHours = data.selectedActions.reduce((acc, action) => {
    switch (action.timePerDay) {
      case '15min': return acc + 0.25;
      case '30min': return acc + 0.5;
      case '1hour': return acc + 1;
      case '2hours': return acc + 2;
      default: return acc;
    }
  }, 0);

  const hasBrainstormed = Object.keys(brainstormInputs).length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">
          Most people think "I need to create something new."
        </h2>
        <p className="text-lg text-primary font-medium">WRONG.</p>
        <p className="text-muted-foreground mt-2">
          You already have everything you need to generate revenue THIS WEEK. Let's find it.
        </p>
      </div>

      {/* Flash Sale Gate Question - only show if not answered */}
      {data.hasRunFlashSale === null && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Quick Question
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Have you run a successful flash sale or promotion before?
            </p>
            <RadioGroup
              value=""
              onValueChange={(value) => onChange({ hasRunFlashSale: value === 'yes' })}
              className="flex gap-4"
            >
              <Label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="yes" />
                <span>Yes</span>
              </Label>
              <Label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="no" />
                <span>No</span>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Brainstorm Sections */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Brainstorm Revenue Ideas</CardTitle>
          </div>
          <CardDescription>
            Click each section to explore ideas. We've tailored these to your business context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {BRAINSTORM_SECTIONS.map(({ id, title, icon: Icon, color, description }) => (
            <Collapsible
              key={id}
              open={expandedSections.includes(id)}
              onOpenChange={() => toggleSection(id)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${color}`} />
                    <div className="text-left">
                      <span className="font-medium">💡 {title}</span>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    {data.brainstormedIdeas.some(i => i.type === id) && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {expandedSections.includes(id) ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-4 border rounded-lg bg-accent/20">
                {renderBrainstormSection(id, brainstormInputs[id] || {}, 
                  (field, value) => handleBrainstormInput(id, field, value),
                  () => saveBrainstormIdea(id as BrainstormedIdea['type']),
                  data
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Action Selection */}
      {hasBrainstormed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Select 3-5 Actions
            </CardTitle>
            <CardDescription>
              Pick the actions you'll ACTUALLY DO this sprint.
              <span className="ml-2 font-medium">
                Selected: {data.selectedActions.length}/5 (minimum 3)
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Brainstormed actions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">From your brainstorm:</Label>
              {BRAINSTORM_SECTIONS.map(({ id }) => {
                const inputs = brainstormInputs[id];
                if (!inputs || Object.keys(inputs).length === 0) return null;
                const label = getBrainstormActionLabel(id);
                const actionId = `brainstorm-${id}`;
                const isSelected = isActionSelected(actionId);
                
                return (
                  <div key={id} className="space-y-2">
                    <Label 
                      htmlFor={actionId}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <Checkbox
                        id={actionId}
                        checked={isSelected}
                        onCheckedChange={() => toggleAction(actionId, label, true, id)}
                        disabled={!isSelected && data.selectedActions.length >= 5}
                      />
                      <span>{label}</span>
                    </Label>
                    
                    {isSelected && (
                      <div className="pl-8 space-y-3">
                        <Input
                          placeholder="Specific details (required)"
                          value={data.selectedActions.find(a => a.id === actionId)?.details || ''}
                          onChange={(e) => updateAction(actionId, { details: e.target.value })}
                        />
                        <Textarea
                          placeholder="Why will this work? (required)"
                          value={data.selectedActions.find(a => a.id === actionId)?.why || ''}
                          onChange={(e) => updateAction(actionId, { why: e.target.value })}
                          rows={2}
                          maxLength={200}
                        />
                        <div>
                          <Label className="text-sm mb-2 block">Time per day:</Label>
                          <RadioGroup
                            value={data.selectedActions.find(a => a.id === actionId)?.timePerDay || '30min'}
                            onValueChange={(value) => updateAction(actionId, { timePerDay: value as SelectedAction['timePerDay'] })}
                            className="flex flex-wrap gap-2"
                          >
                            {TIME_OPTIONS.map(({ value, label }) => (
                              <Label 
                                key={value}
                                className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-accent/50 [&:has(:checked)]:border-primary"
                              >
                                <RadioGroupItem value={value} />
                                <span className="text-sm">{label}</span>
                              </Label>
                            ))}
                          </RadioGroup>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Other actions */}
            <div className="border-t pt-4 space-y-2">
              <Label className="text-sm font-medium">Other revenue actions:</Label>
              {OTHER_ACTIONS.map(({ id, label, hasInput, inputLabel }) => {
                const actionId = `other-${id}`;
                const isSelected = isActionSelected(actionId);
                
                return (
                  <div key={id} className="space-y-2">
                    <Label 
                      htmlFor={actionId}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <Checkbox
                        id={actionId}
                        checked={isSelected}
                        onCheckedChange={() => toggleAction(actionId, label)}
                        disabled={!isSelected && data.selectedActions.length >= 5}
                      />
                      <span>{label}</span>
                    </Label>
                    
                    {isSelected && (
                      <div className="pl-8 space-y-3">
                        <Input
                          placeholder={`${inputLabel || 'Specific details'} (required)`}
                          value={data.selectedActions.find(a => a.id === actionId)?.details || ''}
                          onChange={(e) => updateAction(actionId, { details: e.target.value })}
                        />
                        <Textarea
                          placeholder="Why will this work? (required)"
                          value={data.selectedActions.find(a => a.id === actionId)?.why || ''}
                          onChange={(e) => updateAction(actionId, { why: e.target.value })}
                          rows={2}
                          maxLength={200}
                        />
                        <div>
                          <Label className="text-sm mb-2 block">Time per day:</Label>
                          <RadioGroup
                            value={data.selectedActions.find(a => a.id === actionId)?.timePerDay || '30min'}
                            onValueChange={(value) => updateAction(actionId, { timePerDay: value as SelectedAction['timePerDay'] })}
                            className="flex flex-wrap gap-2"
                          >
                            {TIME_OPTIONS.map(({ value, label }) => (
                              <Label 
                                key={value}
                                className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-accent/50 [&:has(:checked)]:border-primary"
                              >
                                <RadioGroupItem value={value} />
                                <span className="text-sm">{label}</span>
                              </Label>
                            ))}
                          </RadioGroup>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Reality Check */}
            {data.selectedActions.length >= 3 && (
              <Alert className={totalHours > 4 ? 'border-amber-500/50 bg-amber-500/10' : 'bg-primary/5 border-primary/20'}>
                <AlertTriangle className={`h-5 w-5 ${totalHours > 4 ? 'text-amber-500' : 'text-primary'}`} />
                <AlertTitle>Time Check</AlertTitle>
                <AlertDescription>
                  <p className="mb-3">
                    You selected {data.selectedActions.length} actions requiring <strong>{totalHours} hours per day</strong>.
                  </p>
                  <RadioGroup
                    value={data.realityCheckDoable || ''}
                    onValueChange={(value) => onChange({ realityCheckDoable: value as MoneyMomentumData['realityCheckDoable'] })}
                    className="space-y-2"
                  >
                    <Label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-background/50 [&:has(:checked)]:border-primary">
                      <RadioGroupItem value="doable" />
                      <span>This is doable</span>
                    </Label>
                    <Label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-background/50 [&:has(:checked)]:border-primary">
                      <RadioGroupItem value="stretch" />
                      <span>This is a stretch but I'll try</span>
                    </Label>
                    <Label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-background/50 [&:has(:checked)]:border-primary">
                      <RadioGroupItem value="too-much" />
                      <span>This is too much - let me adjust</span>
                    </Label>
                  </RadioGroup>
                  {data.realityCheckDoable === 'too-much' && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Remove 1-2 actions to make this achievable.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function to render brainstorm section content
function renderBrainstormSection(
  type: string, 
  inputs: Record<string, string>,
  updateInput: (field: string, value: string) => void,
  onSave: () => void,
  data: MoneyMomentumData
) {
  switch (type) {
    case 'all_access':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Could you bundle multiple existing offers into one "all-access" package?
          </p>
          <div className="text-sm bg-background p-3 rounded-lg">
            <strong>Example:</strong> Instead of selling Course A ($497) + Course B ($297) separately, 
            offer "All-Access Pass" for $997 (or $197/month for 6 months)
          </div>
          <div className="space-y-3">
            <div>
              <Label className="mb-2 block">What would you call it?</Label>
              <Input 
                placeholder="All-Access Pass, VIP Membership, etc."
                value={inputs.name || ''}
                onChange={(e) => updateInput('name', e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block">One-time price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number"
                    placeholder="997"
                    value={inputs.price || ''}
                    onChange={(e) => updateInput('price', e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Or payment plan</Label>
                <Input 
                  placeholder="$197/mo for 6 months"
                  value={inputs.paymentPlan || ''}
                  onChange={(e) => updateInput('paymentPlan', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Who would you offer this to first?</Label>
              <Input 
                placeholder="Past customers who bought X, warm leads who asked about Y"
                value={inputs.audience || ''}
                onChange={(e) => updateInput('audience', e.target.value)}
              />
            </div>
          </div>
          <Button onClick={onSave} size="sm">
            <Check className="h-4 w-4 mr-1" /> Save Idea
          </Button>
        </div>
      );

    case 'vip_tier':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Could you offer a higher-tier version of something you already sell?
          </p>
          <div className="text-sm bg-background p-3 rounded-lg space-y-1">
            <strong>Examples:</strong>
            <ul className="list-disc list-inside pl-2">
              <li>Course + 1:1 coaching = VIP Course Experience</li>
              <li>Group program + private Voxer access = Premium Tier</li>
              <li>DIY offer + "done with you" sessions = VIP Package</li>
            </ul>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="mb-2 block">Which offer could have a VIP version?</Label>
              <Input 
                placeholder="Select or describe your offer"
                value={inputs.offer || ''}
                onChange={(e) => updateInput('offer', e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">What would make it VIP?</Label>
              <Textarea 
                placeholder="1:1 coaching calls, Voxer access, priority support..."
                value={inputs.vipFeatures || ''}
                onChange={(e) => updateInput('vipFeatures', e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block">Original price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number"
                    value={inputs.originalPrice || ''}
                    onChange={(e) => updateInput('originalPrice', e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">VIP price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number"
                    value={inputs.vipPrice || ''}
                    onChange={(e) => updateInput('vipPrice', e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
          </div>
          <Button onClick={onSave} size="sm">
            <Check className="h-4 w-4 mr-1" /> Save Idea
          </Button>
        </div>
      );

    case 'intensive':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Could you sell your TIME this week? This works for any business model.
          </p>
          <div className="space-y-3">
            <div>
              <Label className="mb-2 block">What type of intensive?</Label>
              <Input 
                placeholder="Voxer week, VIP Day, Power Hour, Strategy Session, Audit..."
                value={inputs.type || ''}
                onChange={(e) => updateInput('type', e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block">Duration</Label>
                <Input 
                  placeholder="1 week, 4 hours, 5 days..."
                  value={inputs.duration || ''}
                  onChange={(e) => updateInput('duration', e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-2 block">Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number"
                    value={inputs.price || ''}
                    onChange={(e) => updateInput('price', e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Who would buy this RIGHT NOW?</Label>
              <Input 
                placeholder="Past clients, people in my DMs, email subscribers..."
                value={inputs.audience || ''}
                onChange={(e) => updateInput('audience', e.target.value)}
              />
            </div>
          </div>
          <Button onClick={onSave} size="sm">
            <Check className="h-4 w-4 mr-1" /> Save Idea
          </Button>
        </div>
      );

    case 'past_client_bonus':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Who are your BEST past clients you'd love to work with again?
          </p>
          <div className="space-y-3">
            <div>
              <Label className="mb-2 block">Client name</Label>
              <Input 
                placeholder="Their name"
                value={inputs.clientName || ''}
                onChange={(e) => updateInput('clientName', e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">What did they buy from you?</Label>
              <Input 
                value={inputs.previousPurchase || ''}
                onChange={(e) => updateInput('previousPurchase', e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">What do they need help with NOW?</Label>
              <Textarea 
                value={inputs.currentNeed || ''}
                onChange={(e) => updateInput('currentNeed', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label className="mb-2 block">Custom offer for them</Label>
              <Textarea 
                placeholder="3 months of email support + updated templates - $500"
                value={inputs.customOffer || ''}
                onChange={(e) => updateInput('customOffer', e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div className="text-sm bg-background p-3 rounded-lg">
            <strong>💡 TIP:</strong> Reach out personally, not mass email. 
            "Hey [name], I've been thinking about you. I have an idea that might help with [their specific problem]."
          </div>
          <Button onClick={onSave} size="sm">
            <Check className="h-4 w-4 mr-1" /> Save Idea
          </Button>
        </div>
      );

    case 'direct_outreach':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sometimes the fastest path to revenue is a direct conversation. Who could you reach out to THIS WEEK?
          </p>
          <div className="space-y-3">
            <div>
              <Label className="mb-2 block">Who will you reach out to?</Label>
              <Input 
                placeholder="e.g., 5 people who've DMed me, old colleagues, warm contacts"
                value={inputs.target || ''}
                onChange={(e) => updateInput('target', e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">What will you offer/ask?</Label>
              <Textarea 
                placeholder="e.g., Coffee chat to learn about their needs, pitch my services, ask for referrals"
                value={inputs.offer || ''}
                onChange={(e) => updateInput('offer', e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label className="mb-2 block">How many conversations will you initiate?</Label>
              <Input 
                type="number"
                placeholder="e.g., 10"
                value={inputs.count || ''}
                onChange={(e) => updateInput('count', e.target.value)}
              />
            </div>
          </div>
          <div className="text-sm bg-background p-3 rounded-lg">
            <strong>💡 TIP:</strong> Personalize each message. Reference something specific about them. 
            Don't copy-paste the same message to everyone.
          </div>
          <Button onClick={onSave} size="sm">
            <Check className="h-4 w-4 mr-1" /> Save Idea
          </Button>
        </div>
      );

    case 'flash_sale':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You've run a successful sale before - could you run it again?
          </p>
          <div className="space-y-3">
            <div>
              <Label className="mb-2 block">What offer?</Label>
              <Input 
                value={inputs.offer || ''}
                onChange={(e) => updateInput('offer', e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block">Original price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number"
                    value={inputs.originalPrice || ''}
                    onChange={(e) => updateInput('originalPrice', e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Flash sale price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number"
                    value={inputs.salePrice || ''}
                    onChange={(e) => updateInput('salePrice', e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Why did it work before?</Label>
              <Textarea 
                placeholder="Urgency? Bonus? Price point? Specific audience?"
                value={inputs.whyWorked || ''}
                onChange={(e) => updateInput('whyWorked', e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <Button onClick={onSave} size="sm">
            <Check className="h-4 w-4 mr-1" /> Save Idea
          </Button>
        </div>
      );

    case 'payment_plan':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Do you have a higher-priced offer ($500+) that people say they want but can't afford?
          </p>
          <div className="space-y-3">
            <div>
              <Label className="mb-2 block">Which offer?</Label>
              <Input 
                value={inputs.offer || ''}
                onChange={(e) => updateInput('offer', e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">Payment plan option</Label>
              <Input 
                placeholder="3 payments of $X/month"
                value={inputs.paymentPlan || ''}
                onChange={(e) => updateInput('paymentPlan', e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">Who has asked about this but couldn't pay in full?</Label>
              <Textarea 
                placeholder="List specific people or '5+ people in my DMs'"
                value={inputs.prospects || ''}
                onChange={(e) => updateInput('prospects', e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <Button onClick={onSave} size="sm">
            <Check className="h-4 w-4 mr-1" /> Save Idea
          </Button>
        </div>
      );

    case 'custom':
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            What else could you sell THIS WEEK with what you already have?
          </p>
          <div className="space-y-3">
            <div>
              <Label className="mb-2 block">Your idea</Label>
              <Input 
                value={inputs.idea || ''}
                onChange={(e) => updateInput('idea', e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block">Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number"
                    value={inputs.price || ''}
                    onChange={(e) => updateInput('price', e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Who would buy it?</Label>
                <Input 
                  value={inputs.audience || ''}
                  onChange={(e) => updateInput('audience', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Why will this work?</Label>
              <Textarea 
                value={inputs.whyWorks || ''}
                onChange={(e) => updateInput('whyWorks', e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <Button onClick={onSave} size="sm">
            <Check className="h-4 w-4 mr-1" /> Save Idea
          </Button>
        </div>
      );

    default:
      return null;
  }
}
