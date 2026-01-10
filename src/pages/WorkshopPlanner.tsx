import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, X, Target, BarChart3, Users, Megaphone, DollarSign, ChevronLeft, ChevronRight, Check, Heart, TrendingUp, Download, FileJson, FileText, Sparkles, CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

interface Offer {
  name: string;
  price: string;
  frequency: string;
  transformation: string;
  isPrimary: boolean;
}

interface MonthPlan {
  monthName: string;
  projects: string;
  salesPromos: string;
  mainFocus: string;
}

interface SecondaryPlatform {
  platform: string;
  contentType: string;
  frequency: string;
}

interface WorkshopData {
  // Step 1
  startDate: string;
  goal: string;
  why: string;
  identity: string;
  feeling: string;
  // Step 2
  discoverScore: number;
  nurtureScore: number;
  convertScore: number;
  biggestBottleneck: string;
  focusArea: string;
  // Step 3
  audienceTarget: string;
  audienceFrustration: string;
  signatureMessage: string;
  // Step 4
  leadPlatform: string;
  leadPlatformCustom: string;
  leadContentType: string;
  leadContentTypeCustom: string;
  leadFrequency: string;
  leadCommitted: boolean;
  secondaryPlatforms: SecondaryPlatform[];
  // Step 5
  nurtureMethod: string;
  nurtureMethod2: string;
  nurtureMethod3: string;
  nurtureFrequency: string;
  freeTransformation: string;
  proofMethods: string[];
  // Step 6
  offers: Offer[];
  // Step 7
  revenueGoal: string;
  pricePerSale: string;
  salesNeeded: number;
  launchSchedule: string;
  monthPlans: MonthPlan[];
}

const STORAGE_KEY = 'workshop-planner-data';

const PROOF_METHODS = [
  'Testimonials',
  'Case Studies',
  'Before/After',
  'Screenshots',
  'Video Reviews',
  'Social Proof',
  'Data/Stats',
  'Media Features'
];

const STEPS = [
  { id: 1, name: 'Dates & Goal', icon: Target },
  { id: 2, name: 'Business Diagnostic', icon: BarChart3 },
  { id: 3, name: 'Audience & Message', icon: Users },
  { id: 4, name: 'Lead Gen Strategy', icon: Megaphone },
  { id: 5, name: 'Nurture Strategy', icon: Heart },
  { id: 6, name: 'Your Offers', icon: DollarSign },
  { id: 7, name: '90-Day Breakdown', icon: TrendingUp },
];

const getDefaultData = (): WorkshopData => ({
  startDate: new Date().toISOString(),
  goal: '',
  why: '',
  identity: '',
  feeling: '',
  discoverScore: 5,
  nurtureScore: 5,
  convertScore: 5,
  biggestBottleneck: '',
  focusArea: 'DISCOVER',
  audienceTarget: '',
  audienceFrustration: '',
  signatureMessage: '',
  leadPlatform: '',
  leadPlatformCustom: '',
  leadContentType: '',
  leadContentTypeCustom: '',
  leadFrequency: '',
  leadCommitted: false,
  secondaryPlatforms: [],
  nurtureMethod: '',
  nurtureMethod2: '',
  nurtureMethod3: '',
  nurtureFrequency: '',
  freeTransformation: '',
  proofMethods: [],
  offers: [{ name: '', price: '', frequency: '', transformation: '', isPrimary: true }],
  revenueGoal: '',
  pricePerSale: '',
  salesNeeded: 0,
  launchSchedule: '',
  monthPlans: [
    { monthName: 'Month 1', projects: '', salesPromos: '', mainFocus: '' },
    { monthName: 'Month 2', projects: '', salesPromos: '', mainFocus: '' },
    { monthName: 'Month 3', projects: '', salesPromos: '', mainFocus: '' },
  ],
});

