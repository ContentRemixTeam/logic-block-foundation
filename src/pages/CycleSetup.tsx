import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Target, BarChart3, Brain, CalendarIcon, Users, Megaphone, DollarSign, ChevronLeft, ChevronRight, Check, Sparkles, Heart, TrendingUp, Upload, FileJson, Save, Mail } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, addDays, parseISO } from 'date-fns';
import { HelpButton } from '@/components/ui/help-button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCycleSetupDraft, CycleSetupDraft, SecondaryPlatform } from '@/hooks/useCycleSetupDraft';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AutopilotSetupModal, AutopilotOptions } from '@/components/cycle/AutopilotSetupModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const WORKSHOP_STORAGE_KEY = 'workshop-planner-data';

interface WorkshopImportData {
  startDate?: string;
  goal?: string;
  why?: string;
  identity?: string;
  feeling?: string;
  discoverScore?: number;
  nurtureScore?: number;
  convertScore?: number;
  biggestBottleneck?: string;
  focusArea?: string;
  audienceTarget?: string;
  audienceFrustration?: string;
  signatureMessage?: string;
  leadPlatform?: string;
  leadPlatformCustom?: string;
  leadContentType?: string;
  leadContentTypeCustom?: string;
  leadFrequency?: string;
  leadCommitted?: boolean;
  leadPlatformGoal?: string;
  secondaryPlatforms?: Array<{
    platform: string;
    contentType: string;
  }>;
  nurtureMethod?: string;
  nurtureFrequency?: string;
  freeTransformation?: string;
  proofMethods?: string[];
  offers?: Array<{
    name: string;
    price: string;
    frequency: string;
    transformation: string;
    isPrimary: boolean;
  }>;
  revenueGoal?: string;
  pricePerSale?: string;
  salesNeeded?: number;
  launchSchedule?: string;
  monthPlans?: Array<{
    monthName: string;
    projects: string;
    salesPromos: string;
    mainFocus: string;
  }>;
}

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

const PLATFORM_GOALS = [
  { value: 'leads', label: 'Get New Leads' },
  { value: 'nurture', label: 'Nurture Lurkers into Buyers' },
  { value: 'sales', label: 'Sales' },
];

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'blog', label: 'Blog/SEO' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'email', label: 'Email' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'other', label: 'Other' },
];

const CONTENT_TYPE_OPTIONS = [
  { value: 'short-video', label: 'Short-form Video (Reels/TikTok)' },
  { value: 'long-video', label: 'Long-form Video (YouTube)' },
  { value: 'carousel', label: 'Carousel Posts' },
  { value: 'stories', label: 'Stories' },
  { value: 'live', label: 'Live Streams' },
  { value: 'written', label: 'Written Posts/Articles' },
  { value: 'podcast', label: 'Podcast Episodes' },
  { value: 'newsletter', label: 'Newsletter' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: '5x-week', label: '5x per week' },
  { value: '3x-week', label: '3x per week' },
  { value: '2x-week', label: '2x per week' },
  { value: 'weekly', label: 'Weekly' },
];

const DAYS_OF_WEEK = [
  { value: 'Mon', label: 'Mon' },
  { value: 'Tue', label: 'Tue' },
  { value: 'Wed', label: 'Wed' },
  { value: 'Thu', label: 'Thu' },
  { value: 'Fri', label: 'Fri' },
  { value: 'Sat', label: 'Sat' },
  { value: 'Sun', label: 'Sun' },
];

const TIME_OPTIONS = [
  { value: '', label: 'No specific time' },
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
];

const STEPS = [
  { id: 1, name: 'Dates & Goal', icon: Target },
  { id: 2, name: 'Business Diagnostic', icon: BarChart3 },
  { id: 3, name: 'Audience & Message', icon: Users },
  { id: 4, name: 'Lead Gen Strategy', icon: Megaphone },
  { id: 5, name: 'Nurture Strategy', icon: Heart },
  { id: 6, name: 'Your Offers', icon: DollarSign },
  { id: 7, name: '90-Day Breakdown', icon: TrendingUp },
  { id: 8, name: 'Habits & Reminders', icon: Brain },
];

export default function CycleSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showAutopilotModal, setShowAutopilotModal] = useState(false);
  const [showWorkshopImportBanner, setShowWorkshopImportBanner] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewData, setPreviewData] = useState<{ projects: any[]; tasks: any[] }>({ projects: [], tasks: [] });
  
  const { hasDraft, saveDraft, loadDraft, clearDraft, getDraftAge } = useCycleSetupDraft();
  
  // Track if user has dismissed the draft dialog to prevent it from re-appearing
  const hasUserDismissedDraft = useRef(false);
  
  // Track if we should skip the next auto-save (to prevent race condition after clearing draft)
  const skipNextAutoSave = useRef(false);

  // Import from workshop JSON
  const handleImportFromJson = (jsonData: WorkshopImportData) => {
    try {
      // Step 1: Dates & Goal
      if (jsonData.startDate) {
        try {
          setStartDate(parseISO(jsonData.startDate));
        } catch (e) {
          setStartDate(new Date());
        }
      }
      if (jsonData.goal) setGoal(jsonData.goal);
      if (jsonData.why) setWhy(jsonData.why);
      if (jsonData.identity) setIdentity(jsonData.identity);
      if (jsonData.feeling) setFeeling(jsonData.feeling);

      // Step 2: Business Diagnostic
      if (jsonData.discoverScore !== undefined) setDiscoverScore(jsonData.discoverScore);
      if (jsonData.nurtureScore !== undefined) setNurtureScore(jsonData.nurtureScore);
      if (jsonData.convertScore !== undefined) setConvertScore(jsonData.convertScore);
      if (jsonData.biggestBottleneck) setBiggestBottleneck(jsonData.biggestBottleneck);

      // Step 3: Audience & Message
      if (jsonData.audienceTarget) setAudienceTarget(jsonData.audienceTarget);
      if (jsonData.audienceFrustration) setAudienceFrustration(jsonData.audienceFrustration);
      if (jsonData.signatureMessage) setSignatureMessage(jsonData.signatureMessage);

      // Step 4: Lead Gen Strategy
      // Handle custom platform - if "other" was selected, use the custom value
      if (jsonData.leadPlatform) {
        if (jsonData.leadPlatform === 'other' && jsonData.leadPlatformCustom) {
          setLeadPlatform(jsonData.leadPlatformCustom);
        } else {
          setLeadPlatform(jsonData.leadPlatform);
        }
      }
      // Handle custom content type - if "other" was selected, use the custom value
      if (jsonData.leadContentType) {
        if (jsonData.leadContentType === 'other' && jsonData.leadContentTypeCustom) {
          setLeadContentType(jsonData.leadContentTypeCustom);
        } else {
          setLeadContentType(jsonData.leadContentType);
        }
      }
      if (jsonData.leadFrequency) setLeadFrequency(jsonData.leadFrequency);
      if (jsonData.leadPlatformGoal) setLeadPlatformGoal(jsonData.leadPlatformGoal);
      if (jsonData.leadCommitted !== undefined) setLeadCommitted(jsonData.leadCommitted);
      // Import secondary platforms with normalization
      if (jsonData.secondaryPlatforms?.length) {
        const normalized: SecondaryPlatform[] = jsonData.secondaryPlatforms.map(sp => ({
          platform: sp.platform,
          contentType: sp.contentType,
          frequency: '',
          goal: '' as const,
        }));
        setSecondaryPlatforms(normalized);
      }

      // Step 5: Nurture Strategy
      if (jsonData.nurtureMethod) setNurtureMethod(jsonData.nurtureMethod);
      if (jsonData.nurtureFrequency) setNurtureFrequency(jsonData.nurtureFrequency);
      if (jsonData.freeTransformation) setFreeTransformation(jsonData.freeTransformation);
      if (jsonData.proofMethods) setProofMethods(jsonData.proofMethods);

      // Step 6: Offers
      if (jsonData.offers && jsonData.offers.length > 0) {
        setOffers(jsonData.offers);
      }

      // Step 7: Revenue & Months
      if (jsonData.revenueGoal) setRevenueGoal(jsonData.revenueGoal);
      if (jsonData.pricePerSale) setPricePerSale(jsonData.pricePerSale);
      if (jsonData.launchSchedule) setLaunchSchedule(jsonData.launchSchedule);
      if (jsonData.monthPlans && jsonData.monthPlans.length > 0) {
        setMonthPlans(jsonData.monthPlans);
      }

      toast({
        title: 'Workshop plan imported!',
        description: 'Your data has been loaded. Review and add habits/projects, then save.',
      });
      setShowImportDialog(false);
      setImportJson('');
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: 'Could not parse the JSON data. Make sure it\'s a valid workshop export.',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        handleImportFromJson(data);
      } catch (error) {
        toast({
          title: 'Invalid file',
          description: 'Could not read the JSON file.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  const handlePasteImport = () => {
    try {
      const data = JSON.parse(importJson);
      handleImportFromJson(data);
    } catch (error) {
      toast({
        title: 'Invalid JSON',
        description: 'Could not parse the JSON. Make sure it\'s a valid workshop export.',
        variant: 'destructive',
      });
    }
  };

  // Step 1: Dates & Goal
  const [startDate, setStartDate] = useState<Date>(new Date());
  const endDate = useMemo(() => addDays(startDate, 90), [startDate]);
  const [goal, setGoal] = useState('');
  const [why, setWhy] = useState('');
  const [identity, setIdentity] = useState('');
  const [feeling, setFeeling] = useState('');

  // Step 2: Business Diagnostic
  const [discoverScore, setDiscoverScore] = useState(5);
  const [nurtureScore, setNurtureScore] = useState(5);
  const [convertScore, setConvertScore] = useState(5);
  const [biggestBottleneck, setBiggestBottleneck] = useState('');

  // Step 3: Audience & Message
  const [audienceTarget, setAudienceTarget] = useState('');
  const [audienceFrustration, setAudienceFrustration] = useState('');
  const [signatureMessage, setSignatureMessage] = useState('');

  // Step 4: Lead Gen Strategy
  const [leadPlatform, setLeadPlatform] = useState('');
  const [leadContentType, setLeadContentType] = useState('');
  const [leadFrequency, setLeadFrequency] = useState('');
  const [leadPlatformGoal, setLeadPlatformGoal] = useState('leads');
  const [leadCommitted, setLeadCommitted] = useState(false);
  const [secondaryPlatforms, setSecondaryPlatforms] = useState<SecondaryPlatform[]>([]);
  const [postingDays, setPostingDays] = useState<string[]>([]);
  const [postingTime, setPostingTime] = useState('');
  const [batchDay, setBatchDay] = useState('');

  // Step 5: Nurture Strategy
  const [nurtureMethod, setNurtureMethod] = useState('');
  const [nurtureMethodCustom, setNurtureMethodCustom] = useState('');
  const [secondaryNurtureMethod, setSecondaryNurtureMethod] = useState('');
  const [secondaryNurtureMethodCustom, setSecondaryNurtureMethodCustom] = useState('');
  const [nurtureFrequency, setNurtureFrequency] = useState('');
  const [freeTransformation, setFreeTransformation] = useState('');
  const [proofMethods, setProofMethods] = useState<string[]>([]);
  
  // Email commitment settings (for follow-through check-ins)
  const [emailCheckinEnabled, setEmailCheckinEnabled] = useState(false);
  const [emailSendDay, setEmailSendDay] = useState<number>(2); // Default Tuesday
  const [emailTimeBlock, setEmailTimeBlock] = useState<string>('morning');

  // Step 6: Offers
  const [offers, setOffers] = useState<Offer[]>([
    { name: '', price: '', frequency: '', transformation: '', isPrimary: true }
  ]);

  // Step 7: 90-Day Breakdown
  const [revenueGoal, setRevenueGoal] = useState<string>('');
  const [pricePerSale, setPricePerSale] = useState<string>('');
  const [launchSchedule, setLaunchSchedule] = useState('');
  const [monthPlans, setMonthPlans] = useState<MonthPlan[]>([
    { monthName: 'Month 1', projects: '', salesPromos: '', mainFocus: '' },
    { monthName: 'Month 2', projects: '', salesPromos: '', mainFocus: '' },
    { monthName: 'Month 3', projects: '', salesPromos: '', mainFocus: '' },
  ]);

  // Step 8: Success Metrics, Projects, Habits, Reminders
  const [metric1Name, setMetric1Name] = useState('');
  const [metric1Start, setMetric1Start] = useState<number | ''>('');
  const [metric2Name, setMetric2Name] = useState('');
  const [metric2Start, setMetric2Start] = useState<number | ''>('');
  const [metric3Name, setMetric3Name] = useState('');
  const [metric3Start, setMetric3Start] = useState<number | ''>('');
  const [projects, setProjects] = useState<string[]>(['']);
  const [habits, setHabits] = useState<Array<{ name: string; category: string }>>([
    { name: '', category: '' },
  ]);
  const [thingsToRemember, setThingsToRemember] = useState<string[]>(['', '', '']);

  // Check for private browsing mode on mount
  useEffect(() => {
    try {
      localStorage.setItem('_storage_test', 'test');
      localStorage.removeItem('_storage_test');
    } catch (e) {
      toast({
        title: '⚠️ Private Browsing Detected',
        description: 'Please use normal mode to save your progress.',
        duration: 10000,
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Check for existing draft on mount - only show if user hasn't already dismissed it
  // and NOT coming from business planner (which auto-imports data)
  useEffect(() => {
    // Only run once on mount
    if (hasUserDismissedDraft.current) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const fromPlanner = urlParams.get('from') === 'planner';
    
    // Don't show draft modal if coming from business planner
    if (fromPlanner) {
      hasUserDismissedDraft.current = true;
      return;
    }
    
    if (hasDraft) {
      setShowDraftDialog(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Check for workshop planner data on mount
  useEffect(() => {
    try {
      const workshopData = localStorage.getItem(WORKSHOP_STORAGE_KEY);
      if (workshopData && !hasDraft) {
        setShowWorkshopImportBanner(true);
      }
    } catch (e) {
      console.error('Failed to check workshop data:', e);
    }
  }, [hasDraft]);

  // Import from workshop localStorage
  const handleImportFromWorkshop = () => {
    try {
      const workshopData = localStorage.getItem(WORKSHOP_STORAGE_KEY);
      if (workshopData) {
        const data = JSON.parse(workshopData);
        handleImportFromJson(data);
        setShowWorkshopImportBanner(false);
        toast({
          title: 'Workshop plan imported!',
          description: 'Your data has been loaded. Review each step and add habits/projects.',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: 'Could not import workshop data.',
        variant: 'destructive',
      });
    }
  };

  // Restore draft data
  const handleRestoreDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      try {
        setStartDate(new Date(draft.startDate));
      } catch {
        setStartDate(new Date());
      }
      setGoal(draft.goal || '');
      setWhy(draft.why || '');
      setIdentity(draft.identity || '');
      setFeeling(draft.feeling || '');
      setDiscoverScore(draft.discoverScore ?? 5);
      setNurtureScore(draft.nurtureScore ?? 5);
      setConvertScore(draft.convertScore ?? 5);
      setBiggestBottleneck(draft.biggestBottleneck || '');
      setAudienceTarget(draft.audienceTarget || '');
      setAudienceFrustration(draft.audienceFrustration || '');
      setSignatureMessage(draft.signatureMessage || '');
      setLeadPlatform(draft.leadPlatform || '');
      setLeadContentType(draft.leadContentType || '');
      setLeadFrequency(draft.leadFrequency || '');
      setLeadPlatformGoal(draft.leadPlatformGoal || 'leads');
      setLeadCommitted(draft.leadCommitted ?? false);
      if (draft.secondaryPlatforms?.length) setSecondaryPlatforms(draft.secondaryPlatforms);
      if (draft.postingDays?.length) setPostingDays(draft.postingDays);
      setPostingTime(draft.postingTime || '');
      setBatchDay(draft.batchDay || '');
      setNurtureMethod(draft.nurtureMethod || '');
      setNurtureFrequency(draft.nurtureFrequency || '');
      setFreeTransformation(draft.freeTransformation || '');
      setProofMethods(draft.proofMethods || []);
      if (draft.offers?.length) setOffers(draft.offers);
      setRevenueGoal(draft.revenueGoal || '');
      setPricePerSale(draft.pricePerSale || '');
      setLaunchSchedule(draft.launchSchedule || '');
      if (draft.monthPlans?.length) setMonthPlans(draft.monthPlans);
      setMetric1Name(draft.metric1Name || '');
      setMetric1Start(draft.metric1Start ?? '');
      setMetric2Name(draft.metric2Name || '');
      setMetric2Start(draft.metric2Start ?? '');
      setMetric3Name(draft.metric3Name || '');
      setMetric3Start(draft.metric3Start ?? '');
      if (draft.projects?.length) setProjects(draft.projects);
      if (draft.habits?.length) setHabits(draft.habits);
      if (draft.thingsToRemember?.length) setThingsToRemember(draft.thingsToRemember);
      setCurrentStep(draft.currentStep || 1);
      
      toast({
        title: 'Draft restored',
        description: 'Your previous work has been loaded.',
      });
    }
    hasUserDismissedDraft.current = true; // Prevent dialog from re-appearing
    setShowDraftDialog(false);
  }, [loadDraft, toast]);

  // Auto-save draft on state changes (debounced)
  useEffect(() => {
    // Skip auto-save if we just cleared the draft to prevent race condition
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    
    const timeoutId = setTimeout(() => {
      const draftData: Partial<CycleSetupDraft> = {
        startDate: startDate.toISOString(),
        goal,
        why,
        identity,
        feeling,
        discoverScore,
        nurtureScore,
        convertScore,
        biggestBottleneck,
        audienceTarget,
        audienceFrustration,
        signatureMessage,
        leadPlatform,
        leadContentType,
        leadFrequency,
        leadPlatformGoal,
        leadCommitted,
        secondaryPlatforms,
        postingDays,
        postingTime,
        batchDay,
        nurtureMethod,
        nurtureFrequency,
        freeTransformation,
        proofMethods,
        offers,
        revenueGoal,
        pricePerSale,
        launchSchedule,
        monthPlans,
        metric1Name,
        metric1Start,
        metric2Name,
        metric2Start,
        metric3Name,
        metric3Start,
        projects,
        habits,
        thingsToRemember,
        currentStep,
      };
      saveDraft(draftData);
      setLastSaved(new Date());
    }, 2000); // Debounce 2 seconds

    return () => clearTimeout(timeoutId);
  }, [
    startDate, goal, why, identity, feeling,
    discoverScore, nurtureScore, convertScore, biggestBottleneck,
    audienceTarget, audienceFrustration, signatureMessage,
    leadPlatform, leadContentType, leadFrequency, leadPlatformGoal, leadCommitted, secondaryPlatforms, postingDays, postingTime, batchDay,
    nurtureMethod, nurtureFrequency, freeTransformation, proofMethods,
    offers, revenueGoal, pricePerSale, launchSchedule, monthPlans,
    metric1Name, metric1Start, metric2Name, metric2Start, metric3Name, metric3Start,
    projects, habits, thingsToRemember, currentStep, saveDraft
  ]);

  // Calculate focus area based on lowest score
  const focusArea = useMemo(() => {
    const scores = { DISCOVER: discoverScore, NURTURE: nurtureScore, CONVERT: convertScore };
    let lowest = 'DISCOVER';
    let lowestValue = discoverScore;
    
    if (nurtureScore < lowestValue) {
      lowest = 'NURTURE';
      lowestValue = nurtureScore;
    }
    if (convertScore < lowestValue) {
      lowest = 'CONVERT';
    }
    
    return lowest;
  }, [discoverScore, nurtureScore, convertScore]);

  // Calculate sales needed
  const salesNeeded = useMemo(() => {
    const revenue = parseFloat(revenueGoal) || 0;
    const price = parseFloat(pricePerSale) || 0;
    if (price === 0) return 0;
    return Math.ceil(revenue / price);
  }, [revenueGoal, pricePerSale]);

  // Project helpers
  const addProject = () => setProjects([...projects, '']);
  const updateProject = (idx: number, value: string) => {
    const updated = [...projects];
    updated[idx] = value;
    setProjects(updated);
  };
  const removeProject = (idx: number) => {
    setProjects(projects.filter((_, i) => i !== idx));
  };

  // Habit helpers
  const addHabit = () => setHabits([...habits, { name: '', category: '' }]);
  const updateHabit = (idx: number, field: 'name' | 'category', value: string) => {
    const updated = [...habits];
    updated[idx][field] = value;
    setHabits(updated);
  };
  const removeHabit = (idx: number) => {
    setHabits(habits.filter((_, i) => i !== idx));
  };

  // Offer helpers
  const addOffer = () => setOffers([...offers, { name: '', price: '', frequency: '', transformation: '', isPrimary: false }]);
  const updateOffer = (idx: number, field: keyof Offer, value: string | boolean) => {
    const updated = [...offers];
    if (field === 'isPrimary') {
      // Only one can be primary
      updated.forEach((o, i) => o.isPrimary = i === idx);
    } else {
      (updated[idx] as any)[field] = value;
    }
    setOffers(updated);
  };
  const removeOffer = (idx: number) => {
    if (offers.length > 1) {
      const updated = offers.filter((_, i) => i !== idx);
      if (!updated.some(o => o.isPrimary)) {
        updated[0].isPrimary = true;
      }
      setOffers(updated);
    }
  };

  // Month plan helpers
  const updateMonthPlan = (idx: number, field: keyof MonthPlan, value: string) => {
    const updated = [...monthPlans];
    updated[idx][field] = value;
    setMonthPlans(updated);
  };

  // Reminder helpers
  const updateReminder = (idx: number, value: string) => {
    const updated = [...thingsToRemember];
    updated[idx] = value;
    setThingsToRemember(updated);
  };

  // Secondary platform helpers
  const addSecondaryPlatform = () => {
    setSecondaryPlatforms([...secondaryPlatforms, { platform: '', contentType: '', frequency: '', goal: '' }]);
  };
  const updateSecondaryPlatform = (idx: number, field: keyof SecondaryPlatform, value: string) => {
    const updated = [...secondaryPlatforms];
    updated[idx] = { ...updated[idx], [field]: value };
    setSecondaryPlatforms(updated);
  };
  const removeSecondaryPlatform = (idx: number) => {
    setSecondaryPlatforms(secondaryPlatforms.filter((_, i) => i !== idx));
  };

  // Proof method toggle
  const toggleProofMethod = (method: string) => {
    setProofMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  // Preview what projects and tasks would be created
  const handlePreview = () => {
    const preview = {
      projects: [] as { name: string; description: string }[],
      tasks: [] as { count: number; description: string }[]
    };
    
    // Preview lead platform project
    if (leadPlatform) {
      const platformName = leadPlatform === 'other' ? 'Custom Platform' : leadPlatform;
      preview.projects.push({
        name: `${platformName} Content`,
        description: `Post ${leadContentType || 'content'} ${leadFrequency || ''}`
      });
      
      // Count posting tasks that would be created
      if (postingDays.length > 0) {
        const tasksPerWeek = postingDays.length;
        const totalTasks = tasksPerWeek * 13; // 13 weeks in 90 days
        preview.tasks.push({
          count: totalTasks,
          description: `Post on ${platformName} - ${tasksPerWeek}x per week for 90 days`
        });
      }
    }
    
    // Preview secondary platforms
    secondaryPlatforms.forEach(platform => {
      if (platform.platform) {
        preview.projects.push({
          name: `${platform.platform} Content`,
          description: `Repurpose ${platform.contentType || 'content'} ${platform.frequency || ''}`
        });
      }
    });
    
    // Preview nurture project
    if (nurtureMethod) {
      preview.projects.push({
        name: `${nurtureMethod} Nurture`,
        description: `${nurtureFrequency || 'Regular'} nurture content`
      });
      
      // Estimate nurture tasks
      if (nurtureFrequency) {
        let tasksPerWeek = 1;
        if (nurtureFrequency.includes('daily')) tasksPerWeek = 7;
        else if (nurtureFrequency.includes('3x')) tasksPerWeek = 3;
        else if (nurtureFrequency.includes('2x')) tasksPerWeek = 2;
        
        preview.tasks.push({
          count: tasksPerWeek * 13,
          description: `${nurtureMethod} nurture - ${tasksPerWeek}x per week`
        });
      }
    }
    
    // Preview offers as projects
    offers.forEach(offer => {
      if (offer.name.trim()) {
        preview.projects.push({
          name: offer.name,
          description: `$${offer.price || '0'} - ${offer.transformation || 'No transformation set'}`
        });
        
        // If it's a launch, add launch tasks
        if (offer.frequency !== 'always-open' && offer.frequency) {
          preview.tasks.push({
            count: 10,
            description: `Launch tasks for ${offer.name} (pre-launch, launch, cart close)`
          });
        }
      }
    });
    
    // Preview custom projects
    projects.forEach(projectName => {
      if (projectName.trim()) {
        preview.projects.push({
          name: projectName,
          description: 'Custom project'
        });
      }
    });
    
    // Preview habits as recurring tasks
    const activeHabits = habits.filter(h => h.name.trim());
    if (activeHabits.length > 0) {
      preview.tasks.push({
        count: activeHabits.length * 90,
        description: `${activeHabits.length} habits tracked daily for 90 days`
      });
    }
    
    setPreviewData(preview);
    setShowPreviewDialog(true);
    console.log('PREVIEW - Would create:', preview);
  };

  const handleSubmit = async (autopilotOptions?: AutopilotOptions) => {
    if (!user) return;
    setLoading(true);
    setShowAutopilotModal(false);

    try {
      // Create cycle with all new fields
      const { data: cycle, error: cycleError } = await supabase
        .from('cycles_90_day')
        .insert({
          user_id: user.id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          goal,
          why,
          identity,
          target_feeling: feeling,
          supporting_projects: projects.filter((p) => p.trim()),
          discover_score: discoverScore,
          nurture_score: nurtureScore,
          convert_score: convertScore,
          focus_area: focusArea,
          metric_1_name: metric1Name || null,
          metric_1_start: metric1Start === '' ? null : metric1Start,
          metric_2_name: metric2Name || null,
          metric_2_start: metric2Start === '' ? null : metric2Start,
          metric_3_name: metric3Name || null,
          metric_3_start: metric3Start === '' ? null : metric3Start,
          things_to_remember: thingsToRemember.filter((t) => t.trim()),
          biggest_bottleneck: biggestBottleneck || null,
          audience_target: audienceTarget || null,
          audience_frustration: audienceFrustration || null,
          signature_message: signatureMessage || null,
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      const cycleId = cycle.cycle_id;

      // Create cycle strategy with posting schedule and secondary platforms
      const effectiveNurtureMethod = nurtureMethod === 'other' ? nurtureMethodCustom : nurtureMethod;
      const effectiveSecondaryNurtureMethod = secondaryNurtureMethod === 'other' 
        ? secondaryNurtureMethodCustom 
        : (secondaryNurtureMethod === 'none' ? null : secondaryNurtureMethod);
      
      const { error: strategyError } = await supabase
        .from('cycle_strategy')
        .insert({
          cycle_id: cycleId,
          user_id: user.id,
          lead_primary_platform: leadPlatform || null,
          lead_content_type: leadContentType || null,
          lead_frequency: leadFrequency || null,
          lead_committed_90_days: leadCommitted,
          nurture_method: effectiveNurtureMethod || null,
          nurture_frequency: nurtureFrequency || null,
          free_transformation: freeTransformation || null,
          proof_methods: proofMethods,
          // New posting schedule fields
          posting_days: postingDays,
          posting_time: postingTime && postingTime !== 'none' ? postingTime : null,
          batch_day: batchDay && batchDay !== 'none' ? batchDay : null,
          // Secondary platforms (cast needed until types regenerate)
          secondary_platforms: secondaryPlatforms.filter(sp => sp.platform.trim()),
          // Secondary nurture method (stored in secondary_platforms for now as JSON)
        } as any);

      if (strategyError) console.error('Strategy error:', strategyError);

      // Create offers
      const offersToCreate = offers
        .filter((o) => o.name.trim())
        .map((o, idx) => ({
          cycle_id: cycleId,
          user_id: user.id,
          offer_name: o.name,
          price: o.price ? parseFloat(o.price) : null,
          sales_frequency: o.frequency || null,
          transformation: o.transformation || null,
          sort_order: idx,
          is_primary: o.isPrimary,
        }));

      if (offersToCreate.length > 0) {
        const { error: offersError } = await supabase
          .from('cycle_offers')
          .insert(offersToCreate);
        if (offersError) console.error('Offers error:', offersError);
      }

      // Create revenue plan
      const { error: revenueError } = await supabase
        .from('cycle_revenue_plan')
        .insert({
          cycle_id: cycleId,
          user_id: user.id,
          revenue_goal: revenueGoal ? parseFloat(revenueGoal) : null,
          price_per_sale: pricePerSale ? parseFloat(pricePerSale) : null,
          sales_needed: salesNeeded || null,
          launch_schedule: launchSchedule || null,
        });

      if (revenueError) console.error('Revenue plan error:', revenueError);

      // Create month plans
      const monthPlansToCreate = monthPlans.map((mp, idx) => ({
        cycle_id: cycleId,
        user_id: user.id,
        month_number: idx + 1,
        month_name: mp.monthName || `Month ${idx + 1}`,
        projects_text: mp.projects || null,
        sales_promos_text: mp.salesPromos || null,
        main_focus: mp.mainFocus || null,
      }));

      const { error: monthError } = await supabase
        .from('cycle_month_plans')
        .insert(monthPlansToCreate);

      if (monthError) console.error('Month plans error:', monthError);

      // Create projects (integrated with existing projects system)
      const projectsToCreate = projects
        .filter((p) => p.trim())
        .map((p) => ({
          user_id: user.id,
          name: p,
          status: 'active',
          cycle_id: cycleId,
        }));

      if (projectsToCreate.length > 0) {
        const { error: projectsError } = await supabase
          .from('projects')
          .insert(projectsToCreate);
        if (projectsError) console.error('Projects error:', projectsError);
      }

      // Create habits (integrated with existing habits system)
      const habitsToCreate = habits
        .filter((h) => h.name.trim())
        .map((h, idx) => ({
          user_id: user.id,
          habit_name: h.name,
          category: h.category || null,
          display_order: idx,
          cycle_id: cycleId,
        }));

      if (habitsToCreate.length > 0) {
        const { error: habitsError } = await supabase
          .from('habits')
          .insert(habitsToCreate);
        if (habitsError) console.error('Habits error:', habitsError);
      }

      // Create nurture commitment for email check-ins if enabled
      if (emailCheckinEnabled && nurtureMethod === 'email') {
        try {
          await supabase.functions.invoke('save-nurture-commitment', {
            body: {
              cycle_id: cycleId,
              commitment_type: 'email',
              cadence: 'weekly',
              day_of_week: emailSendDay,
              preferred_time_block: emailTimeBlock,
              enabled: true,
            },
          });
        } catch (commitmentError) {
          console.error('Nurture commitment error:', commitmentError);
        }
      }

      // Create user settings (upsert to avoid conflicts)
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({ user_id: user.id }, { onConflict: 'user_id' });

      if (settingsError) console.error('Settings error:', settingsError);

      // Auto-setup: Create Content Engine project + posting tasks (if enabled)
      if (autopilotOptions?.createContentEngine && leadPlatform && postingDays.length > 0) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          
          const autoSetupResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-setup-cycle`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                cycle_id: cycleId,
                platform: leadPlatform,
                content_type: leadContentType,
                posting_days: postingDays,
                posting_time: postingTime && postingTime !== 'none' ? postingTime : null,
                batch_day: batchDay && batchDay !== 'none' ? batchDay : null,
                start_date: format(startDate, 'yyyy-MM-dd'),
                end_date: format(endDate, 'yyyy-MM-dd'),
                create_content_engine: true,
                // Pass other autopilot options
                create_metrics_checkin: autopilotOptions?.createMetricsCheckin,
                create_nurture_tasks: autopilotOptions?.createNurtureTasks,
                create_offer_tasks: autopilotOptions?.createOfferTasks,
                create_weekly_blocks: autopilotOptions?.createWeeklyBlocks,
                // Context for other automations
                focus_area: focusArea,
                nurture_method: nurtureMethod,
                nurture_frequency: nurtureFrequency,
                offers: offers.filter(o => o.name.trim()),
                metrics: {
                  metric1: metric1Name,
                  metric2: metric2Name,
                  metric3: metric3Name,
                },
                // Audience & messaging context for content tasks
                audience_target: audienceTarget || null,
                audience_frustration: audienceFrustration || null,
                signature_message: signatureMessage || null,
              }),
            }
          );

          const autoSetupResult = await autoSetupResponse.json();
          
          if (autoSetupResult.success) {
            const taskCount = autoSetupResult.data?.tasks?.length || 0;
            toast({
              title: 'Autopilot setup complete!',
              description: `Created project + ${taskCount} tasks for your 90-day cycle.`,
            });
          } else if (autoSetupResult.data?.errors?.length > 0) {
            console.error('Auto-setup partial errors:', autoSetupResult.data.errors);
            toast({
              title: 'Setup completed with warnings',
              description: autoSetupResult.data.errors[0],
              variant: 'destructive',
            });
          }
        } catch (autoSetupError) {
          console.error('Auto-setup error:', autoSetupError);
          // Log error to database
          await supabase.functions.invoke('log-error', {
            body: {
              error_type: 'auto_setup_cycle',
              error_message: String(autoSetupError),
              component: 'CycleSetup',
              route: '/cycle-setup',
            },
          });
          toast({
            title: 'Auto-setup failed',
            description: 'Could not create automations. You can set them up manually.',
            variant: 'destructive',
          });
        }
      }

      // Clear draft on successful save
      clearDraft();

      toast({
        title: 'Cycle created!',
        description: 'Your 90-day journey has begun.',
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('CYCLE ERROR:', error);
      toast({
        title: 'Error creating cycle',
        description: error?.message || JSON.stringify(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <Layout>
      {/* Draft Restore Dialog */}
      <AlertDialog open={showDraftDialog} onOpenChange={(open) => {
        if (!open) {
          hasUserDismissedDraft.current = true;
        }
        setShowDraftDialog(open);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume your draft?</AlertDialogTitle>
            <AlertDialogDescription>
              You have an unsaved cycle plan from {getDraftAge()}. Would you like to continue where you left off?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              hasUserDismissedDraft.current = true; // Prevent dialog from re-appearing
              skipNextAutoSave.current = true; // Prevent immediate re-save
              clearDraft();
              setShowDraftDialog(false);
            }}>
              Start Fresh
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreDraft}>
              Resume Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Workshop Import Banner */}
        {showWorkshopImportBanner && (
          <Alert className="border-primary/30 bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertTitle>Workshop Plan Detected!</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>We found your workshop planner data. Import it to pre-fill this form.</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleImportFromWorkshop}>
                  Import Now
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowWorkshopImportBanner(false)}>
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Create Your 90-Day Cycle</h1>
            <p className="text-muted-foreground">
              Define your goals and strategy for the next 90 days
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Workshop Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Import Workshop Plan</DialogTitle>
                  <DialogDescription>
                    Import your 90-day plan from the free Workshop Planner
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {/* File Upload */}
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      className="w-full h-24 border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <FileJson className="h-8 w-8 text-muted-foreground" />
                        <span>Click to upload JSON file</span>
                      </div>
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or paste JSON</span>
                    </div>
                  </div>

                  {/* Paste JSON */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder='Paste your exported JSON here...'
                      value={importJson}
                      onChange={(e) => setImportJson(e.target.value)}
                      rows={6}
                      className="font-mono text-xs"
                    />
                    <Button
                      onClick={handlePasteImport}
                      disabled={!importJson.trim()}
                      className="w-full"
                    >
                      Import from JSON
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Don't have a plan yet?{' '}
                    <a href="/workshop-planner" target="_blank" className="text-primary hover:underline">
                      Try our free Workshop Planner
                    </a>
                  </p>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
          </div>
          {/* Auto-save indicator */}
          {lastSaved && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Save className="h-3 w-3" />
              <span>Draft saved</span>
            </div>
          )}
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
                            onSelect={(date) => date && setStartDate(date)}
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
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="e.g., Launch my course, Hit $10k/month, Build my audience"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="why">Why is this important to you?</Label>
                    <Textarea
                      id="why"
                      value={why}
                      onChange={(e) => setWhy(e.target.value)}
                      placeholder="Your deeper motivation..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="identity">Who do you need to become?</Label>
                    <Input
                      id="identity"
                      value={identity}
                      onChange={(e) => setIdentity(e.target.value)}
                      placeholder="e.g., A disciplined entrepreneur, A visible leader"
                    />
                  </div>
                  <div>
                    <Label htmlFor="feeling">How do you want to feel?</Label>
                    <Input
                      id="feeling"
                      value={feeling}
                      onChange={(e) => setFeeling(e.target.value)}
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
                  <HelpButton
                    title="Business Diagnostic"
                    description="Rate your business in 3 key areas. Your lowest score becomes your focus for the next 90 days."
                    tips={[
                      "DISCOVER = attracting new potential clients",
                      "NURTURE = building relationships and trust",
                      "CONVERT = turning leads into paying clients",
                    ]}
                  />
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
                    <span className="text-2xl font-bold text-blue-600">{discoverScore}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Do enough people know you exist?</p>
                  <Slider
                    value={[discoverScore]}
                    onValueChange={(value) => setDiscoverScore(value[0])}
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
                    <span className="text-2xl font-bold text-pink-600">{nurtureScore}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Are you helping them for free effectively?</p>
                  <Slider
                    value={[nurtureScore]}
                    onValueChange={(value) => setNurtureScore(value[0])}
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
                    <span className="text-2xl font-bold text-green-600">{convertScore}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Are you making enough offers?</p>
                  <Slider
                    value={[convertScore]}
                    onValueChange={(value) => setConvertScore(value[0])}
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
                    value={biggestBottleneck}
                    onChange={(e) => setBiggestBottleneck(e.target.value)}
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
                    value={audienceTarget}
                    onChange={(e) => setAudienceTarget(e.target.value)}
                    placeholder="e.g., Female coaches in their first 2 years of business who are struggling to get clients online..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Be specific: demographics, psychographics, situation</p>
                </div>

                <div>
                  <Label htmlFor="audienceFrustration">What's their biggest frustration?</Label>
                  <Textarea
                    id="audienceFrustration"
                    value={audienceFrustration}
                    onChange={(e) => setAudienceFrustration(e.target.value)}
                    placeholder="e.g., They're posting content but nobody's engaging. They feel invisible and wonder if they're wasting their time..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="signatureMessage">What's your signature message?</Label>
                  <Textarea
                    id="signatureMessage"
                    value={signatureMessage}
                    onChange={(e) => setSignatureMessage(e.target.value)}
                    placeholder="e.g., You don't need a huge audience to make great money. You need the right message and a simple sales system..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">The one thing you want everyone to know about you</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Lead Gen Strategy */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Primary Platform Card */}
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
                  <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <Label className="text-sm font-semibold text-blue-600 mb-3 block">Primary Platform</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="leadPlatform" className="text-xs text-muted-foreground">Platform</Label>
                        <Select value={leadPlatform} onValueChange={setLeadPlatform}>
                          <SelectTrigger>
                            <SelectValue placeholder="Where will you show up?" />
                          </SelectTrigger>
                          <SelectContent>
                            {PLATFORM_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="leadContentType" className="text-xs text-muted-foreground">Content Type</Label>
                        <Select value={leadContentType} onValueChange={setLeadContentType}>
                          <SelectTrigger>
                            <SelectValue placeholder="What format?" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTENT_TYPE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="leadFrequency" className="text-xs text-muted-foreground">Posting Frequency</Label>
                        <Select value={leadFrequency} onValueChange={setLeadFrequency}>
                          <SelectTrigger>
                            <SelectValue placeholder="How often?" />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCY_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="leadPlatformGoal" className="text-xs text-muted-foreground">Goal</Label>
                        <Select value={leadPlatformGoal} onValueChange={setLeadPlatformGoal}>
                          <SelectTrigger>
                            <SelectValue placeholder="Main goal?" />
                          </SelectTrigger>
                          <SelectContent>
                            {PLATFORM_GOALS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Platforms */}
                  {secondaryPlatforms.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Secondary Platforms</Label>
                      {secondaryPlatforms.map((platform, idx) => (
                        <div key={idx} className="p-4 rounded-lg bg-muted/50 border border-border relative">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => removeSecondaryPlatform(idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pr-8">
                            <div>
                              <Label className="text-xs text-muted-foreground">Platform</Label>
                              <Select 
                                value={platform.platform} 
                                onValueChange={(v) => updateSecondaryPlatform(idx, 'platform', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Platform" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PLATFORM_OPTIONS.filter(opt => opt.value !== leadPlatform).map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-xs text-muted-foreground">Content Type</Label>
                              <Select 
                                value={platform.contentType} 
                                onValueChange={(v) => updateSecondaryPlatform(idx, 'contentType', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Content" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CONTENT_TYPE_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-xs text-muted-foreground">Frequency</Label>
                              <Select 
                                value={platform.frequency} 
                                onValueChange={(v) => updateSecondaryPlatform(idx, 'frequency', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                  {FREQUENCY_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-xs text-muted-foreground">Goal</Label>
                              <Select 
                                value={platform.goal} 
                                onValueChange={(v) => updateSecondaryPlatform(idx, 'goal', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Goal" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PLATFORM_GOALS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSecondaryPlatform}
                    className="w-full border-dashed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Secondary Platform
                  </Button>

                  {/* Posting Schedule Section */}
                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Posting Schedule</CardTitle>
                      <CardDescription>Configure your content schedule for auto-task creation</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Posting Days */}
                      <div>
                        <Label className="text-sm font-medium">Which days will you post?</Label>
                        <p className="text-xs text-muted-foreground mb-2">These days will be used to auto-create your posting tasks.</p>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <Button
                              key={day.value}
                              type="button"
                              variant={postingDays.includes(day.value) ? 'default' : 'outline'}
                              size="sm"
                              className="w-12"
                              onClick={() => {
                                if (postingDays.includes(day.value)) {
                                  setPostingDays(postingDays.filter(d => d !== day.value));
                                } else {
                                  setPostingDays([...postingDays, day.value]);
                                }
                              }}
                            >
                              {day.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Posting Time */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Default posting time (optional)</Label>
                          <Select value={postingTime} onValueChange={setPostingTime}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value || 'none'}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Batch Day */}
                        <div>
                          <Label className="text-sm font-medium">Weekly batch day (optional)</Label>
                          <Select value={batchDay} onValueChange={setBatchDay}>
                            <SelectTrigger>
                              <SelectValue placeholder="No batch day" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {DAYS_OF_WEEK.map(day => (
                                <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">If selected, we'll add weekly batch + scheduling tasks.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex items-center space-x-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <Checkbox
                      id="leadCommitted"
                      checked={leadCommitted}
                      onCheckedChange={(checked) => setLeadCommitted(checked as boolean)}
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
            </div>
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
                  <Label htmlFor="nurtureMethod">Primary Nurture Method</Label>
                  <Select value={nurtureMethod} onValueChange={(v) => {
                    setNurtureMethod(v);
                    if (v !== 'other') setNurtureMethodCustom('');
                  }}>
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
                      <SelectItem value="other">Other (custom)</SelectItem>
                    </SelectContent>
                  </Select>
                  {nurtureMethod === 'other' && (
                    <Input
                      value={nurtureMethodCustom}
                      onChange={(e) => setNurtureMethodCustom(e.target.value)}
                      placeholder="Enter your primary nurture method..."
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="secondaryNurtureMethod">Secondary Nurture Method (optional)</Label>
                  <Select value={secondaryNurtureMethod} onValueChange={(v) => {
                    setSecondaryNurtureMethod(v);
                    if (v !== 'other') setSecondaryNurtureMethodCustom('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add a backup nurture channel..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="email">Email Newsletter</SelectItem>
                      <SelectItem value="community">Free Community (FB Group, Discord, etc.)</SelectItem>
                      <SelectItem value="dm">DM Conversations</SelectItem>
                      <SelectItem value="podcast">Podcast</SelectItem>
                      <SelectItem value="webinar">Free Webinars/Workshops</SelectItem>
                      <SelectItem value="challenge">Free Challenges</SelectItem>
                      <SelectItem value="other">Other (custom)</SelectItem>
                    </SelectContent>
                  </Select>
                  {secondaryNurtureMethod === 'other' && (
                    <Input
                      value={secondaryNurtureMethodCustom}
                      onChange={(e) => setSecondaryNurtureMethodCustom(e.target.value)}
                      placeholder="Enter your secondary nurture method..."
                      className="mt-2"
                    />
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Having a backup nurture channel helps reach people who prefer different formats</p>
                </div>

                <div>
                  <Label htmlFor="nurtureFrequency">Nurture Frequency</Label>
                  <Select value={nurtureFrequency} onValueChange={setNurtureFrequency}>
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
                  <Label htmlFor="freeTransformation">What free transformation do you provide?</Label>
                  <Textarea
                    id="freeTransformation"
                    value={freeTransformation}
                    onChange={(e) => setFreeTransformation(e.target.value)}
                    placeholder="e.g., Help them go from confused about their message to having a clear 1-liner they can use everywhere..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">What result can they get from your free content?</p>
                </div>

                <div>
                  <Label>How will you show proof? (select all that apply)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PROOF_METHODS.map((method) => (
                      <Badge
                        key={method}
                        variant={proofMethods.includes(method) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          proofMethods.includes(method) && "bg-pink-600 hover:bg-pink-700"
                        )}
                        onClick={() => toggleProofMethod(method)}
                      >
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Email Follow-Through Check-ins */}
                {nurtureMethod === 'email' && (
                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4 text-pink-500" />
                        Email Follow-Through Check-ins
                      </CardTitle>
                      <CardDescription>
                        Get a gentle reminder the day after your email send day to stay consistent
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="emailCheckinEnabled"
                          checked={emailCheckinEnabled}
                          onCheckedChange={(checked) => setEmailCheckinEnabled(checked as boolean)}
                        />
                        <div>
                          <Label htmlFor="emailCheckinEnabled" className="text-sm font-medium cursor-pointer">
                            Enable follow-through check-ins
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            We'll ask "Did you send your email yesterday?" the day after
                          </p>
                        </div>
                      </div>

                      {emailCheckinEnabled && (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div>
                            <Label className="text-sm font-medium">Which day do you send emails?</Label>
                            <Select 
                              value={emailSendDay.toString()} 
                              onValueChange={(v) => setEmailSendDay(parseInt(v))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Sunday</SelectItem>
                                <SelectItem value="1">Monday</SelectItem>
                                <SelectItem value="2">Tuesday</SelectItem>
                                <SelectItem value="3">Wednesday</SelectItem>
                                <SelectItem value="4">Thursday</SelectItem>
                                <SelectItem value="5">Friday</SelectItem>
                                <SelectItem value="6">Saturday</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Preferred time block</Label>
                            <Select value={emailTimeBlock} onValueChange={setEmailTimeBlock}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="morning">Morning</SelectItem>
                                <SelectItem value="afternoon">Afternoon</SelectItem>
                                <SelectItem value="evening">Evening</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
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
                {offers.map((offer, idx) => (
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
                      {offers.length > 1 && (
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
                        value={revenueGoal}
                        onChange={(e) => setRevenueGoal(e.target.value)}
                        placeholder="e.g., 30000"
                      />
                    </div>
                    <div>
                      <Label>Avg Price Per Sale ($)</Label>
                      <Input
                        type="number"
                        value={pricePerSale}
                        onChange={(e) => setPricePerSale(e.target.value)}
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
                      value={launchSchedule}
                      onChange={(e) => setLaunchSchedule(e.target.value)}
                      placeholder="e.g., Week 2: Soft launch to warm list. Week 6: Webinar + Open cart. Week 10: Flash sale..."
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
                  {monthPlans.map((month, idx) => (
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

          {/* Step 8: Habits & Reminders + Metrics + Projects */}
          {currentStep === 8 && (
            <div className="space-y-6">
              {/* Success Metrics */}
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <CardTitle>Success Metrics</CardTitle>
                  </div>
                  <CardDescription>What 3 numbers will you track weekly?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: metric1Name, setName: setMetric1Name, value: metric1Start, setValue: setMetric1Start },
                    { name: metric2Name, setName: setMetric2Name, value: metric2Start, setValue: setMetric2Start },
                    { name: metric3Name, setName: setMetric3Name, value: metric3Start, setValue: setMetric3Start },
                  ].map((metric, idx) => (
                    <div key={idx} className="grid gap-3 sm:grid-cols-2 p-3 rounded-lg border">
                      <div>
                        <Label className="text-sm text-muted-foreground">Metric {idx + 1} Name</Label>
                        <Input
                          value={metric.name}
                          onChange={(e) => metric.setName(e.target.value)}
                          placeholder={
                            idx === 0 ? "e.g., Email subscribers" :
                            idx === 1 ? "e.g., Sales calls booked" :
                            "e.g., Monthly revenue"
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Starting Value</Label>
                        <Input
                          type="number"
                          value={metric.value}
                          onChange={(e) => metric.setValue(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Supporting Projects */}
              <Card>
                <CardHeader>
                  <CardTitle>Supporting Projects</CardTitle>
                  <CardDescription>These will be added to your Projects page</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {projects.map((project, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={project}
                        onChange={(e) => updateProject(idx, e.target.value)}
                        placeholder="Project name"
                      />
                      {projects.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeProject(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addProject}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Project
                  </Button>
                </CardContent>
              </Card>

              {/* Habits */}
              <Card>
                <CardHeader>
                  <CardTitle>Create Your Habits</CardTitle>
                  <CardDescription>These will be added to your Habits tracker</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {habits.map((habit, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={habit.name}
                        onChange={(e) => updateHabit(idx, 'name', e.target.value)}
                        placeholder="Habit name"
                      />
                      <Input
                        value={habit.category}
                        onChange={(e) => updateHabit(idx, 'category', e.target.value)}
                        placeholder="Category (optional)"
                        className="w-1/3"
                      />
                      {habits.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeHabit(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addHabit}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Habit
                  </Button>
                </CardContent>
              </Card>

              {/* Things to Keep in Mind */}
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <CardTitle>Things to Keep in Mind</CardTitle>
                  </div>
                  <CardDescription>
                    Write 3 reminders you want to see when you log in
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {thingsToRemember.map((reminder, idx) => (
                    <div key={idx} className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Reminder {idx + 1}</Label>
                      <Input
                        value={reminder}
                        onChange={(e) => updateReminder(idx, e.target.value)}
                        placeholder={
                          idx === 0 ? "e.g., Progress over perfection" :
                          idx === 1 ? "e.g., One thing at a time" :
                          "e.g., Trust the process"
                        }
                        maxLength={200}
                      />
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

          {currentStep < STEPS.length ? (
            <Button type="button" onClick={nextStep}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePreview} disabled={loading}>
                Preview Projects & Tasks
              </Button>
              <Button onClick={() => setShowAutopilotModal(true)} disabled={loading || !goal}>
                {loading ? 'Creating...' : 'Create Cycle →'}
              </Button>
            </div>
          )}
        </div>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Preview: What Would Be Created
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Projects Preview */}
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  📁 Projects ({previewData.projects.length})
                </h3>
                {previewData.projects.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No projects would be created</p>
                ) : (
                  <div className="space-y-2">
                    {previewData.projects.map((project, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-muted/30">
                        <p className="font-medium">{project.name}</p>
                        {project.description && (
                          <p className="text-sm text-muted-foreground">{project.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tasks Preview */}
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  ✅ Tasks ({previewData.tasks.reduce((sum, t) => sum + t.count, 0)} total)
                </h3>
                {previewData.tasks.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No recurring tasks would be created</p>
                ) : (
                  <div className="space-y-2">
                    {previewData.tasks.map((task, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-primary/5">
                        <p className="font-medium">{task.count} tasks</p>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t text-sm text-muted-foreground">
                <p>💡 This is a preview only. Click "Create Cycle" to actually create these items.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Autopilot Setup Modal */}
        <AutopilotSetupModal
          open={showAutopilotModal}
          onOpenChange={setShowAutopilotModal}
          onConfirm={handleSubmit}
          loading={loading}
          hasPlatform={!!leadPlatform}
          hasPostingDays={postingDays.length > 0}
          hasMetrics={!!(metric1Name || metric2Name || metric3Name)}
          hasNurtureMethod={!!nurtureMethod}
          hasOffers={offers.some(o => o.name.trim())}
          postingDaysCount={postingDays.length}
          nurtureFrequency={nurtureFrequency}
          offersCount={offers.filter(o => o.name.trim()).length}
          customProjectsCount={projects.filter(p => p.trim()).length}
        />
      </div>
    </Layout>
  );
}