export default function WorkshopPlanner() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  
  // Load data from localStorage
  const [data, setData] = useState<WorkshopData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...getDefaultData(), ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load workshop data:', e);
    }
    return getDefaultData();
  });

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Computed values
  const startDate = useMemo(() => new Date(data.startDate), [data.startDate]);
  const endDate = useMemo(() => addDays(startDate, 90), [startDate]);
  
  const focusArea = useMemo(() => {
    let lowest = 'DISCOVER';
    let lowestValue = data.discoverScore;
    if (data.nurtureScore < lowestValue) {
      lowest = 'NURTURE';
      lowestValue = data.nurtureScore;
    }
    if (data.convertScore < lowestValue) {
      lowest = 'CONVERT';
    }
    return lowest;
  }, [data.discoverScore, data.nurtureScore, data.convertScore]);

  const salesNeeded = useMemo(() => {
    const revenue = parseFloat(data.revenueGoal) || 0;
    const price = parseFloat(data.pricePerSale) || 0;
    if (price === 0) return 0;
    return Math.ceil(revenue / price);
  }, [data.revenueGoal, data.pricePerSale]);

  // Update functions
  const updateData = (updates: Partial<WorkshopData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const updateOffer = (idx: number, field: keyof Offer, value: string | boolean) => {
    const updated = [...data.offers];
    if (field === 'isPrimary') {
      updated.forEach((o, i) => o.isPrimary = i === idx);
    } else {
      (updated[idx] as any)[field] = value;
    }
    updateData({ offers: updated });
  };

  const addOffer = () => {
    updateData({ 
      offers: [...data.offers, { name: '', price: '', frequency: '', transformation: '', isPrimary: false }] 
    });
  };

  const removeOffer = (idx: number) => {
    if (data.offers.length > 1) {
      const updated = data.offers.filter((_, i) => i !== idx);
      if (!updated.some(o => o.isPrimary)) {
        updated[0].isPrimary = true;
      }
      updateData({ offers: updated });
    }
  };

  const updateMonthPlan = (idx: number, field: keyof MonthPlan, value: string) => {
    const updated = [...data.monthPlans];
    updated[idx][field] = value;
    updateData({ monthPlans: updated });
  };

  const toggleProofMethod = (method: string) => {
    updateData({
      proofMethods: data.proofMethods.includes(method)
        ? data.proofMethods.filter(m => m !== method)
        : [...data.proofMethods, method]
    });
  };

  // Export functions
  const exportJSON = () => {
    const exportData = {
      ...data,
      focusArea,
      salesNeeded,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `90-day-plan-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'JSON exported!', description: 'Your plan has been downloaded.' });
  };

  const exportPDF = () => {
    // Generate printable HTML and open print dialog
    const printContent = generatePrintContent();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    toast({ title: 'Print dialog opened', description: 'Save as PDF from your browser\'s print dialog.' });
  };

  const generatePrintContent = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>90-Day Business Plan</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; }
    h1 { color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    h3 { color: #6b7280; margin-top: 20px; }
    .section { margin-bottom: 30px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .stat { background: #f3f4f6; padding: 15px; border-radius: 8px; }
    .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .stat-value { font-size: 24px; font-weight: bold; color: #7c3aed; }
    .badge { display: inline-block; background: #ede9fe; color: #7c3aed; padding: 4px 12px; border-radius: 999px; font-size: 14px; font-weight: 500; }
    .month { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
    ul { padding-left: 20px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>🎯 90-Day Business Plan</h1>
  <p><strong>Dates:</strong> ${format(startDate, 'MMM d, yyyy')} → ${format(endDate, 'MMM d, yyyy')}</p>
  
  <div class="section">
    <h2>The Goal</h2>
    <p><strong>${data.goal || 'Not set'}</strong></p>
    ${data.why ? `<p><em>Why:</em> ${data.why}</p>` : ''}
    ${data.identity ? `<p><em>Identity:</em> ${data.identity}</p>` : ''}
    ${data.feeling ? `<p><em>Target feeling:</em> ${data.feeling}</p>` : ''}
  </div>

  <div class="section">
    <h2>Business Diagnostic</h2>
    <div class="grid">
      <div class="stat"><div class="stat-label">Discover</div><div class="stat-value">${data.discoverScore}/10</div></div>
      <div class="stat"><div class="stat-label">Nurture</div><div class="stat-value">${data.nurtureScore}/10</div></div>
      <div class="stat"><div class="stat-label">Convert</div><div class="stat-value">${data.convertScore}/10</div></div>
      <div class="stat"><div class="stat-label">Focus Area</div><div class="stat-value">${focusArea}</div></div>
    </div>
    ${data.biggestBottleneck ? `<p><strong>Biggest Bottleneck:</strong> ${data.biggestBottleneck}</p>` : ''}
  </div>

  <div class="section">
    <h2>Audience & Message</h2>
    ${data.audienceTarget ? `<p><strong>Target Audience:</strong> ${data.audienceTarget}</p>` : ''}
    ${data.audienceFrustration ? `<p><strong>Their Frustration:</strong> ${data.audienceFrustration}</p>` : ''}
    ${data.signatureMessage ? `<p><strong>Signature Message:</strong> ${data.signatureMessage}</p>` : ''}
  </div>

  <div class="section">
    <h2>Strategy</h2>
    <h3>Lead Generation</h3>
    <ul>
      ${data.leadPlatform ? `<li><strong>Platform:</strong> ${data.leadPlatform === 'other' ? data.leadPlatformCustom : data.leadPlatform}</li>` : ''}
      ${data.leadContentType ? `<li><strong>Content Type:</strong> ${data.leadContentType === 'other' ? data.leadContentTypeCustom : data.leadContentType}</li>` : ''}
      ${data.leadFrequency ? `<li><strong>Frequency:</strong> ${data.leadFrequency}</li>` : ''}
      <li><strong>90-Day Commitment:</strong> ${data.leadCommitted ? '✅ Yes' : '❌ No'}</li>
      ${data.secondaryPlatforms.length > 0 ? `<li><strong>Secondary Platforms:</strong> ${data.secondaryPlatforms.map(s => `${s.platform} (${s.contentType}${s.frequency ? `, ${s.frequency}` : ''})`).join(', ')}</li>` : ''}
    </ul>
    
    <h3>Nurture</h3>
    <ul>
      ${data.nurtureMethod ? `<li><strong>Primary Method:</strong> ${data.nurtureMethod}</li>` : ''}
      ${data.nurtureMethod2 ? `<li><strong>Secondary Method:</strong> ${data.nurtureMethod2}</li>` : ''}
      ${data.nurtureMethod3 ? `<li><strong>Tertiary Method:</strong> ${data.nurtureMethod3}</li>` : ''}
      ${data.nurtureFrequency ? `<li><strong>Frequency:</strong> ${data.nurtureFrequency}</li>` : ''}
      ${data.freeTransformation ? `<li><strong>Free Transformation:</strong> ${data.freeTransformation}</li>` : ''}
      ${data.proofMethods.length > 0 ? `<li><strong>Proof Methods:</strong> ${data.proofMethods.join(', ')}</li>` : ''}
    </ul>
  </div>

  <div class="section">
    <h2>Offers</h2>
    ${data.offers.filter(o => o.name).map(offer => `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
        <p><strong>${offer.name}</strong> ${offer.isPrimary ? '<span class="badge">Primary</span>' : ''}</p>
        ${offer.price ? `<p>Price: $${offer.price}</p>` : ''}
        ${offer.frequency ? `<p>Sales Frequency: ${offer.frequency}</p>` : ''}
        ${offer.transformation ? `<p>Transformation: ${offer.transformation}</p>` : ''}
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>Revenue Plan</h2>
    <div class="grid">
      <div class="stat"><div class="stat-label">Revenue Goal</div><div class="stat-value">$${data.revenueGoal || '0'}</div></div>
      <div class="stat"><div class="stat-label">Price Per Sale</div><div class="stat-value">$${data.pricePerSale || '0'}</div></div>
      <div class="stat"><div class="stat-label">Sales Needed</div><div class="stat-value">${salesNeeded}</div></div>
    </div>
    ${data.launchSchedule ? `<p style="margin-top: 20px;"><strong>Launch Schedule:</strong> ${data.launchSchedule}</p>` : ''}
  </div>

  <div class="section">
    <h2>Month-by-Month Plan</h2>
    ${data.monthPlans.map((month, idx) => `
      <div class="month">
        <h3>${month.monthName || `Month ${idx + 1}`}</h3>
        ${month.mainFocus ? `<p><strong>Focus:</strong> ${month.mainFocus}</p>` : ''}
        ${month.projects ? `<p><strong>Projects:</strong> ${month.projects}</p>` : ''}
        ${month.salesPromos ? `<p><strong>Sales & Promos:</strong> ${month.salesPromos}</p>` : ''}
      </div>
    `).join('')}
  </div>

  <div style="margin-top: 40px; padding: 20px; background: #ede9fe; border-radius: 12px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">Want to track this plan with habits, projects, and weekly reviews?</p>
    <p style="margin: 10px 0 0; font-weight: bold;">Join the Mastermind at lovable.dev</p>
  </div>
</body>
</html>`;
  };

  const resetPlan = () => {
    if (confirm('Are you sure you want to start over? This will clear all your progress.')) {
      localStorage.removeItem(STORAGE_KEY);
      setData(getDefaultData());
      setCurrentStep(1);
      setIsComplete(false);
      toast({ title: 'Plan reset', description: 'Starting fresh!' });
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsComplete(true);
    }
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const progress = (currentStep / STEPS.length) * 100;

  // Complete screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="mx-auto max-w-3xl px-4 py-12 space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold">Your 90-Day Plan is Ready! 🎉</h1>
            <p className="text-xl text-muted-foreground">
              You've mapped out your strategy for the next 90 days.
            </p>
          </div>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Goal</p>
                  <p className="font-medium">{data.goal || 'Not set'}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Focus Area</p>
                  <p className="font-medium text-primary">{focusArea}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Revenue Goal</p>
                  <p className="font-medium">${data.revenueGoal || '0'}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Sales Needed</p>
                  <p className="font-medium">{salesNeeded} sales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export Your Plan</CardTitle>
              <CardDescription>Download your plan to keep or share</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Button onClick={exportPDF} size="lg" className="h-auto py-4">
                  <FileText className="h-5 w-5 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold">Download PDF</div>
                    <div className="text-xs opacity-80">Print or save as PDF</div>
                  </div>
                </Button>
                <Button onClick={exportJSON} size="lg" variant="outline" className="h-auto py-4">
                  <FileJson className="h-5 w-5 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold">Export JSON</div>
                    <div className="text-xs opacity-80">Import into other tools</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CTA - Dynamic based on auth status */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Sparkles className="h-10 w-10 text-primary mx-auto" />
                {user ? (
                  <>
                    <h3 className="text-xl font-bold">Set Up Your 90-Day Cycle</h3>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                      Your workshop data is saved! Continue to Cycle Setup to import your plan, 
                      add habits, track projects, and get weekly reviews.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                      <Button asChild size="lg">
                        <Link to="/cycle-setup?from=planner">
                          Set Up Your 90-Day Cycle →
                        </Link>
                      </Button>
                      <Button variant="outline" size="lg" onClick={() => setIsComplete(false)}>
                        Edit Plan
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold">Ready to Execute This Plan?</h3>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                      Sign up free to track your habits, manage projects, get weekly reviews, 
                      and have accountability partners to keep you on track.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                      <Button asChild size="lg">
                        <Link to="/trial">
                          Sign Up Free →
                        </Link>
                      </Button>
                      <Button variant="outline" size="lg" onClick={() => setIsComplete(false)}>
                        Edit Plan
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Start Over */}
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={resetPlan}>
              Start Over
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">90-Day Business Planner</h1>
          <p className="text-muted-foreground">
            Map out your strategy for the next quarter
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Step {currentStep} of {STEPS.length}</span>
            <span className="font-medium">{STEPS[currentStep - 1].name}</span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between gap-1 pt-2">
            {STEPS.map((step) => {
              const StepIcon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors flex-1",
                    isCurrent && "bg-primary/10",
                    isCompleted && "text-primary",
                    !isCurrent && !isCompleted && "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary/20 text-primary border-2 border-primary",
                    !isCurrent && !isCompleted && "bg-muted"
                  )}>
                    {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <span className="text-xs hidden sm:block">{step.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 1: Dates & Goal */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cycle Dates</CardTitle>
                  <CardDescription>Set when your 90-day cycle starts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(startDate, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => date && updateData({ startDate: date.toISOString() })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>End Date (90 days from start)</Label>
                      <Button variant="outline" className="w-full justify-start text-left font-normal" disabled>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(endDate, "PPP")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Goal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="goal">What do you want to achieve?</Label>
                    <Input
                      id="goal"
                      value={data.goal}
                      onChange={(e) => updateData({ goal: e.target.value })}
                      placeholder="e.g., Launch my course, Hit $10k/month, Build my audience"
                    />
                  </div>
                  <div>
                    <Label htmlFor="why">Why is this important to you?</Label>
                    <Textarea
                      id="why"
                      value={data.why}
                      onChange={(e) => updateData({ why: e.target.value })}
                      placeholder="Your deeper motivation..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="identity">Who do you need to become?</Label>
                    <Input
                      id="identity"
                      value={data.identity}
                      onChange={(e) => updateData({ identity: e.target.value })}
                      placeholder="e.g., A disciplined entrepreneur, A visible leader"
                    />
                  </div>
                  <div>
                    <Label htmlFor="feeling">How do you want to feel?</Label>
                    <Input
                      id="feeling"
                      value={data.feeling}
                      onChange={(e) => updateData({ feeling: e.target.value })}
                      placeholder="e.g., Confident, Energized, In control"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Business Diagnostic */}
          {currentStep === 2 && (
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle>Business Diagnostic</CardTitle>
                </div>
                <CardDescription>Where should you focus this quarter?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Rate yourself honestly (1 = needs work, 10 = excellent)
                </p>

                {/* DISCOVER */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">DISCOVER</Label>
                    <span className="text-2xl font-bold text-blue-600">{data.discoverScore}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Do enough people know you exist?</p>
                  <Slider
                    value={[data.discoverScore]}
                    onValueChange={(value) => updateData({ discoverScore: value[0] })}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* NURTURE */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">NURTURE</Label>
                    <span className="text-2xl font-bold text-pink-600">{data.nurtureScore}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Are you helping them for free effectively?</p>
                  <Slider
                    value={[data.nurtureScore]}
                    onValueChange={(value) => updateData({ nurtureScore: value[0] })}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* CONVERT */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">CONVERT</Label>
                    <span className="text-2xl font-bold text-green-600">{data.convertScore}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Are you making enough offers?</p>
                  <Slider
                    value={[data.convertScore]}
                    onValueChange={(value) => updateData({ convertScore: value[0] })}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Focus Area Result */}
                <div className="mt-6 p-6 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Your focus area this quarter:</p>
                  <p className="text-3xl font-bold text-primary">{focusArea}</p>
                </div>

                {/* Biggest Bottleneck */}
                <div className="pt-4">
                  <Label htmlFor="bottleneck">What's your biggest bottleneck right now?</Label>
                  <Textarea
                    id="bottleneck"
                    value={data.biggestBottleneck}
                    onChange={(e) => updateData({ biggestBottleneck: e.target.value })}
                    placeholder="What's holding you back from reaching your goal?"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Audience & Message */}
          {currentStep === 3 && (
            <Card className="border-purple-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <CardTitle>Audience & Message Clarity</CardTitle>
                </div>
                <CardDescription>Get crystal clear on who you serve and what you say</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="audienceTarget">Who exactly are you talking to?</Label>
                  <Textarea
                    id="audienceTarget"
                    value={data.audienceTarget}
                    onChange={(e) => updateData({ audienceTarget: e.target.value })}
                    placeholder="e.g., Female coaches in their first 2 years of business who are struggling to get clients online..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Be specific: demographics, psychographics, situation</p>
                </div>

                <div>
                  <Label htmlFor="audienceFrustration">What's their biggest frustration?</Label>
                  <Textarea
                    id="audienceFrustration"
                    value={data.audienceFrustration}
                    onChange={(e) => updateData({ audienceFrustration: e.target.value })}
                    placeholder="e.g., They're posting content but nobody's engaging. They feel invisible..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="signatureMessage">What's your signature message?</Label>
                  <Textarea
                    id="signatureMessage"
                    value={data.signatureMessage}
                    onChange={(e) => updateData({ signatureMessage: e.target.value })}
                    placeholder="e.g., You don't need a huge audience to make great money..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">The one thing you want everyone to know about you</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Lead Gen Strategy */}
          {currentStep === 4 && (
            <Card className="border-blue-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-blue-600" />
                  <CardTitle>Lead Generation Strategy</CardTitle>
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">DISCOVER</Badge>
                </div>
                <CardDescription>How will you attract new potential clients?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Primary Platform</Label>
                  <Select value={data.leadPlatform} onValueChange={(v) => updateData({ leadPlatform: v, leadPlatformCustom: v === 'other' ? data.leadPlatformCustom : '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Where will you show up?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="podcast">Podcast</SelectItem>
                      <SelectItem value="blog">Blog/SEO</SelectItem>
                      <SelectItem value="pinterest">Pinterest</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="threads">Threads</SelectItem>
                      <SelectItem value="other">Other (type your own)</SelectItem>
                    </SelectContent>
                  </Select>
                  {data.leadPlatform === 'other' && (
                    <Input
                      value={data.leadPlatformCustom}
                      onChange={(e) => updateData({ leadPlatformCustom: e.target.value })}
                      placeholder="Enter your platform..."
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Content Type</Label>
                  <Select value={data.leadContentType} onValueChange={(v) => updateData({ leadContentType: v, leadContentTypeCustom: v === 'other' ? data.leadContentTypeCustom : '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="What format will you create?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short-video">Short-form Video (Reels/TikTok)</SelectItem>
                      <SelectItem value="long-video">Long-form Video (YouTube)</SelectItem>
                      <SelectItem value="carousel">Carousel Posts</SelectItem>
                      <SelectItem value="stories">Stories</SelectItem>
                      <SelectItem value="live">Live Streams</SelectItem>
                      <SelectItem value="written">Written Posts/Articles</SelectItem>
                      <SelectItem value="podcast">Podcast Episodes</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="threads">Thread Posts</SelectItem>
                      <SelectItem value="infographic">Infographics</SelectItem>
                      <SelectItem value="other">Other (type your own)</SelectItem>
                    </SelectContent>
                  </Select>
                  {data.leadContentType === 'other' && (
                    <Input
                      value={data.leadContentTypeCustom}
                      onChange={(e) => updateData({ leadContentTypeCustom: e.target.value })}
                      placeholder="Enter your content type..."
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <Label>Posting Frequency</Label>
                  <Input
                    value={data.leadFrequency}
                    onChange={(e) => updateData({ leadFrequency: e.target.value })}
                    placeholder="e.g., Daily, 3x per week, Every other day"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Type your own frequency</p>
                </div>

                {/* Secondary Platforms Section */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Secondary Platforms</Label>
                      <p className="text-sm text-muted-foreground">Optional: repurpose content to other platforms</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateData({ 
                        secondaryPlatforms: [...data.secondaryPlatforms, { platform: '', contentType: '', frequency: '' }] 
                      })}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  {data.secondaryPlatforms.map((secondary, idx) => (
                    <div key={idx} className="flex gap-2 items-start p-3 rounded-lg bg-muted/50">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={secondary.platform}
                          onChange={(e) => {
                            const updated = [...data.secondaryPlatforms];
                            updated[idx].platform = e.target.value;
                            updateData({ secondaryPlatforms: updated });
                          }}
                          placeholder="Platform (e.g., LinkedIn, Pinterest)"
                        />
                        <Input
                          value={secondary.contentType}
                          onChange={(e) => {
                            const updated = [...data.secondaryPlatforms];
                            updated[idx].contentType = e.target.value;
                            updateData({ secondaryPlatforms: updated });
                          }}
                          placeholder="Content type (e.g., Repurposed reels)"
                        />
                        <Input
                          value={secondary.frequency}
                          onChange={(e) => {
                            const updated = [...data.secondaryPlatforms];
                            updated[idx].frequency = e.target.value;
                            updateData({ secondaryPlatforms: updated });
                          }}
                          placeholder="Posting frequency (e.g., 3x per week, Daily)"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updated = data.secondaryPlatforms.filter((_, i) => i !== idx);
                          updateData({ secondaryPlatforms: updated });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <Checkbox
                    id="leadCommitted"
                    checked={data.leadCommitted}
                    onCheckedChange={(checked) => updateData({ leadCommitted: checked as boolean })}
                  />
                  <div>
                    <Label htmlFor="leadCommitted" className="text-base font-medium cursor-pointer">
                      I commit to this for 90 days
                    </Label>
                    <p className="text-sm text-muted-foreground">No changing platforms, no giving up early</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Nurture Strategy */}
          {currentStep === 5 && (
            <Card className="border-pink-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-600" />
                  <CardTitle>Nurture Strategy</CardTitle>
                  <Badge className="bg-pink-500/10 text-pink-600 border-pink-500/20">NURTURE</Badge>
                </div>
                <CardDescription>How will you build trust and relationships?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Primary Nurture Method</Label>
                  <Select value={data.nurtureMethod} onValueChange={(v) => updateData({ nurtureMethod: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="How will you nurture your audience?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email Newsletter</SelectItem>
                      <SelectItem value="community">Free Community (FB Group, Discord, etc.)</SelectItem>
                      <SelectItem value="dm">DM Conversations</SelectItem>
                      <SelectItem value="podcast">Podcast</SelectItem>
                      <SelectItem value="webinar">Free Webinars/Workshops</SelectItem>
                      <SelectItem value="challenge">Free Challenges</SelectItem>
                      <SelectItem value="live">Live Sessions (IG Live, YouTube Live, etc.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Second Nurture Method (Optional)</Label>
                  <Select value={data.nurtureMethod2} onValueChange={(v) => updateData({ nurtureMethod2: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add a secondary method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="email">Email Newsletter</SelectItem>
                      <SelectItem value="community">Free Community (FB Group, Discord, etc.)</SelectItem>
                      <SelectItem value="dm">DM Conversations</SelectItem>
                      <SelectItem value="podcast">Podcast</SelectItem>
                      <SelectItem value="webinar">Free Webinars/Workshops</SelectItem>
                      <SelectItem value="challenge">Free Challenges</SelectItem>
                      <SelectItem value="live">Live Sessions (IG Live, YouTube Live, etc.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Third Nurture Method (Optional)</Label>
                  <Select value={data.nurtureMethod3} onValueChange={(v) => updateData({ nurtureMethod3: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add a third method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="email">Email Newsletter</SelectItem>
                      <SelectItem value="community">Free Community (FB Group, Discord, etc.)</SelectItem>
                      <SelectItem value="dm">DM Conversations</SelectItem>
                      <SelectItem value="podcast">Podcast</SelectItem>
                      <SelectItem value="webinar">Free Webinars/Workshops</SelectItem>
                      <SelectItem value="challenge">Free Challenges</SelectItem>
                      <SelectItem value="live">Live Sessions (IG Live, YouTube Live, etc.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Nurture Frequency</Label>
                  <Select value={data.nurtureFrequency} onValueChange={(v) => updateData({ nurtureFrequency: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="How often will you nurture?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="3x-week">3x per week</SelectItem>
                      <SelectItem value="2x-week">2x per week</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>What free transformation do you provide?</Label>
                  <Textarea
                    value={data.freeTransformation}
                    onChange={(e) => updateData({ freeTransformation: e.target.value })}
                    placeholder="e.g., Help them go from confused about their message to having a clear 1-liner..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>How will you show proof? (select all that apply)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PROOF_METHODS.map((method) => (
                      <Badge
                        key={method}
                        variant={data.proofMethods.includes(method) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          data.proofMethods.includes(method) && "bg-pink-600 hover:bg-pink-700"
                        )}
                        onClick={() => toggleProofMethod(method)}
                      >
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Offers */}
          {currentStep === 6 && (
            <Card className="border-green-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <CardTitle>Your Offers</CardTitle>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">CONVERT</Badge>
                </div>
                <CardDescription>What will you sell this quarter?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.offers.map((offer, idx) => (
                  <div key={idx} className={cn(
                    "p-4 rounded-lg border space-y-3",
                    offer.isPrimary && "bg-green-500/5 border-green-500/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={offer.isPrimary}
                          onCheckedChange={() => updateOffer(idx, 'isPrimary', true)}
                        />
                        <span className="text-sm">Primary offer</span>
                      </div>
                      {data.offers.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeOffer(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-sm">Offer Name</Label>
                        <Input
                          value={offer.name}
                          onChange={(e) => updateOffer(idx, 'name', e.target.value)}
                          placeholder="e.g., 1:1 Coaching, Course, Membership"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Price</Label>
                        <Input
                          type="number"
                          value={offer.price}
                          onChange={(e) => updateOffer(idx, 'price', e.target.value)}
                          placeholder="e.g., 2000"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">How often will you sell this?</Label>
                      <Select value={offer.frequency} onValueChange={(v) => updateOffer(idx, 'frequency', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sales frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="always-open">Always Open</SelectItem>
                          <SelectItem value="monthly-launch">Monthly Launch</SelectItem>
                          <SelectItem value="quarterly-launch">Quarterly Launch</SelectItem>
                          <SelectItem value="by-application">By Application</SelectItem>
                          <SelectItem value="limited-spots">Limited Spots</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">What transformation do they get?</Label>
                      <Input
                        value={offer.transformation}
                        onChange={(e) => updateOffer(idx, 'transformation', e.target.value)}
                        placeholder="e.g., Go from 0 to 5K months in 90 days"
                      />
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addOffer} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Offer
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 7: 90-Day Breakdown */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle>Revenue Plan</CardTitle>
                  </div>
                  <CardDescription>Set your financial targets for this cycle</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label>Revenue Goal ($)</Label>
                      <Input
                        type="number"
                        value={data.revenueGoal}
                        onChange={(e) => updateData({ revenueGoal: e.target.value })}
                        placeholder="e.g., 30000"
                      />
                    </div>
                    <div>
                      <Label>Avg Price Per Sale ($)</Label>
                      <Input
                        type="number"
                        value={data.pricePerSale}
                        onChange={(e) => updateData({ pricePerSale: e.target.value })}
                        placeholder="e.g., 2000"
                      />
                    </div>
                    <div>
                      <Label>Sales Needed</Label>
                      <div className="h-10 px-3 flex items-center rounded-md border bg-muted/50">
                        <span className="text-lg font-bold text-primary">{salesNeeded || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Launch Schedule</Label>
                    <Textarea
                      value={data.launchSchedule}
                      onChange={(e) => updateData({ launchSchedule: e.target.value })}
                      placeholder="e.g., Week 2: Soft launch to warm list. Week 6: Webinar + Open cart..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Month-by-Month Plan</CardTitle>
                  <CardDescription>Break down your 90 days into 3 focused months</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {data.monthPlans.map((month, idx) => (
                    <div key={idx} className="p-4 rounded-lg border bg-card space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{month.monthName}</Badge>
                      </div>
                      <div>
                        <Label className="text-sm">Main Focus</Label>
                        <Input
                          value={month.mainFocus}
                          onChange={(e) => updateMonthPlan(idx, 'mainFocus', e.target.value)}
                          placeholder={
                            idx === 0 ? "e.g., Foundation & Content Creation" :
                            idx === 1 ? "e.g., Launch Preparation & Warm-up" :
                            "e.g., Sales Push & Optimization"
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Key Projects</Label>
                        <Textarea
                          value={month.projects}
                          onChange={(e) => updateMonthPlan(idx, 'projects', e.target.value)}
                          placeholder="What will you build/complete this month?"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Sales & Promos</Label>
                        <Textarea
                          value={month.salesPromos}
                          onChange={(e) => updateMonthPlan(idx, 'salesPromos', e.target.value)}
                          placeholder="What will you sell/promote this month?"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={resetPlan}>
              Start Over
            </Button>
            <Button onClick={nextStep}>
              {currentStep < STEPS.length ? (
                <>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Complete Plan
                  <Check className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Auto-save indicator */}
        <p className="text-center text-xs text-muted-foreground">
          ✓ Your progress is automatically saved in your browser
        </p>
      </div>
    </div>
  );
}
