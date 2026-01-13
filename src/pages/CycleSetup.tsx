import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Plus, X, Target, BarChart3, Brain, CalendarIcon, Users, Megaphone, DollarSign, ChevronLeft, ChevronRight, Check, Sparkles, Heart, TrendingUp, Upload, FileJson, Save, Mail, Clock, Lightbulb, Zap, AlertCircle, CheckCircle, Download, FileText, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, addDays, parseISO } from 'date-fns';
import { HelpButton } from '@/components/ui/help-button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCycleSetupDraft, CycleSetupDraft, SecondaryPlatform, LimitedTimeOffer, RecurringTaskDefinition, NurturePlatformDefinition } from '@/hooks/useCycleSetupDraft';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AutopilotSetupModal, AutopilotOptions } from '@/components/cycle/AutopilotSetupModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { loadCycleForExport, exportCycleAsJSON, exportCycleAsPDF, CycleExportData, generateExportFromFormData, CycleFormData, ExportResult } from '@/lib/cycleExport';
import { PDFInstructionsModal } from '@/components/pdf/PDFInstructionsModal';

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
  { value: 'other', label: 'Other' },
];

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'blog', label: 'Blog/SEO' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'email', label: 'Email' },
  { value: 'bundles', label: 'Bundles' },
  { value: 'summits', label: 'Summits' },
  { value: 'threads', label: 'Threads' },
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
  { value: 'other', label: 'Other' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: '5x-week', label: '5x per week' },
  { value: '3x-week', label: '3x per week' },
  { value: '2x-week', label: '2x per week' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'other', label: 'Other' },
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
  { id: 9, name: 'First 3 Days', icon: Zap },
];

export default function CycleSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editCycleId = searchParams.get('edit');
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingCycleId, setExistingCycleId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPDFInstructions, setShowPDFInstructions] = useState(false);
  
  const { hasDraft, saveDraft, loadDraft, clearDraft, getDraftAge, isSyncing, lastServerSync, syncError } = useCycleSetupDraft();
  
  // Track if user has dismissed the draft dialog to prevent it from re-appearing
  const hasUserDismissedDraft = useRef(false);
  
  // Track if we should skip the next auto-save (to prevent race condition after clearing draft)
  const skipNextAutoSave = useRef(false);
  
  // Cloud save status indicator
  const [cloudSaveStatus, setCloudSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Mark when user enters CycleSetup for recovery detection
  useEffect(() => {
    localStorage.setItem('last_cycle_setup_visit', Date.now().toString());
    console.log('✅ CycleSetup: Marked entry timestamp for recovery detection');
  }, []);

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
  const [keyMessage1, setKeyMessage1] = useState('');
  const [keyMessage2, setKeyMessage2] = useState('');
  const [keyMessage3, setKeyMessage3] = useState('');

  // Step 4: Lead Gen Strategy
  const [leadPlatform, setLeadPlatform] = useState('');
  const [leadPlatformCustom, setLeadPlatformCustom] = useState('');
  const [leadContentType, setLeadContentType] = useState('');
  const [leadContentTypeCustom, setLeadContentTypeCustom] = useState('');
  const [leadFrequency, setLeadFrequency] = useState('');
  const [leadFrequencyCustom, setLeadFrequencyCustom] = useState('');
  const [leadPlatformGoal, setLeadPlatformGoal] = useState('leads');
  const [leadPlatformGoalCustom, setLeadPlatformGoalCustom] = useState('');
  const [leadCommitted, setLeadCommitted] = useState(false);
  const [secondaryPlatforms, setSecondaryPlatforms] = useState<SecondaryPlatform[]>([]);
  const [postingDays, setPostingDays] = useState<string[]>([]);
  const [postingTime, setPostingTime] = useState('');
  const [batchDay, setBatchDay] = useState('');
  const [batchFrequency, setBatchFrequency] = useState('weekly');
  const [leadGenContentAudit, setLeadGenContentAudit] = useState('');

  // Step 5: Nurture Strategy
  const [nurtureMethod, setNurtureMethod] = useState('');
  const [nurtureMethodCustom, setNurtureMethodCustom] = useState('');
  const [secondaryNurtureMethod, setSecondaryNurtureMethod] = useState('');
  const [secondaryNurtureMethodCustom, setSecondaryNurtureMethodCustom] = useState('');
  const [nurtureFrequency, setNurtureFrequency] = useState('');
  const [nurtureFrequencyCustom, setNurtureFrequencyCustom] = useState('');
  const [freeTransformation, setFreeTransformation] = useState('');
  const [proofMethods, setProofMethods] = useState<string[]>([]);
  const [nurturePostingDays, setNurturePostingDays] = useState<string[]>([]);
  const [nurturePostingTime, setNurturePostingTime] = useState('');
  const [nurtureBatchDay, setNurtureBatchDay] = useState('');
  const [nurtureBatchFrequency, setNurtureBatchFrequency] = useState('weekly');
  const [nurtureContentAudit, setNurtureContentAudit] = useState('');
  // Secondary nurture scheduling
  const [secondaryNurturePostingDays, setSecondaryNurturePostingDays] = useState<string[]>([]);
  const [secondaryNurturePostingTime, setSecondaryNurturePostingTime] = useState('');
  
  // NEW: Array of all nurture platforms (replaces single primary/secondary)
  const [nurturePlatforms, setNurturePlatforms] = useState<NurturePlatformDefinition[]>([]);
  
  // Email commitment settings (for follow-through check-ins)
  const [emailCheckinEnabled, setEmailCheckinEnabled] = useState(false);
  const [emailSendDay, setEmailSendDay] = useState<number>(2); // Default Tuesday
  const [emailTimeBlock, setEmailTimeBlock] = useState<string>('morning');

  // Step 6: Offers
  const [offers, setOffers] = useState<Offer[]>([
    { name: '', price: '', frequency: '', transformation: '', isPrimary: true }
  ]);
  
  // Step 6: Limited Time Offers (flash sales, promos, launches)
  const [limitedOffers, setLimitedOffers] = useState<LimitedTimeOffer[]>([]);
  // Step 7: 90-Day Breakdown
  const [revenueGoal, setRevenueGoal] = useState<string>('');
  const [pricePerSale, setPricePerSale] = useState<string>('');
  const [launchSchedule, setLaunchSchedule] = useState('');
  const [monthPlans, setMonthPlans] = useState<MonthPlan[]>([
    { monthName: 'Month 1', projects: '', salesPromos: '', mainFocus: '' },
    { monthName: 'Month 2', projects: '', salesPromos: '', mainFocus: '' },
    { monthName: 'Month 3', projects: '', salesPromos: '', mainFocus: '' },
  ]);

  // Step 8: Success Metrics, Projects, Habits, Reminders, Weekly Routines
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
  
  // Weekly Routines
  const [weeklyPlanningDay, setWeeklyPlanningDay] = useState('');
  const [weeklyDebriefDay, setWeeklyDebriefDay] = useState('');
  const [officeHoursStart, setOfficeHoursStart] = useState('09:00');
  const [officeHoursEnd, setOfficeHoursEnd] = useState('17:00');
  const [officeHoursDays, setOfficeHoursDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [autoCreateWeeklyTasks, setAutoCreateWeeklyTasks] = useState(true);
  
  // Step 8.5: Recurring Tasks
  const [recurringTasks, setRecurringTasks] = useState<RecurringTaskDefinition[]>([]);

  // Step 9: Mindset & First 3 Days
  const [biggestFear, setBiggestFear] = useState('');
  const [whatWillYouDoWhenFearHits, setWhatWillYouDoWhenFearHits] = useState('');
  const [commitmentStatement, setCommitmentStatement] = useState('');
  const [whoWillHoldYouAccountable, setWhoWillHoldYouAccountable] = useState('');
  // First 3 Days with user-selectable dates
  const [day1Date, setDay1Date] = useState<Date | undefined>(undefined);
  const [day1Top3, setDay1Top3] = useState<string[]>(['', '', '']);
  const [day1Why, setDay1Why] = useState('');
  const [day2Date, setDay2Date] = useState<Date | undefined>(undefined);
  const [day2Top3, setDay2Top3] = useState<string[]>(['', '', '']);
  const [day2Why, setDay2Why] = useState('');
  const [day3Date, setDay3Date] = useState<Date | undefined>(undefined);
  const [day3Top3, setDay3Top3] = useState<string[]>(['', '', '']);
  const [day3Why, setDay3Why] = useState('');

  // Helper to get first N weekdays from a start date
  const getFirstWeekdays = useCallback((start: Date, count: number): Date[] => {
    const weekdays: Date[] = [];
    const current = new Date(start);
    while (weekdays.length < count) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // Skip weekends
        weekdays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return weekdays;
  }, []);

  // Initialize day dates when start date changes (only if not already set)
  useEffect(() => {
    if (startDate && !day1Date && !day2Date && !day3Date) {
      const weekdays = getFirstWeekdays(startDate, 3);
      setDay1Date(weekdays[0]);
      setDay2Date(weekdays[1]);
      setDay3Date(weekdays[2]);
    }
  }, [startDate, day1Date, day2Date, day3Date, getFirstWeekdays]);
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

  // Load existing cycle for editing
  useEffect(() => {
    const loadExistingCycle = async () => {
      if (!editCycleId || !user) return;

      try {
        // Load main cycle data
        const { data: cycleData, error: cycleError } = await supabase
          .from('cycles_90_day')
          .select('*')
          .eq('cycle_id', editCycleId)
          .eq('user_id', user.id)
          .single();

        if (cycleError) throw cycleError;
        
        if (cycleData) {
          setIsEditMode(true);
          setExistingCycleId(cycleData.cycle_id);
          hasUserDismissedDraft.current = true; // Don't show draft dialog in edit mode
          
          // Load data into form
          try {
            setStartDate(parseISO(cycleData.start_date));
          } catch {
            setStartDate(new Date());
          }
          setGoal(cycleData.goal || '');
          setWhy(cycleData.why || '');
          setIdentity(cycleData.identity || '');
          setFeeling(cycleData.target_feeling || '');
          setDiscoverScore(cycleData.discover_score || 5);
          setNurtureScore(cycleData.nurture_score || 5);
          setConvertScore(cycleData.convert_score || 5);
          setBiggestBottleneck(cycleData.biggest_bottleneck || '');
          setAudienceTarget(cycleData.audience_target || '');
          setAudienceFrustration(cycleData.audience_frustration || '');
          setSignatureMessage(cycleData.signature_message || '');
          setMetric1Name(cycleData.metric_1_name || '');
          setMetric1Start(cycleData.metric_1_start ?? '');
          setMetric2Name(cycleData.metric_2_name || '');
          setMetric2Start(cycleData.metric_2_start ?? '');
          setMetric3Name(cycleData.metric_3_name || '');
          setMetric3Start(cycleData.metric_3_start ?? '');
          setThingsToRemember(Array.isArray(cycleData.things_to_remember) ? (cycleData.things_to_remember as string[]) : ['', '', '']);
          setWeeklyPlanningDay(cycleData.weekly_planning_day || '');
          setWeeklyDebriefDay(cycleData.weekly_debrief_day || '');
          setOfficeHoursStart(cycleData.office_hours_start || '09:00');
          setOfficeHoursEnd(cycleData.office_hours_end || '17:00');
          setOfficeHoursDays(Array.isArray(cycleData.office_hours_days) ? (cycleData.office_hours_days as string[]) : []);

          // Load strategy
          const { data: strategyData } = await supabase
            .from('cycle_strategy')
            .select('*')
            .eq('cycle_id', editCycleId)
            .single();
          
          if (strategyData) {
            setLeadPlatform(strategyData.lead_primary_platform || '');
            setLeadContentType(strategyData.lead_content_type || '');
            setLeadFrequency(strategyData.lead_frequency || '');
            setLeadCommitted(strategyData.lead_committed_90_days || false);
            setNurtureMethod(strategyData.nurture_method || '');
            setNurtureFrequency(strategyData.nurture_frequency || '');
            setFreeTransformation(strategyData.free_transformation || '');
            setProofMethods(Array.isArray(strategyData.proof_methods) ? (strategyData.proof_methods as string[]) : []);
            setPostingDays(Array.isArray(strategyData.posting_days) ? (strategyData.posting_days as string[]) : []);
            setPostingTime(strategyData.posting_time || '');
            setBatchDay(strategyData.batch_day || '');
            setBatchFrequency(strategyData.batch_frequency || 'weekly');
            setLeadGenContentAudit(strategyData.lead_gen_content_audit || '');
            setNurturePostingDays(Array.isArray(strategyData.nurture_posting_days) ? (strategyData.nurture_posting_days as string[]) : []);
            setNurturePostingTime(strategyData.nurture_posting_time || '');
            setNurtureBatchDay(strategyData.nurture_batch_day || '');
            setNurtureBatchFrequency(strategyData.nurture_batch_frequency || 'weekly');
            setNurtureContentAudit(strategyData.nurture_content_audit || '');
            if (Array.isArray(strategyData.secondary_platforms)) {
              setSecondaryPlatforms(strategyData.secondary_platforms as unknown as SecondaryPlatform[]);
            }
          }

          // Load revenue plan
          const { data: revenueData } = await supabase
            .from('cycle_revenue_plan')
            .select('*')
            .eq('cycle_id', editCycleId)
            .single();
          
          if (revenueData) {
            setRevenueGoal(revenueData.revenue_goal?.toString() || '');
            setPricePerSale(revenueData.price_per_sale?.toString() || '');
            setLaunchSchedule(revenueData.launch_schedule || '');
          }

          // Load offers
          const { data: offersData } = await supabase
            .from('cycle_offers')
            .select('*')
            .eq('cycle_id', editCycleId)
            .order('sort_order');
          
          if (offersData && offersData.length > 0) {
            setOffers(offersData.map(o => ({
              name: o.offer_name,
              price: o.price?.toString() || '',
              frequency: o.sales_frequency || '',
              transformation: o.transformation || '',
              isPrimary: o.is_primary || false,
            })));
          }

          toast({
            title: 'Editing cycle',
            description: 'Make your changes and save when ready.',
          });
        }
      } catch (error) {
        console.error('Error loading existing cycle:', error);
        toast({
          title: 'Error loading cycle',
          description: 'Could not load the cycle for editing.',
          variant: 'destructive',
        });
      }
    };

    loadExistingCycle();
  }, [editCycleId, user, toast]);

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
  const handleRestoreDraft = useCallback(async () => {
    const draft = await loadDraft();
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
      setKeyMessage1(draft.keyMessage1 || '');
      setKeyMessage2(draft.keyMessage2 || '');
      setKeyMessage3(draft.keyMessage3 || '');
      setLeadPlatform(draft.leadPlatform || '');
      setLeadContentType(draft.leadContentType || '');
      setLeadFrequency(draft.leadFrequency || '');
      setLeadPlatformGoal(draft.leadPlatformGoal || 'leads');
      setLeadCommitted(draft.leadCommitted ?? false);
      if (draft.secondaryPlatforms?.length) setSecondaryPlatforms(draft.secondaryPlatforms);
      if (draft.postingDays?.length) setPostingDays(draft.postingDays);
      setPostingTime(draft.postingTime || '');
      setBatchDay(draft.batchDay || '');
      setBatchFrequency(draft.batchFrequency || 'weekly');
      setLeadGenContentAudit(draft.leadGenContentAudit || '');
      setNurtureMethod(draft.nurtureMethod || '');
      setNurtureFrequency(draft.nurtureFrequency || '');
      setFreeTransformation(draft.freeTransformation || '');
      setProofMethods(draft.proofMethods || []);
      setNurturePostingDays(draft.nurturePostingDays || []);
      setNurturePostingTime(draft.nurturePostingTime || '');
      setNurtureBatchDay(draft.nurtureBatchDay || '');
      setNurtureBatchFrequency(draft.nurtureBatchFrequency || 'weekly');
      setNurtureContentAudit(draft.nurtureContentAudit || '');
      if (draft.offers?.length) setOffers(draft.offers);
      if (draft.limitedOffers?.length) setLimitedOffers(draft.limitedOffers);
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
      setWeeklyPlanningDay(draft.weeklyPlanningDay || '');
      setWeeklyDebriefDay(draft.weeklyDebriefDay || '');
      setOfficeHoursStart(draft.officeHoursStart || '09:00');
      setOfficeHoursEnd(draft.officeHoursEnd || '17:00');
      if (draft.officeHoursDays?.length) setOfficeHoursDays(draft.officeHoursDays);
      setAutoCreateWeeklyTasks(draft.autoCreateWeeklyTasks ?? true);
      // Step 8.5: Recurring Tasks
      if (draft.recurringTasks?.length) setRecurringTasks(draft.recurringTasks);
      // Step 9: Mindset & First 3 Days
      setBiggestFear(draft.biggestFear || '');
      setWhatWillYouDoWhenFearHits(draft.whatWillYouDoWhenFearHits || '');
      setCommitmentStatement(draft.commitmentStatement || '');
      setWhoWillHoldYouAccountable(draft.whoWillHoldYouAccountable || '');
      if (draft.day1Top3?.length) setDay1Top3(draft.day1Top3);
      setDay1Why(draft.day1Why || '');
      if (draft.day2Top3?.length) setDay2Top3(draft.day2Top3);
      setDay2Why(draft.day2Why || '');
      if (draft.day3Top3?.length) setDay3Top3(draft.day3Top3);
      setDay3Why(draft.day3Why || '');
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
        keyMessage1,
        keyMessage2,
        keyMessage3,
        leadPlatform,
        leadContentType,
        leadFrequency,
        leadPlatformGoal,
        leadCommitted,
        secondaryPlatforms,
        postingDays,
        postingTime,
        batchDay,
        batchFrequency,
        leadGenContentAudit,
        nurtureMethod,
        nurtureFrequency,
        freeTransformation,
        proofMethods,
        nurturePostingDays,
        nurturePostingTime,
        nurtureBatchDay,
        nurtureBatchFrequency,
        nurtureContentAudit,
        offers,
        limitedOffers,
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
        weeklyPlanningDay,
        weeklyDebriefDay,
        officeHoursStart,
        officeHoursEnd,
        officeHoursDays,
        autoCreateWeeklyTasks,
        // Step 8.5: Recurring Tasks
        recurringTasks,
        // Step 9: Mindset & First 3 Days
        biggestFear,
        whatWillYouDoWhenFearHits,
        commitmentStatement,
        whoWillHoldYouAccountable,
        day1Top3,
        day1Why,
        day2Top3,
        day2Why,
        day3Top3,
        day3Why,
        currentStep,
      };
      
      // Update cloud save status and save draft
      setCloudSaveStatus('saving');
      
      // Use async IIFE to handle the promise
      (async () => {
        try {
          await saveDraft(draftData);
          setCloudSaveStatus('saved');
          setLastSaved(new Date());
          console.log('✅ Draft auto-saved successfully');
        } catch (error) {
          console.error('❌ Draft auto-save failed:', error);
          setCloudSaveStatus('error');
        }
      })();
    }, 2500); // Debounce 2.5 seconds

    return () => clearTimeout(timeoutId);
  }, [
    startDate, goal, why, identity, feeling,
    discoverScore, nurtureScore, convertScore, biggestBottleneck,
    audienceTarget, audienceFrustration, signatureMessage, keyMessage1, keyMessage2, keyMessage3,
    leadPlatform, leadContentType, leadFrequency, leadPlatformGoal, leadCommitted, secondaryPlatforms, postingDays, postingTime, batchDay, batchFrequency, leadGenContentAudit,
    nurtureMethod, nurtureFrequency, freeTransformation, proofMethods, nurturePostingDays, nurturePostingTime, nurtureBatchDay, nurtureBatchFrequency, nurtureContentAudit,
    offers, limitedOffers, revenueGoal, pricePerSale, launchSchedule, monthPlans,
    metric1Name, metric1Start, metric2Name, metric2Start, metric3Name, metric3Start,
    projects, habits, thingsToRemember, 
    weeklyPlanningDay, weeklyDebriefDay, officeHoursStart, officeHoursEnd, officeHoursDays, autoCreateWeeklyTasks, recurringTasks,
    biggestFear, whatWillYouDoWhenFearHits, commitmentStatement, whoWillHoldYouAccountable,
    day1Top3, day1Why, day2Top3, day2Why, day3Top3, day3Why,
    currentStep, saveDraft
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

  // Limited Time Offer helpers
  const addLimitedOffer = () => {
    setLimitedOffers([...limitedOffers, { 
      id: crypto.randomUUID(), 
      name: '', 
      startDate: '', 
      endDate: '', 
      promoType: '' as const,
      discount: '',
      notes: ''
    }]);
  };
  const updateLimitedOffer = (idx: number, field: keyof LimitedTimeOffer, value: string) => {
    const updated = [...limitedOffers];
    updated[idx] = { ...updated[idx], [field]: value };
    setLimitedOffers(updated);
  };
  const removeLimitedOffer = (idx: number) => {
    setLimitedOffers(limitedOffers.filter((_, i) => i !== idx));
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

  // Nurture platform helpers
  const addNurturePlatform = () => {
    setNurturePlatforms([...nurturePlatforms, {
      method: '',
      methodCustom: '',
      postingDays: [],
      postingTime: '',
      batchDay: '',
      batchFrequency: 'weekly',
      isPrimary: nurturePlatforms.length === 0  // First one is primary
    }]);
  };
  
  const updateNurturePlatform = (idx: number, field: keyof NurturePlatformDefinition, value: any) => {
    const updated = [...nurturePlatforms];
    updated[idx] = { ...updated[idx], [field]: value };
    setNurturePlatforms(updated);
  };
  
  const removeNurturePlatform = (idx: number) => {
    const updated = nurturePlatforms.filter((_, i) => i !== idx);
    // Make first remaining one primary
    if (updated.length > 0 && !updated.some(p => p.isPrimary)) {
      updated[0].isPrimary = true;
    }
    setNurturePlatforms(updated);
  };
  
  const toggleNurturePlatformDay = (idx: number, day: string) => {
    const platform = nurturePlatforms[idx];
    const newDays = platform.postingDays.includes(day)
      ? platform.postingDays.filter(d => d !== day)
      : [...platform.postingDays, day];
    updateNurturePlatform(idx, 'postingDays', newDays);
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
    
    console.log('🚀 Starting cycle save for user:', user.id);
    
    // CRITICAL: Validate session before any database operations
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (!session || sessionError) {
      console.error('❌ Session validation failed:', sessionError);
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please refresh the page and log in again before saving.",
        variant: "destructive",
        duration: 10000,
      });
      return;
    }
    
    console.log('✅ Session validated, proceeding with save');
    
    setLoading(true);
    setShowAutopilotModal(false);

    try {
      // Handle UPDATE mode
      if (isEditMode && existingCycleId) {
        const { error: updateError } = await supabase
          .from('cycles_90_day')
          .update({
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
            weekly_planning_day: weeklyPlanningDay || null,
            weekly_debrief_day: weeklyDebriefDay || null,
            office_hours_start: officeHoursStart || null,
            office_hours_end: officeHoursEnd || null,
            office_hours_days: officeHoursDays,
            // Step 9: Mindset & First 3 Days
            biggest_fear: biggestFear?.trim() || null,
            fear_response: whatWillYouDoWhenFearHits?.trim() || null,
            commitment_statement: commitmentStatement?.trim() || null,
            accountability_person: whoWillHoldYouAccountable?.trim() || null,
            day1_top3: day1Top3.filter(t => t?.trim()),
            day1_why: day1Why?.trim() || null,
            day2_top3: day2Top3.filter(t => t?.trim()),
            day2_why: day2Why?.trim() || null,
            day3_top3: day3Top3.filter(t => t?.trim()),
            day3_why: day3Why?.trim() || null,
          } as any)
          .eq('cycle_id', existingCycleId);

        if (updateError) throw updateError;

        // Update strategy
        const effectiveNurtureMethod = nurtureMethod === 'other' ? nurtureMethodCustom : nurtureMethod;
        await supabase
          .from('cycle_strategy')
          .upsert({
            cycle_id: existingCycleId,
            user_id: user.id,
            lead_primary_platform: leadPlatform || null,
            lead_content_type: leadContentType || null,
            lead_frequency: leadFrequency || null,
            lead_committed_90_days: leadCommitted,
            nurture_method: effectiveNurtureMethod || null,
            nurture_frequency: nurtureFrequency || null,
            free_transformation: freeTransformation || null,
            proof_methods: proofMethods,
            posting_days: postingDays,
            posting_time: postingTime || null,
            batch_day: batchDay || null,
            batch_frequency: batchFrequency || 'weekly',
            lead_gen_content_audit: leadGenContentAudit || null,
            nurture_posting_days: nurturePlatforms[0]?.postingDays || nurturePostingDays,
            nurture_posting_time: nurturePlatforms[0]?.postingTime || nurturePostingTime || null,
            nurture_batch_day: (nurturePlatforms[0]?.batchDay && nurturePlatforms[0]?.batchDay !== 'none' ? nurturePlatforms[0]?.batchDay : nurtureBatchDay) || null,
            nurture_batch_frequency: nurturePlatforms[0]?.batchFrequency || nurtureBatchFrequency || 'weekly',
            nurture_content_audit: nurtureContentAudit || null,
            secondary_platforms: secondaryPlatforms.filter(sp => sp.platform.trim()),
            nurture_platforms: nurturePlatforms.filter(p => p.method.trim()),
          } as any, { onConflict: 'cycle_id' });

        toast({
          title: '✅ Plan Updated!',
          description: 'Your changes have been saved.',
        });

        clearDraft();
        navigate('/cycles');
        return;
      }

      // CREATE new cycle
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
          // Weekly routines
          weekly_planning_day: weeklyPlanningDay || null,
          weekly_debrief_day: weeklyDebriefDay || null,
          office_hours_start: officeHoursStart || null,
          office_hours_end: officeHoursEnd || null,
          office_hours_days: officeHoursDays,
          // Step 9: Mindset & First 3 Days (all optional)
          biggest_fear: biggestFear?.trim() || null,
          fear_response: whatWillYouDoWhenFearHits?.trim() || null,
          commitment_statement: commitmentStatement?.trim() || null,
          accountability_person: whoWillHoldYouAccountable?.trim() || null,
          day1_top3: day1Top3.filter(t => t?.trim()),
          day1_why: day1Why?.trim() || null,
          day2_top3: day2Top3.filter(t => t?.trim()),
          day2_why: day2Why?.trim() || null,
          day3_top3: day3Top3.filter(t => t?.trim()),
          day3_why: day3Why?.trim() || null,
          // Promotions for dashboard widgets
          promotions: limitedOffers
            .filter(lto => lto.name.trim() && lto.startDate && lto.endDate)
            .map(lto => ({
              name: lto.name,
              offer: lto.offerRef || '',
              startDate: lto.startDate,
              endDate: lto.endDate,
              goal: lto.discount || '',
              launchType: lto.promoType || 'open-close',
              notes: lto.notes || ''
            })),
        } as any)
        .select()
        .single();

      if (cycleError) {
        console.error('❌ Cycle creation failed:', cycleError);
        throw cycleError;
      }

      const cycleId = cycle.cycle_id;
      console.log('✅ Cycle created with ID:', cycleId);

      // VERIFICATION: Confirm the cycle was actually saved
      const { data: verifyData, error: verifyError } = await supabase
        .from('cycles_90_day')
        .select('cycle_id, goal')
        .eq('cycle_id', cycleId)
        .eq('user_id', user.id)
        .single();

      if (verifyError || !verifyData) {
        console.error('❌ Cycle verification failed:', verifyError);
        toast({
          title: "Save may have failed",
          description: "Your draft is safely saved. Please check your dashboard. If your cycle doesn't appear, return here to try again.",
          variant: "destructive",
          duration: 15000,
        });
        // DON'T clear draft - keep it for recovery
        // DON'T return - still try to save related data
      } else {
        console.log('✅ Cycle verified successfully:', verifyData.goal?.substring(0, 50));
        // NOW it's safe to clear the draft since cycle is verified
        clearDraft();
        // Clear the setup visit marker since save succeeded
        localStorage.removeItem('last_cycle_setup_visit');
        console.log('✅ Draft cleared after successful verification');
      }

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
          // Lead gen posting schedule fields
          posting_days: postingDays,
          posting_time: postingTime && postingTime !== 'none' ? postingTime : null,
          batch_day: batchDay && batchDay !== 'none' ? batchDay : null,
          batch_frequency: batchFrequency || 'weekly',
          lead_gen_content_audit: leadGenContentAudit || null,
          // Nurture posting schedule fields (legacy, from first nurture platform if exists)
          nurture_posting_days: nurturePlatforms[0]?.postingDays || nurturePostingDays,
          nurture_posting_time: nurturePlatforms[0]?.postingTime || nurturePostingTime || null,
          nurture_batch_day: (nurturePlatforms[0]?.batchDay && nurturePlatforms[0]?.batchDay !== 'none' ? nurturePlatforms[0]?.batchDay : nurtureBatchDay) || null,
          nurture_batch_frequency: nurturePlatforms[0]?.batchFrequency || nurtureBatchFrequency || 'weekly',
          nurture_content_audit: nurtureContentAudit || null,
          // Secondary platforms
          secondary_platforms: secondaryPlatforms.filter(sp => sp.platform.trim()),
          // NEW: All nurture platforms as JSONB array
          nurture_platforms: nurturePlatforms.filter(p => p.method.trim()),
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

      // Create limited time offers (flash sales, promos)
      const ltoToCreate = limitedOffers
        .filter((lto) => lto.name.trim() && lto.startDate && lto.endDate)
        .map((lto, idx) => ({
          cycle_id: cycleId,
          user_id: user.id,
          name: lto.name,
          start_date: lto.startDate,
          end_date: lto.endDate,
          promo_type: lto.promoType || 'flash_sale',
          discount: lto.discount || null,
          notes: lto.notes || null,
          sort_order: idx,
        }));

      if (ltoToCreate.length > 0) {
        const { error: ltoError } = await supabase
          .from('cycle_limited_offers')
          .insert(ltoToCreate);
        if (ltoError) console.error('Limited offers error:', ltoError);
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

      // Create weekly planning and review tasks (if user opted in)
      if (autoCreateWeeklyTasks && (weeklyPlanningDay || weeklyDebriefDay)) {
        const dayMap: Record<string, number> = {
          'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
          'Thursday': 4, 'Friday': 5, 'Saturday': 6
        };
        
        const weeklyTasksToCreate: any[] = [];
        const cycleStartDate = new Date(startDate);
        const cycleEndDate = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Create Weekly Planning Tasks
        if (weeklyPlanningDay && dayMap[weeklyPlanningDay] !== undefined) {
          const planningDayNum = dayMap[weeklyPlanningDay];
          let planningDate = new Date(cycleStartDate > today ? cycleStartDate : today);
          
          // Find next planning day
          while (planningDate.getDay() !== planningDayNum) {
            planningDate.setDate(planningDate.getDate() + 1);
          }
          
          // Create task for each week in the cycle
          let weekNum = 1;
          while (planningDate <= cycleEndDate) {
            weeklyTasksToCreate.push({
              user_id: user.id,
              cycle_id: cycleId,
              task_text: `📅 Plan My Week (Week ${weekNum})`,
              task_description: 'Set your Top 3 priorities for the week. Review your 90-day goal and decide what moves the needle most this week.',
              scheduled_date: format(planningDate, 'yyyy-MM-dd'),
              status: 'todo',
              priority: 'high',
              source: 'autopilot',
              is_system_generated: true,
              system_source: 'cycle_autopilot',
              template_key: `weekly_planning_${format(planningDate, 'yyyy-MM-dd')}_${cycleId}`,
              context_tags: ['planning', 'weekly'],
            });
            planningDate.setDate(planningDate.getDate() + 7);
            weekNum++;
          }
        }
        
        // Create Weekly Debrief Tasks
        if (weeklyDebriefDay && dayMap[weeklyDebriefDay] !== undefined) {
          const debriefDayNum = dayMap[weeklyDebriefDay];
          let debriefDate = new Date(cycleStartDate > today ? cycleStartDate : today);
          
          // Find next debrief day
          while (debriefDate.getDay() !== debriefDayNum) {
            debriefDate.setDate(debriefDate.getDate() + 1);
          }
          
          // Create task for each week in the cycle
          let weekNum = 1;
          while (debriefDate <= cycleEndDate) {
            weeklyTasksToCreate.push({
              user_id: user.id,
              cycle_id: cycleId,
              task_text: `📊 Weekly Review (Week ${weekNum})`,
              task_description: 'Reflect on your wins, challenges, and learnings. What worked? What didn\'t? What will you do differently next week?',
              scheduled_date: format(debriefDate, 'yyyy-MM-dd'),
              status: 'todo',
              priority: 'high',
              source: 'autopilot',
              is_system_generated: true,
              system_source: 'cycle_autopilot',
              template_key: `weekly_review_${format(debriefDate, 'yyyy-MM-dd')}_${cycleId}`,
              context_tags: ['review', 'weekly'],
            });
            debriefDate.setDate(debriefDate.getDate() + 7);
            weekNum++;
          }
        }
        
        // Insert all weekly tasks
        if (weeklyTasksToCreate.length > 0) {
          const { error: weeklyTaskError } = await supabase
            .from('tasks')
            .insert(weeklyTasksToCreate);
          
          if (weeklyTaskError) {
            console.error('Weekly task creation error:', weeklyTaskError);
            // Don't throw - this is optional, cycle should still save
          } else {
            console.log(`Created ${weeklyTasksToCreate.length} weekly planning/review tasks`);
          }
        }
      }

      // Create Recurring Tasks Project and Tasks (Step 8.5)
      try {
        const validRecurringTasks = recurringTasks.filter(t => t.title?.trim());
        if (validRecurringTasks.length > 0) {
          console.log('Creating recurring tasks project...');
          
          // Create "Recurring Tasks" project
          const { data: recurringProject, error: recurringProjectError } = await supabase
            .from('projects')
            .insert({
              user_id: user.id,
              cycle_id: cycleId,
              name: '🔁 Recurring Tasks',
              description: 'Automatically generated recurring tasks for your 90-day cycle',
              status: 'active'
            })
            .select()
            .single();
          
          if (recurringProjectError) {
            console.error('Recurring project creation error:', recurringProjectError);
          } else if (recurringProject) {
            console.log('Recurring project created:', recurringProject.id);
            
            // Generate tasks for each recurring task definition
            const recurringTasksToCreate: any[] = [];
            
            const cycleStart = new Date(startDate);
            const cycleEnd = new Date(endDate);
            
            const dayMap: Record<string, number> = {
              'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
              'Thursday': 4, 'Friday': 5, 'Saturday': 6
            };
            
            for (const recurringTask of validRecurringTasks) {
              const taskTitle = recurringTask.title.trim();
              const taskDescription = recurringTask.description?.trim() || null;
              
              // Generate tasks based on frequency
              if (recurringTask.category === 'daily') {
                // Create a task for every day in the cycle
                let currentDate = new Date(cycleStart);
                while (currentDate <= cycleEnd) {
                  recurringTasksToCreate.push({
                    user_id: user.id,
                    project_id: recurringProject.id,
                    cycle_id: cycleId,
                    task_text: taskTitle,
                    task_description: taskDescription,
                    scheduled_date: format(currentDate, 'yyyy-MM-dd'),
                    status: 'todo',
                    priority: 'medium',
                    category: 'recurring-daily',
                    context_tags: ['recurring', 'daily'],
                    is_system_generated: true,
                    system_source: 'cycle_recurring',
                  });
                  currentDate.setDate(currentDate.getDate() + 1);
                }
              }
              
              else if (recurringTask.category === 'weekly' && recurringTask.dayOfWeek) {
                const targetDay = dayMap[recurringTask.dayOfWeek];
                let currentDate = new Date(cycleStart);
                
                // Find first occurrence of target day
                while (currentDate.getDay() !== targetDay && currentDate <= cycleEnd) {
                  currentDate.setDate(currentDate.getDate() + 1);
                }
                
                // Create tasks every 7 days
                while (currentDate <= cycleEnd) {
                  recurringTasksToCreate.push({
                    user_id: user.id,
                    project_id: recurringProject.id,
                    cycle_id: cycleId,
                    task_text: taskTitle,
                    task_description: taskDescription,
                    scheduled_date: format(currentDate, 'yyyy-MM-dd'),
                    status: 'todo',
                    priority: 'medium',
                    category: 'recurring-weekly',
                    context_tags: ['recurring', 'weekly'],
                    is_system_generated: true,
                    system_source: 'cycle_recurring',
                  });
                  currentDate.setDate(currentDate.getDate() + 7);
                }
              }
              
              else if (recurringTask.category === 'biweekly' && recurringTask.dayOfWeek) {
                const targetDay = dayMap[recurringTask.dayOfWeek];
                let currentDate = new Date(cycleStart);
                
                // Find first occurrence
                while (currentDate.getDay() !== targetDay && currentDate <= cycleEnd) {
                  currentDate.setDate(currentDate.getDate() + 1);
                }
                
                // Create tasks every 14 days
                while (currentDate <= cycleEnd) {
                  recurringTasksToCreate.push({
                    user_id: user.id,
                    project_id: recurringProject.id,
                    cycle_id: cycleId,
                    task_text: taskTitle,
                    task_description: taskDescription,
                    scheduled_date: format(currentDate, 'yyyy-MM-dd'),
                    status: 'todo',
                    priority: 'medium',
                    category: 'recurring-biweekly',
                    context_tags: ['recurring', 'biweekly'],
                    is_system_generated: true,
                    system_source: 'cycle_recurring',
                  });
                  currentDate.setDate(currentDate.getDate() + 14);
                }
              }
              
              else if (recurringTask.category === 'monthly' && recurringTask.dayOfMonth) {
                let currentDate = new Date(cycleStart);
                currentDate.setDate(recurringTask.dayOfMonth);
                
                // If we're past that day in the start month, move to next month
                if (currentDate < cycleStart) {
                  currentDate.setMonth(currentDate.getMonth() + 1);
                }
                
                // Create tasks each month
                while (currentDate <= cycleEnd) {
                  recurringTasksToCreate.push({
                    user_id: user.id,
                    project_id: recurringProject.id,
                    cycle_id: cycleId,
                    task_text: taskTitle,
                    task_description: taskDescription,
                    scheduled_date: format(currentDate, 'yyyy-MM-dd'),
                    status: 'todo',
                    priority: 'high',
                    category: 'recurring-monthly',
                    context_tags: ['recurring', 'monthly'],
                    is_system_generated: true,
                    system_source: 'cycle_recurring',
                  });
                  currentDate.setMonth(currentDate.getMonth() + 1);
                }
              }
              
              else if (recurringTask.category === 'quarterly') {
                // Create 3 tasks: start, middle, and end of cycle
                const quarterlyDates = [
                  new Date(cycleStart),
                  new Date(cycleStart.getTime() + (cycleEnd.getTime() - cycleStart.getTime()) / 2),
                  new Date(cycleEnd.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week before end
                ];
                
                quarterlyDates.forEach((date, idx) => {
                  if (date <= cycleEnd) {
                    recurringTasksToCreate.push({
                      user_id: user.id,
                      project_id: recurringProject.id,
                      cycle_id: cycleId,
                      task_text: `${taskTitle} (${idx === 0 ? 'Start' : idx === 1 ? 'Mid-Cycle' : 'End'})`,
                      task_description: taskDescription,
                      scheduled_date: format(date, 'yyyy-MM-dd'),
                      status: 'todo',
                      priority: 'high',
                      category: 'recurring-quarterly',
                      context_tags: ['recurring', 'quarterly'],
                      is_system_generated: true,
                      system_source: 'cycle_recurring',
                    });
                  }
                });
              }
            }
            
            // Insert all recurring tasks
            if (recurringTasksToCreate.length > 0) {
              const { error: recurringTasksError } = await supabase
                .from('tasks')
                .insert(recurringTasksToCreate);
              
              if (recurringTasksError) {
                console.error('Recurring tasks creation error:', recurringTasksError);
              } else {
                console.log(`Created ${recurringTasksToCreate.length} recurring tasks`);
              }
            }
          }
        }
      } catch (recurringError) {
        console.error('Recurring tasks error:', recurringError);
        // Don't throw - this is optional, rest of cycle is fine
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
                free_transformation: freeTransformation || null,
                // Nurture posting schedule (like lead gen)
                nurture_posting_days: nurturePostingDays.length > 0 ? nurturePostingDays : null,
                nurture_posting_time: nurturePostingTime || null,
                nurture_batch_day: nurtureBatchDay && nurtureBatchDay !== 'none' ? nurtureBatchDay : null,
                nurture_batch_frequency: nurtureBatchFrequency || 'weekly',
                // Secondary nurture method and schedule
                secondary_nurture_method: secondaryNurtureMethod && secondaryNurtureMethod !== 'none' ? secondaryNurtureMethod : null,
                secondary_nurture_posting_days: secondaryNurturePostingDays.length > 0 ? secondaryNurturePostingDays : null,
                secondary_nurture_posting_time: secondaryNurturePostingTime || null,
                offers: offers.filter(o => o.name.trim()),
                // Limited time offers for promo task generation
                limited_offers: limitedOffers
                  .filter(lto => lto.name.trim() && lto.startDate && lto.endDate)
                  .map(lto => ({
                    name: lto.name,
                    startDate: lto.startDate,
                    endDate: lto.endDate,
                    promoType: lto.promoType,
                    discount: lto.discount,
                    notes: lto.notes,
                  })),
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

      // Create daily plans AND actual tasks for first 3 days (if tasks exist)
      if (cycleId) {
        try {
          const dailyPlans: any[] = [];
          const first3DaysTasks: any[] = [];
          
          // Day 1 (if date and tasks exist)
          if (day1Date && day1Top3.some(t => t?.trim())) {
            const day1DateStr = format(day1Date, 'yyyy-MM-dd');
            dailyPlans.push({
              user_id: user.id,
              cycle_id: cycleId,
              date: day1DateStr,
              top_3_today: day1Top3.filter(t => t?.trim()),
              thought: day1Why?.trim() || null,
            });
            // Create actual tasks for Day 1
            day1Top3.filter(t => t?.trim()).forEach((taskText, idx) => {
              first3DaysTasks.push({
                user_id: user.id,
                cycle_id: cycleId,
                task_text: taskText.trim(),
                scheduled_date: day1DateStr,
                planned_day: day1DateStr,
                priority_order: idx + 1,
                priority: 'high',
                status: 'todo',
                source: 'first_3_days',
                category: 'first-3-days',
                context_tags: ['first-3-days', 'day-1'],
                is_system_generated: true,
                system_source: 'cycle_first_3_days',
                template_key: `first3days_d1_${idx}_${cycleId}`,
              });
            });
          }
          
          // Day 2 (if date and tasks exist)
          if (day2Date && day2Top3.some(t => t?.trim())) {
            const day2DateStr = format(day2Date, 'yyyy-MM-dd');
            dailyPlans.push({
              user_id: user.id,
              cycle_id: cycleId,
              date: day2DateStr,
              top_3_today: day2Top3.filter(t => t?.trim()),
              thought: day2Why?.trim() || null,
            });
            // Create actual tasks for Day 2
            day2Top3.filter(t => t?.trim()).forEach((taskText, idx) => {
              first3DaysTasks.push({
                user_id: user.id,
                cycle_id: cycleId,
                task_text: taskText.trim(),
                scheduled_date: day2DateStr,
                planned_day: day2DateStr,
                priority_order: idx + 1,
                priority: 'high',
                status: 'todo',
                source: 'first_3_days',
                category: 'first-3-days',
                context_tags: ['first-3-days', 'day-2'],
                is_system_generated: true,
                system_source: 'cycle_first_3_days',
                template_key: `first3days_d2_${idx}_${cycleId}`,
              });
            });
          }
          
          // Day 3 (if date and tasks exist)
          if (day3Date && day3Top3.some(t => t?.trim())) {
            const day3DateStr = format(day3Date, 'yyyy-MM-dd');
            dailyPlans.push({
              user_id: user.id,
              cycle_id: cycleId,
              date: day3DateStr,
              top_3_today: day3Top3.filter(t => t?.trim()),
              thought: day3Why?.trim() || null,
            });
            // Create actual tasks for Day 3
            day3Top3.filter(t => t?.trim()).forEach((taskText, idx) => {
              first3DaysTasks.push({
                user_id: user.id,
                cycle_id: cycleId,
                task_text: taskText.trim(),
                scheduled_date: day3DateStr,
                planned_day: day3DateStr,
                priority_order: idx + 1,
                priority: 'high',
                status: 'todo',
                source: 'first_3_days',
                category: 'first-3-days',
                context_tags: ['first-3-days', 'day-3'],
                is_system_generated: true,
                system_source: 'cycle_first_3_days',
                template_key: `first3days_d3_${idx}_${cycleId}`,
              });
            });
          }
          
          // Insert daily plans (if any exist)
          if (dailyPlans.length > 0) {
            const { error: dailyError } = await supabase
              .from('daily_plans')
              .insert(dailyPlans);
            
            if (dailyError) {
              console.error('Daily plan creation error:', dailyError);
            } else {
              console.log(`Created ${dailyPlans.length} daily plans for first 3 days`);
            }
          }
          
          // Insert actual tasks (if any exist)
          if (first3DaysTasks.length > 0) {
            const { error: tasksError } = await supabase
              .from('tasks')
              .insert(first3DaysTasks);
            
            if (tasksError) {
              console.error('First 3 days tasks creation error:', tasksError);
            } else {
              console.log(`Created ${first3DaysTasks.length} tasks for first 3 days`);
            }
          }
        } catch (planError) {
          console.error('Error creating daily plans/tasks:', planError);
          // DON'T throw - this is optional, cycle is saved
        }
      }

      // Draft is already cleared in verification block above (line ~1346)
      // Only show success toast here

      toast({
        title: '🎉 You\'re Ready to Execute!',
        description: 'Your 90-day plan is complete and your first 3 days are loaded.',
        duration: 6000,
      });

      // Optional: Remind about accountability (only if they filled it in)
      if (whoWillHoldYouAccountable?.trim()) {
        setTimeout(() => {
          toast({
            title: '💪 Remember',
            description: `Text ${whoWillHoldYouAccountable} right now and tell them you'll check in on Day 3!`,
            duration: 8000,
          });
        }, 2000);
      }

      navigate('/dashboard');
    } catch (error: any) {
      console.error('❌ CYCLE SAVE ERROR:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      
      let userMessage = 'Unable to save your 90-day plan. ';
      
      if (error?.message?.includes('duplicate')) {
        userMessage += 'You may already have a cycle for these dates. Please check your Cycles page.';
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        userMessage += 'Please check your internet connection and try again.';
      } else if (error?.code === 'PGRST116') {
        userMessage += 'There was a data conflict. Please refresh and try again.';
      } else if (error?.message?.includes('JWT') || error?.message?.includes('token')) {
        userMessage += 'Your session has expired. Please refresh the page and log in again.';
      } else {
        userMessage += 'Please try again. If this persists, contact support.';
      }
      
      toast({
        title: 'Save Failed',
        description: userMessage,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setLoading(false);
    }
  };

const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // Helper to get current form data for export
  const getFormDataForExport = useCallback((): CycleFormData => {
    const effectiveNurtureMethod = nurtureMethod === 'other' ? nurtureMethodCustom : nurtureMethod;
    const effectiveSecondaryNurtureMethod = secondaryNurtureMethod === 'other' 
      ? secondaryNurtureMethodCustom 
      : (secondaryNurtureMethod === 'none' ? '' : secondaryNurtureMethod);
    
    return {
      startDate,
      endDate,
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
      keyMessage1,
      keyMessage2,
      keyMessage3,
      leadPlatform,
      leadContentType,
      leadFrequency,
      postingDays,
      postingTime,
      batchDay,
      batchFrequency,
      leadGenContentAudit,
      secondaryPlatforms,
      nurtureMethod: effectiveNurtureMethod,
      nurtureFrequency,
      freeTransformation,
      proofMethods,
      nurturePostingDays,
      nurturePostingTime,
      nurtureBatchDay,
      nurtureBatchFrequency,
      nurtureContentAudit,
      secondaryNurtureMethod: effectiveSecondaryNurtureMethod,
      secondaryNurturePostingDays,
      secondaryNurturePostingTime,
      nurturePlatforms,
      offers,
      limitedOffers,
      promotions: limitedOffers.map(lo => ({
        name: lo.name,
        offer: lo.offerRef || '',
        startDate: lo.startDate,
        endDate: lo.endDate,
        goal: lo.notes || '',
        launchType: lo.promoType,
        notes: lo.discount ? `Discount: ${lo.discount}` : '',
      })),
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
      thingsToRemember,
      weeklyPlanningDay,
      weeklyDebriefDay,
      officeHoursStart,
      officeHoursEnd,
      officeHoursDays,
      biggestFear,
      fearResponse: whatWillYouDoWhenFearHits,
      commitmentStatement,
      accountabilityPerson: whoWillHoldYouAccountable,
      day1Top3,
      day1Why,
      day2Top3,
      day2Why,
      day3Top3,
      day3Why,
      recurringTasks,
    };
  }, [
    startDate, endDate, goal, why, identity, feeling, discoverScore, nurtureScore, convertScore,
    biggestBottleneck, audienceTarget, audienceFrustration, signatureMessage, keyMessage1, keyMessage2, keyMessage3,
    leadPlatform, leadContentType, leadFrequency, postingDays, postingTime, batchDay, batchFrequency,
    leadGenContentAudit, secondaryPlatforms, nurtureMethod, nurtureMethodCustom, nurtureFrequency, freeTransformation,
    proofMethods, nurturePostingDays, nurturePostingTime, nurtureBatchDay, nurtureBatchFrequency,
    nurtureContentAudit, secondaryNurtureMethod, secondaryNurtureMethodCustom,
    secondaryNurturePostingDays, secondaryNurturePostingTime, nurturePlatforms,
    offers, limitedOffers, revenueGoal, pricePerSale, launchSchedule, monthPlans,
    metric1Name, metric1Start, metric2Name, metric2Start, metric3Name, metric3Start,
    thingsToRemember, weeklyPlanningDay, weeklyDebriefDay, officeHoursStart, officeHoursEnd,
    officeHoursDays, biggestFear, whatWillYouDoWhenFearHits, commitmentStatement,
    whoWillHoldYouAccountable, day1Top3, day1Why, day2Top3, day2Why, day3Top3, day3Why, recurringTasks
  ]);

// Helper to show export result with appropriate message
  const handleExportResult = (result: ExportResult, type: 'PDF' | 'JSON') => {
    if (result.success) {
      if (type === 'PDF') {
        toast({ 
          title: "✅ PDF Downloaded!", 
          description: result.message || "Check your Downloads folder. Your plan is ready!" 
        });
      } else {
        toast({ title: "✅ JSON downloaded!", description: "Your plan has been exported." });
      }
    } else {
      toast({ 
        title: "Export Issue", 
        description: result.message || "An error occurred. Don't worry - you can download your plan later from your saved cycle.",
        variant: "destructive",
        duration: 6000,
      });
    }
  };

  // Export from form state (pre-save) - now uses jsPDF
  const handleExportPDFFromState = async () => {
    setExporting(true);
    try {
      const formData = getFormDataForExport();
      const exportData = generateExportFromFormData(formData);
      const result = await exportCycleAsPDF(exportData);
      if (result.success) {
        // Show instructions modal after successful download
        setShowPDFInstructions(true);
        toast({ 
          title: "✅ PDF Downloaded!", 
          description: result.message || "Check your Downloads folder. Your plan is ready!" 
        });
      } else {
        toast({ 
          title: "Download Issue", 
          description: result.message || "Please try again. You can also download after saving your cycle.",
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("PDF export error:", error);
      toast({ 
        title: "Export failed", 
        description: "Don't worry - complete your setup and you can download from your saved cycle anytime.",
        variant: "destructive" 
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSONFromState = () => {
    setExporting(true);
    try {
      const formData = getFormDataForExport();
      const exportData = generateExportFromFormData(formData);
      const result = exportCycleAsJSON(exportData);
      handleExportResult(result, 'JSON');
    } catch (error) {
      console.error("JSON export error:", error);
      toast({ 
        title: "Export failed", 
        description: "Don't worry - complete your setup and you can download from your saved cycle anytime.",
        variant: "destructive" 
      });
    } finally {
      setExporting(false);
    }
  };

  // Export functions for PDF and JSON (from saved cycle)
  const handleExportPDF = async () => {
    if (!existingCycleId) {
      // Fall back to form state export
      await handleExportPDFFromState();
      return;
    }
    setExporting(true);
    try {
      const data = await loadCycleForExport(existingCycleId, supabase);
      if (data) {
        const result = await exportCycleAsPDF(data);
        handleExportResult(result, 'PDF');
      } else {
        toast({ title: "Export failed", description: "Could not load cycle data. Please refresh and try again.", variant: "destructive" });
      }
    } catch (error) {
      console.error("PDF export error:", error);
      toast({ title: "Export failed", description: "An error occurred. Please try again.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    if (!existingCycleId) {
      // Fall back to form state export
      handleExportJSONFromState();
      return;
    }
    setExporting(true);
    try {
      const data = await loadCycleForExport(existingCycleId, supabase);
      if (data) {
        const result = exportCycleAsJSON(data);
        handleExportResult(result, 'JSON');
      } else {
        toast({ title: "Export failed", description: "Could not load cycle data. Please refresh and try again.", variant: "destructive" });
      }
    } catch (error) {
      console.error("JSON export error:", error);
      toast({ title: "Export failed", description: "An error occurred. Please try again.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // Handler when user clicks Create Cycle - show export modal first for new cycles
  const handleCreateCycleClick = () => {
    if (!isEditMode) {
      setShowExportModal(true);
    } else {
      setShowAutopilotModal(true);
    }
  };

  // Continue after export modal
  const handleContinueToAutopilot = () => {
    setShowExportModal(false);
    setShowAutopilotModal(true);
  };

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
          {/* Save Status Indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {cloudSaveStatus === 'saving' || isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span>Saving...</span>
                </>
              ) : cloudSaveStatus === 'error' || syncError ? (
                <>
                  <CloudOff className="h-4 w-4 text-amber-500" />
                  <span className="text-amber-600">Saved locally - will sync when online</span>
                </>
              ) : cloudSaveStatus === 'saved' || lastServerSync ? (
                <>
                  <Cloud className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Draft saved to cloud</span>
                </>
              ) : lastSaved ? (
                <>
                  <Save className="h-4 w-4 text-muted-foreground" />
                  <span>Saved locally</span>
                </>
              ) : null}
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
          </div>
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

                <Separator className="my-4" />

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">3 Things Your Buyers Need to Hear Over and Over</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      What are the key messages you'll repeat in your content, emails, and sales conversations?
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="keyMessage1" className="text-sm">Message #1</Label>
                      <Input
                        id="keyMessage1"
                        value={keyMessage1}
                        onChange={(e) => setKeyMessage1(e.target.value)}
                        placeholder="e.g., You don't need more followers—you need better conversations"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="keyMessage2" className="text-sm">Message #2</Label>
                      <Input
                        id="keyMessage2"
                        value={keyMessage2}
                        onChange={(e) => setKeyMessage2(e.target.value)}
                        placeholder="e.g., Simple systems beat complicated funnels every time"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="keyMessage3" className="text-sm">Message #3</Label>
                      <Input
                        id="keyMessage3"
                        value={keyMessage3}
                        onChange={(e) => setKeyMessage3(e.target.value)}
                        placeholder="e.g., Consistency beats perfection—show up messy if you have to"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Lead Gen Strategy */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Ideal Buyer Alert */}
              <Alert className="border-primary/20 bg-primary/5">
                <Lightbulb className="h-4 w-4 text-primary" />
                <AlertTitle>Remember: Attract Your Ideal Buyers</AlertTitle>
                <AlertDescription>
                  Your content should attract people who will actually BUY your offers, not just consume free content. 
                  Think about what your ideal paying customers want to learn, see, and engage with.
                </AlertDescription>
              </Alert>

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
                      <div className="space-y-2">
                        <Label htmlFor="leadPlatform" className="text-xs text-muted-foreground">Platform</Label>
                        <Select value={leadPlatform} onValueChange={(v) => {
                          setLeadPlatform(v);
                          if (v !== 'other') setLeadPlatformCustom('');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Where will you show up?" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            {PLATFORM_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {leadPlatform === 'other' && (
                          <Input
                            value={leadPlatformCustom}
                            onChange={(e) => setLeadPlatformCustom(e.target.value)}
                            placeholder="Enter your platform..."
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="leadContentType" className="text-xs text-muted-foreground">Content Type</Label>
                        <Select value={leadContentType} onValueChange={(v) => {
                          setLeadContentType(v);
                          if (v !== 'other') setLeadContentTypeCustom('');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="What format?" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            {CONTENT_TYPE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {leadContentType === 'other' && (
                          <Input
                            value={leadContentTypeCustom}
                            onChange={(e) => setLeadContentTypeCustom(e.target.value)}
                            placeholder="Enter your content type..."
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="leadFrequency" className="text-xs text-muted-foreground">Posting Frequency</Label>
                        <Select value={leadFrequency} onValueChange={(v) => {
                          setLeadFrequency(v);
                          if (v !== 'other') setLeadFrequencyCustom('');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="How often?" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            {FREQUENCY_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {leadFrequency === 'other' && (
                          <Input
                            value={leadFrequencyCustom}
                            onChange={(e) => setLeadFrequencyCustom(e.target.value)}
                            placeholder="Enter your frequency..."
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="leadPlatformGoal" className="text-xs text-muted-foreground">Goal</Label>
                        <Select value={leadPlatformGoal} onValueChange={(v) => {
                          setLeadPlatformGoal(v);
                          if (v !== 'other') setLeadPlatformGoalCustom('');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Main goal?" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            {PLATFORM_GOALS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {leadPlatformGoal === 'other' && (
                          <Input
                            value={leadPlatformGoalCustom}
                            onChange={(e) => setLeadPlatformGoalCustom(e.target.value)}
                            placeholder="Enter your goal..."
                          />
                        )}
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
                                <SelectContent className="bg-background border shadow-lg z-50">
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
                                <SelectContent className="bg-background border shadow-lg z-50">
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
                                <SelectContent className="bg-background border shadow-lg z-50">
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
                                <SelectContent className="bg-background border shadow-lg z-50">
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
                            <SelectContent className="bg-background border shadow-lg z-50">
                              {TIME_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value || 'none'}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Batch Day */}
                        <div>
                          <Label className="text-sm font-medium">Batch day (optional)</Label>
                          <Select value={batchDay} onValueChange={setBatchDay}>
                            <SelectTrigger>
                              <SelectValue placeholder="No batch day" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border shadow-lg z-50">
                              <SelectItem value="none">None</SelectItem>
                              {DAYS_OF_WEEK.map(day => (
                                <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Batch Frequency */}
                        <div>
                          <Label className="text-sm font-medium">Batch frequency</Label>
                          <Select value={batchFrequency} onValueChange={setBatchFrequency}>
                            <SelectTrigger>
                              <SelectValue placeholder="How often?" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border shadow-lg z-50">
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">Bi-weekly (every 2 weeks)</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Example: "I batch content every Sunday for the week" = Sun + Weekly
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Content Audit */}
                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Content Audit</CardTitle>
                      <CardDescription>Before creating new content, what existing content can you repurpose?</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label htmlFor="leadGenContentAudit">Existing Content to Reuse</Label>
                        <Textarea
                          id="leadGenContentAudit"
                          value={leadGenContentAudit}
                          onChange={(e) => setLeadGenContentAudit(e.target.value)}
                          placeholder="Example: I have 20 Instagram Reels from last year I can repurpose, a blog post about X that performed well, email series about Y..."
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          List any content, posts, videos, or materials you can refresh instead of starting from scratch
                        </p>
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
                {/* Nurture Platforms - Dynamic Array */}
                {nurturePlatforms.map((platform, idx) => {
                  const methodLabel = platform.method === 'email' ? 'Email Newsletter' :
                    platform.method === 'community' ? 'Community' :
                    platform.method === 'youtube' ? 'YouTube' :
                    platform.method === 'podcast' ? 'Podcast' :
                    platform.method === 'webinar' ? 'Webinars/Workshops' :
                    platform.method === 'challenge' ? 'Free Challenges' :
                    platform.method === 'other' ? (platform.methodCustom || 'Custom') :
                    'Nurture Platform';
                    
                  return (
                    <Card 
                      key={idx} 
                      className={cn(
                        "relative",
                        platform.isPrimary 
                          ? "border-pink-500/30 bg-pink-500/5" 
                          : "border-purple-500/20 bg-purple-500/5"
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Heart className={cn(
                              "h-4 w-4",
                              platform.isPrimary ? "text-pink-600" : "text-purple-600"
                            )} />
                            <CardTitle className="text-base">
                              {platform.method ? methodLabel : `Nurture Platform ${idx + 1}`}
                            </CardTitle>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                platform.isPrimary 
                                  ? "bg-pink-500/10 text-pink-600 border-pink-500/30" 
                                  : "bg-purple-500/10 text-purple-600 border-purple-500/30"
                              )}
                            >
                              {platform.isPrimary ? 'PRIMARY' : 'SECONDARY'}
                            </Badge>
                          </div>
                          {nurturePlatforms.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => removeNurturePlatform(idx)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <CardDescription>
                          {platform.isPrimary 
                            ? "Your main nurture channel - this will auto-create tasks" 
                            : "Additional channel to reach people who prefer different formats"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Platform Selection */}
                        <div>
                          <Label className="text-sm font-medium">Nurture Method</Label>
                          <Select 
                            value={platform.method} 
                            onValueChange={(v) => {
                              updateNurturePlatform(idx, 'method', v);
                              if (v !== 'other') updateNurturePlatform(idx, 'methodCustom', '');
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="How will you nurture your audience?" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border shadow-lg z-50">
                              <SelectItem value="email">Email Newsletter</SelectItem>
                              <SelectItem value="community">Community (FB Group, Discord, etc.)</SelectItem>
                              <SelectItem value="youtube">YouTube</SelectItem>
                              <SelectItem value="podcast">Podcast</SelectItem>
                              <SelectItem value="webinar">Free Webinars/Workshops</SelectItem>
                              <SelectItem value="challenge">Free Challenges</SelectItem>
                              <SelectItem value="other">Other (custom)</SelectItem>
                            </SelectContent>
                          </Select>
                          {platform.method === 'other' && (
                            <Input
                              value={platform.methodCustom || ''}
                              onChange={(e) => updateNurturePlatform(idx, 'methodCustom', e.target.value)}
                              placeholder="Enter your nurture method..."
                              className="mt-2"
                            />
                          )}
                        </div>

                        {/* Schedule - shown when method is selected */}
                        {platform.method && platform.method !== 'none' && (
                          <>
                            <div>
                              <Label className="text-sm font-medium">Which days?</Label>
                              <p className="text-xs text-muted-foreground mb-2">Select the days you'll publish/send</p>
                              <div className="flex flex-wrap gap-2">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                  <Badge
                                    key={day}
                                    variant={platform.postingDays.includes(day) ? "default" : "outline"}
                                    className={cn(
                                      "cursor-pointer transition-colors",
                                      platform.postingDays.includes(day) && (platform.isPrimary 
                                        ? "bg-pink-600 hover:bg-pink-700" 
                                        : "bg-purple-600 hover:bg-purple-700")
                                    )}
                                    onClick={() => toggleNurturePlatformDay(idx, day)}
                                  >
                                    {day.slice(0, 3)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Posting/Send Time</Label>
                                <Select 
                                  value={platform.postingTime || 'none'} 
                                  onValueChange={(v) => updateNurturePlatform(idx, 'postingTime', v === 'none' ? '' : v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select time" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-lg z-50">
                                    {TIME_OPTIONS.map(opt => (
                                      <SelectItem key={opt.value || 'none'} value={opt.value || 'none'}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Batch Prep Day (optional)</Label>
                                <Select 
                                  value={platform.batchDay || 'none'} 
                                  onValueChange={(v) => updateNurturePlatform(idx, 'batchDay', v === 'none' ? '' : v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a day" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-lg z-50">
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="Sunday">Sunday</SelectItem>
                                    <SelectItem value="Monday">Monday</SelectItem>
                                    <SelectItem value="Tuesday">Tuesday</SelectItem>
                                    <SelectItem value="Wednesday">Wednesday</SelectItem>
                                    <SelectItem value="Thursday">Thursday</SelectItem>
                                    <SelectItem value="Friday">Friday</SelectItem>
                                    <SelectItem value="Saturday">Saturday</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            {platform.batchDay && platform.batchDay !== 'none' && (
                              <div className="space-y-2">
                                <Label>Batch Frequency</Label>
                                <Select 
                                  value={platform.batchFrequency || 'weekly'} 
                                  onValueChange={(v) => updateNurturePlatform(idx, 'batchFrequency', v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="How often?" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-lg z-50">
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {platform.postingDays.length > 0 && (
                              <div className={cn(
                                "p-3 rounded-lg border",
                                platform.isPrimary 
                                  ? "bg-pink-500/10 border-pink-500/20" 
                                  : "bg-purple-500/10 border-purple-500/20"
                              )}>
                                <p className={cn(
                                  "text-sm",
                                  platform.isPrimary 
                                    ? "text-pink-700 dark:text-pink-300" 
                                    : "text-purple-700 dark:text-purple-300"
                                )}>
                                  <strong>✨ {platform.postingDays.length * 13} tasks</strong> will be created ({platform.postingDays.length}x/week for 90 days)
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Add Nurture Platform Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addNurturePlatform}
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {nurturePlatforms.length === 0 ? 'Add Nurture Platform' : 'Add Another Nurture Platform'}
                </Button>

                {nurturePlatforms.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Add at least one nurture platform to build trust with your audience
                  </p>
                )}

                <Separator />

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
                              <SelectContent className="bg-background border shadow-lg z-50">
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
                              <SelectContent className="bg-background border shadow-lg z-50">
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


                {/* Nurture Content Audit */}
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Nurture Content Audit</CardTitle>
                    <CardDescription>What existing nurture content can you repurpose this quarter?</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Textarea
                        id="nurtureContentAudit"
                        value={nurtureContentAudit}
                        onChange={(e) => setNurtureContentAudit(e.target.value)}
                        placeholder="Example: Past email sequences, podcast episodes that can be repurposed, webinar recordings, lead magnets that need updating..."
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        List any existing emails, courses, workshops, or resources you can refresh instead of creating from scratch
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Offers */}
          {currentStep === 6 && (
            <div className="space-y-6">
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
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="always-open">Always Open</SelectItem>
                          <SelectItem value="monthly-launch">Monthly Launch</SelectItem>
                          <SelectItem value="quarterly-launch">Quarterly Launch</SelectItem>
                          <SelectItem value="by-application">By Application</SelectItem>
                          <SelectItem value="limited-spots">Limited Spots</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
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

            {/* Limited Time Offers Section */}
            <Card className="border-amber-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                  <CardTitle>Limited Time Offers & Promotions</CardTitle>
                </div>
                <CardDescription>
                  Plan your flash sales, launches, and special promotions for this quarter. We'll auto-create tasks for each one!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {limitedOffers.length === 0 ? (
                  <div className="text-center py-6 border border-dashed rounded-lg bg-muted/30">
                    <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground mb-3">No promotions planned yet</p>
                    <Button type="button" variant="outline" onClick={addLimitedOffer}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Promotion
                    </Button>
                  </div>
                ) : (
                  <>
                    {limitedOffers.map((lto, idx) => (
                      <div key={lto.id} className="p-4 rounded-lg border bg-amber-500/5 border-amber-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                            Promo {idx + 1}
                          </Badge>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeLimitedOffer(idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <Label className="text-sm">Promotion Name</Label>
                            <Input
                              value={lto.name}
                              onChange={(e) => updateLimitedOffer(idx, 'name', e.target.value)}
                              placeholder="e.g., Black Friday Sale, New Year Launch, Flash Sale Week 6"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Start Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !lto.startDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {lto.startDate ? format(parseISO(lto.startDate), 'PPP') : 'Pick a date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={lto.startDate ? parseISO(lto.startDate) : undefined}
                                  onSelect={(date) => date && updateLimitedOffer(idx, 'startDate', format(date, 'yyyy-MM-dd'))}
                                  disabled={(date) => date < startDate || date > endDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <Label className="text-sm">End Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !lto.endDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {lto.endDate ? format(parseISO(lto.endDate), 'PPP') : 'Pick a date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={lto.endDate ? parseISO(lto.endDate) : undefined}
                                  onSelect={(date) => date && updateLimitedOffer(idx, 'endDate', format(date, 'yyyy-MM-dd'))}
                                  disabled={(date) => date < (lto.startDate ? parseISO(lto.startDate) : startDate) || date > endDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label className="text-sm">Promotion Type</Label>
                            <Select 
                              value={lto.promoType} 
                              onValueChange={(v) => updateLimitedOffer(idx, 'promoType', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border shadow-lg z-50">
                                <SelectItem value="flash_sale">Flash Sale (2-3 days)</SelectItem>
                                <SelectItem value="week_promo">Week-long Promo</SelectItem>
                                <SelectItem value="launch_sequence">Launch Sequence (2 weeks)</SelectItem>
                                <SelectItem value="webinar_cart">Webinar + Open Cart</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm">Discount/Offer (optional)</Label>
                            <Input
                              value={lto.discount || ''}
                              onChange={(e) => updateLimitedOffer(idx, 'discount', e.target.value)}
                              placeholder="e.g., 20% off, $500 bonus, Free coaching call"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm">Notes (optional)</Label>
                          <Input
                            value={lto.notes || ''}
                            onChange={(e) => updateLimitedOffer(idx, 'notes', e.target.value)}
                            placeholder="Any additional details about this promotion..."
                          />
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addLimitedOffer} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Another Promotion
                    </Button>
                  </>
                )}
                
                {limitedOffers.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-700">
                      <strong>✨ {limitedOffers.filter(l => l.name.trim() && l.startDate && l.endDate).length} promotion(s)</strong> will be added to your planner with prep, launch, and follow-up tasks.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
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

              {/* Weekly Routines */}
              <Card className="border-blue-500/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                    <CardTitle>Weekly Routines</CardTitle>
                  </div>
                  <CardDescription>Set up your weekly planning and review schedule</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="weeklyPlanningDay">When do you plan your week?</Label>
                      <Select value={weeklyPlanningDay} onValueChange={setWeeklyPlanningDay}>
                        <SelectTrigger id="weeklyPlanningDay">
                          <SelectValue placeholder="Select a day" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="Sunday">Sunday</SelectItem>
                          <SelectItem value="Monday">Monday</SelectItem>
                          <SelectItem value="Tuesday">Tuesday</SelectItem>
                          <SelectItem value="Wednesday">Wednesday</SelectItem>
                          <SelectItem value="Thursday">Thursday</SelectItem>
                          <SelectItem value="Friday">Friday</SelectItem>
                          <SelectItem value="Saturday">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Recommended: Sunday evening or Monday morning</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weeklyDebriefDay">When do you review your week?</Label>
                      <Select value={weeklyDebriefDay} onValueChange={setWeeklyDebriefDay}>
                        <SelectTrigger id="weeklyDebriefDay">
                          <SelectValue placeholder="Select a day" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="Sunday">Sunday</SelectItem>
                          <SelectItem value="Monday">Monday</SelectItem>
                          <SelectItem value="Tuesday">Tuesday</SelectItem>
                          <SelectItem value="Wednesday">Wednesday</SelectItem>
                          <SelectItem value="Thursday">Thursday</SelectItem>
                          <SelectItem value="Friday">Friday</SelectItem>
                          <SelectItem value="Saturday">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Recommended: Friday afternoon or Sunday evening</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Office Hours (Optional)</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">When are you typically working? This will help organize your schedule.</p>
                    
                    <div className="space-y-3">
                      <Label>Which days do you work?</Label>
                      <div className="flex flex-wrap gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                          <Badge
                            key={day}
                            variant={officeHoursDays.includes(day) ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer transition-colors",
                              officeHoursDays.includes(day) && "bg-blue-600 hover:bg-blue-700"
                            )}
                            onClick={() => {
                              if (officeHoursDays.includes(day)) {
                                setOfficeHoursDays(officeHoursDays.filter(d => d !== day));
                              } else {
                                setOfficeHoursDays([...officeHoursDays, day]);
                              }
                            }}
                          >
                            {day.slice(0, 3)}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="officeHoursStart">Start Time</Label>
                        <Input
                          id="officeHoursStart"
                          type="time"
                          value={officeHoursStart}
                          onChange={(e) => setOfficeHoursStart(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="officeHoursEnd">End Time</Label>
                        <Input
                          id="officeHoursEnd"
                          type="time"
                          value={officeHoursEnd}
                          onChange={(e) => setOfficeHoursEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Office hours will be saved but not yet highlighted in the planner. This feature is coming soon!
                    </p>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
                    <Checkbox
                      id="autoCreateWeeklyTasks"
                      checked={autoCreateWeeklyTasks}
                      onCheckedChange={(checked) => setAutoCreateWeeklyTasks(!!checked)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="autoCreateWeeklyTasks" className="text-sm font-medium cursor-pointer">
                        Automatically create weekly planning and review tasks
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        We'll create recurring tasks for your weekly planning and debrief on the days you selected above. You can always edit or delete these later.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 8.5: Recurring Tasks */}
              <Card className="border-blue-500/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <CardTitle>Recurring Tasks</CardTitle>
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">OPTIONAL</Badge>
                  </div>
                  <CardDescription>
                    Set up tasks that repeat automatically (daily check-ins, weekly reports, monthly reviews, etc.)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-blue-500/20 bg-blue-500/5">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <AlertTitle>How Recurring Tasks Work</AlertTitle>
                    <AlertDescription>
                      These tasks will be automatically created in a "🔁 Recurring Tasks" project for your 90-day cycle. Perfect for regular check-ins, reports, reviews, or any task that repeats on a schedule.
                    </AlertDescription>
                  </Alert>

                  {/* Recurring Tasks List */}
                  <div className="space-y-4">
                    {recurringTasks.map((task, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-4">
                            {/* Task Title */}
                            <div className="space-y-2">
                              <Label htmlFor={`recurring-title-${index}`}>Task Name</Label>
                              <Input
                                id={`recurring-title-${index}`}
                                value={task.title || ''}
                                onChange={(e) => {
                                  const updated = [...recurringTasks];
                                  updated[index] = { ...updated[index], title: e.target.value };
                                  setRecurringTasks(updated);
                                }}
                                placeholder="e.g., Weekly team check-in, Monthly revenue review"
                              />
                            </div>

                            {/* Frequency */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`recurring-freq-${index}`}>Frequency</Label>
                                <Select
                                  value={task.category || 'weekly'}
                                  onValueChange={(value) => {
                                    const updated = [...recurringTasks];
                                    updated[index] = { ...updated[index], category: value as RecurringTaskDefinition['category'] };
                                    setRecurringTasks(updated);
                                  }}
                                >
                                  <SelectTrigger id={`recurring-freq-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-lg z-50">
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="biweekly">Bi-weekly (every 2 weeks)</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="quarterly">Quarterly (3x in 90 days)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Time (optional) */}
                              <div className="space-y-2">
                                <Label htmlFor={`recurring-time-${index}`}>Time (Optional)</Label>
                                <Input
                                  id={`recurring-time-${index}`}
                                  type="time"
                                  value={task.time || ''}
                                  onChange={(e) => {
                                    const updated = [...recurringTasks];
                                    updated[index] = { ...updated[index], time: e.target.value };
                                    setRecurringTasks(updated);
                                  }}
                                />
                              </div>
                            </div>

                            {/* Day Selection (for weekly/biweekly) */}
                            {(task.category === 'weekly' || task.category === 'biweekly') && (
                              <div className="space-y-2">
                                <Label>Which day?</Label>
                                <Select
                                  value={task.dayOfWeek || ''}
                                  onValueChange={(value) => {
                                    const updated = [...recurringTasks];
                                    updated[index] = { ...updated[index], dayOfWeek: value };
                                    setRecurringTasks(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a day" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-lg z-50">
                                    <SelectItem value="Monday">Monday</SelectItem>
                                    <SelectItem value="Tuesday">Tuesday</SelectItem>
                                    <SelectItem value="Wednesday">Wednesday</SelectItem>
                                    <SelectItem value="Thursday">Thursday</SelectItem>
                                    <SelectItem value="Friday">Friday</SelectItem>
                                    <SelectItem value="Saturday">Saturday</SelectItem>
                                    <SelectItem value="Sunday">Sunday</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Day of Month Selection (for monthly) */}
                            {task.category === 'monthly' && (
                              <div className="space-y-2">
                                <Label>Which day of the month?</Label>
                                <Select
                                  value={task.dayOfMonth?.toString() || ''}
                                  onValueChange={(value) => {
                                    const updated = [...recurringTasks];
                                    updated[index] = { ...updated[index], dayOfMonth: parseInt(value) };
                                    setRecurringTasks(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a day" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background border shadow-lg z-50 max-h-60">
                                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                      <SelectItem key={day} value={day.toString()}>
                                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Description (optional) */}
                            <div className="space-y-2">
                              <Label htmlFor={`recurring-desc-${index}`}>Description (Optional)</Label>
                              <Textarea
                                id={`recurring-desc-${index}`}
                                value={task.description || ''}
                                onChange={(e) => {
                                  const updated = [...recurringTasks];
                                  updated[index] = { ...updated[index], description: e.target.value };
                                  setRecurringTasks(updated);
                                }}
                                placeholder="Add any notes or details about this task"
                                rows={2}
                              />
                            </div>
                          </div>

                          {/* Remove Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setRecurringTasks(recurringTasks.filter((_, i) => i !== index));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Preview */}
                        <div className="bg-muted rounded p-3 text-xs text-muted-foreground">
                          <strong>Preview:</strong> "{task.title || 'Untitled task'}" will repeat{' '}
                          {task.category === 'daily' && 'every day (90 tasks)'}
                          {task.category === 'weekly' && `every ${task.dayOfWeek || 'week'} (~13 tasks)`}
                          {task.category === 'biweekly' && `every 2 weeks on ${task.dayOfWeek || 'selected day'} (~6 tasks)`}
                          {task.category === 'monthly' && `on the ${task.dayOfMonth || 'selected'} of each month (~3 tasks)`}
                          {task.category === 'quarterly' && 'at start, middle, and end of cycle (3 tasks)'}
                          {task.time && ` at ${task.time}`}
                        </div>
                      </div>
                    ))}

                    {/* Add New Recurring Task Button */}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRecurringTasks([...recurringTasks, {
                          title: '',
                          category: 'weekly',
                          dayOfWeek: 'Monday',
                          time: '',
                          description: ''
                        }]);
                      }}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Recurring Task
                    </Button>
                  </div>

                  {/* Examples Box */}
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>Examples of Recurring Tasks</AlertTitle>
                    <AlertDescription>
                      <ul className="text-sm space-y-1 mt-2 ml-4">
                        <li>• <strong>Daily:</strong> Morning planning session, End of day review</li>
                        <li>• <strong>Weekly:</strong> Team check-in, Content batch day, Analytics review</li>
                        <li>• <strong>Bi-weekly:</strong> 1-on-1 meetings, Progress review</li>
                        <li>• <strong>Monthly:</strong> Financial review, Strategy session, Metrics analysis</li>
                        <li>• <strong>Quarterly:</strong> Major milestone review, Quarterly planning</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
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

          {/* Step 9: Mindset & First 3 Days */}
          {currentStep === 9 && (
            <div className="space-y-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Your First 3 Days</h2>
                <p className="text-muted-foreground text-lg">
                  The plan is done. Now it's time to execute. Let's get you started strong.
                </p>
              </div>

              <Alert className="border-primary/20 bg-primary/5">
                <Zap className="h-4 w-4 text-primary" />
                <AlertTitle>Why the first 3 days matter</AlertTitle>
                <AlertDescription>
                  Most people quit in the first week—not because the plan is wrong, but because their brain offers reasons to stop. 
                  Planning your first 3 days AND your response to resistance sets you up to push through.
                </AlertDescription>
              </Alert>

              <Separator />

              {/* MINDSET SECTION */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                  <h3 className="text-2xl font-semibold">Mindset Check</h3>
                </div>

                {/* Biggest Fear */}
                <div className="space-y-3">
                  <Label htmlFor="biggestFear" className="text-base font-semibold">
                    What's your biggest fear about starting this plan?
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Be honest. Is it fear of failure? Fear of looking stupid? Fear it won't work? Name it.
                  </p>
                  <Textarea
                    id="biggestFear"
                    value={biggestFear}
                    onChange={(e) => setBiggestFear(e.target.value)}
                    placeholder="Example: I'm afraid I'll start strong and then quit like I always do..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Response to Fear */}
                <div className="space-y-3">
                  <Label htmlFor="whatWillYouDoWhenFearHits" className="text-base font-semibold">
                    What will you do when that fear shows up?
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    It WILL show up. Probably Day 2 or 3. What's your plan? How will you talk back to it?
                  </p>
                  <Textarea
                    id="whatWillYouDoWhenFearHits"
                    value={whatWillYouDoWhenFearHits}
                    onChange={(e) => setWhatWillYouDoWhenFearHits(e.target.value)}
                    placeholder="Example: I'll remind myself that I've committed to 3 days, not 90. I can do anything for 3 days. I'll text my accountability partner and tell them I'm struggling but I'm not quitting..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Commitment Statement */}
                <div className="space-y-3">
                  <Label htmlFor="commitmentStatement" className="text-base font-semibold">
                    Complete this sentence: "I commit to showing up for the next 3 days by..."
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    What does "showing up" look like for you? Be specific.
                  </p>
                  <Textarea
                    id="commitmentStatement"
                    value={commitmentStatement}
                    onChange={(e) => setCommitmentStatement(e.target.value)}
                    placeholder="Example: ...posting on Instagram even if it's not perfect, sending my newsletter even if I think it's not good enough, and doing my Top 3 before I check email..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Accountability */}
                <div className="space-y-3">
                  <Label htmlFor="whoWillHoldYouAccountable" className="text-base font-semibold">
                    Who will check in with you after these 3 days?
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Name a real person. Not "myself" or "the universe." Who will you text on Day 3 to say "I did it"?
                  </p>
                  <Input
                    id="whoWillHoldYouAccountable"
                    value={whoWillHoldYouAccountable}
                    onChange={(e) => setWhoWillHoldYouAccountable(e.target.value)}
                    placeholder="Example: My mastermind buddy Sarah, My business coach, My partner..."
                  />
                  <p className="text-xs text-muted-foreground italic">
                    Pro tip: Text them RIGHT NOW and tell them you're planning your first 3 days and you'll check in with them on Day 3.
                  </p>
                </div>
              </div>

              <Separator className="my-8" />

              {/* TASKS SECTION */}
              <div className="space-y-8">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="h-6 w-6 text-primary" />
                  <h3 className="text-2xl font-semibold">Your First 3 Days of Action</h3>
                </div>

                <Alert className="border-amber-500/20 bg-amber-500/5">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle>Keep it simple</AlertTitle>
                  <AlertDescription>
                    Don't overthink this. Pick 3 things per day that move you forward. They don't have to be perfect. They just have to be done.
                  </AlertDescription>
                </Alert>

                {/* DAY 1 */}
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 space-y-4 border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                        1
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold">Day 1</h4>
                        <p className="text-sm text-muted-foreground">Build momentum</p>
                      </div>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !day1Date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {day1Date ? format(day1Date, 'EEE, MMM d') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={day1Date}
                          onSelect={setDay1Date}
                          disabled={(date) => date < startDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-3">
                    <Label className="font-semibold">Your Top 3 Tasks</Label>
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {index + 1}
                        </div>
                        <Input
                          value={day1Top3[index] || ''}
                          onChange={(e) => {
                            const updated = [...day1Top3];
                            updated[index] = e.target.value;
                            setDay1Top3(updated);
                          }}
                          placeholder={
                            index === 0 ? "The most important thing..." :
                            index === 1 ? "The second priority..." :
                            "One more task to build momentum..."
                          }
                          className="bg-background"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-3">
                    <Label htmlFor="day1Why" className="font-semibold">
                      Why are these 3 tasks important for Day 1?
                    </Label>
                    <Textarea
                      id="day1Why"
                      value={day1Why}
                      onChange={(e) => setDay1Why(e.target.value)}
                      placeholder="Example: These 3 tasks get me started without overwhelming me. They prove I can follow through..."
                      rows={2}
                      className="bg-background resize-none"
                    />
                  </div>
                </div>

                {/* DAY 2 */}
                <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-xl p-6 space-y-4 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg">
                        2
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold">Day 2</h4>
                        <p className="text-sm text-muted-foreground">Keep the momentum</p>
                      </div>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !day2Date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {day2Date ? format(day2Date, 'EEE, MMM d') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={day2Date}
                          onSelect={setDay2Date}
                          disabled={(date) => date < startDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-3">
                    <Label className="font-semibold">Your Top 3 Tasks</Label>
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {index + 1}
                        </div>
                        <Input
                          value={day2Top3[index] || ''}
                          onChange={(e) => {
                            const updated = [...day2Top3];
                            updated[index] = e.target.value;
                            setDay2Top3(updated);
                          }}
                          placeholder={
                            index === 0 ? "Build on Day 1..." :
                            index === 1 ? "Keep moving forward..." :
                            "One more win for the day..."
                          }
                          className="bg-background"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-3">
                    <Label htmlFor="day2Why" className="font-semibold">
                      Why are these 3 tasks important for Day 2?
                    </Label>
                    <Textarea
                      id="day2Why"
                      value={day2Why}
                      onChange={(e) => setDay2Why(e.target.value)}
                      placeholder="Example: Day 2 is when doubt creeps in. These tasks keep me focused and prove I'm serious..."
                      rows={2}
                      className="bg-background resize-none"
                    />
                  </div>
                </div>

                {/* DAY 3 */}
                <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-xl p-6 space-y-4 border border-green-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-lg">
                        3
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold">Day 3</h4>
                        <p className="text-sm text-muted-foreground">Finish strong</p>
                      </div>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !day3Date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {day3Date ? format(day3Date, 'EEE, MMM d') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={day3Date}
                          onSelect={setDay3Date}
                          disabled={(date) => date < startDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-3">
                    <Label className="font-semibold">Your Top 3 Tasks</Label>
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {index + 1}
                        </div>
                        <Input
                          value={day3Top3[index] || ''}
                          onChange={(e) => {
                            const updated = [...day3Top3];
                            updated[index] = e.target.value;
                            setDay3Top3(updated);
                          }}
                          placeholder={
                            index === 0 ? "Complete the first 3 days strong..." :
                            index === 1 ? "Set yourself up for Week 2..." :
                            "End with a win..."
                          }
                          className="bg-background"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-3">
                    <Label htmlFor="day3Why" className="font-semibold">
                      Why are these 3 tasks important for Day 3?
                    </Label>
                    <Textarea
                      id="day3Why"
                      value={day3Why}
                      onChange={(e) => setDay3Why(e.target.value)}
                      placeholder="Example: Finishing 3 days proves I can do this. It gives me momentum for the rest of the week..."
                      rows={2}
                      className="bg-background resize-none"
                    />
                  </div>
                </div>
              </div>

              <Alert className="border-green-500/20 bg-green-500/5 mt-8">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>You are Ready</AlertTitle>
                <AlertDescription>
                  Once you complete this, your first 3 days will be loaded into your Daily Plan. 
                  All you have to do is show up. Remember: You are not committing to 90 days right now. 
                  You are committing to 3 days. You can do anything for 3 days.
                </AlertDescription>
              </Alert>

{/* Export Section - PROMINENT at the end of Step 9 */}
              <div className="mt-8 p-1 rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-pink-500">
                <Card className="border-0 bg-background">
                  <CardHeader className="pb-3 text-center">
                    <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                      <Download className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">
                      📥 Download Your 90-Day Plan
                    </CardTitle>
                    <CardDescription className="text-base">
                      Save a copy before continuing! Share with your accountability partner or keep for reference.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        size="lg"
                        className="flex-1 gap-2 h-14 text-lg bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                        onClick={handleExportPDF}
                        disabled={exporting}
                      >
                        <FileText className="h-6 w-6" />
                        {exporting ? "Downloading..." : "Download PDF"}
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="flex-1 gap-2 h-14 text-lg border-2"
                        onClick={handleExportJSON}
                        disabled={exporting}
                      >
                        <FileJson className="h-6 w-6" />
                        {exporting ? "Preparing..." : "Download JSON"}
                      </Button>
                    </div>
                    
                    {/* Success info */}
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm">
                      <p className="font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Works on all devices - mobile, tablet & desktop!
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Your PDF will download directly to your device. No popups needed.
                      </p>
                    </div>

                    {/* Backup info */}
                    <p className="text-xs text-center text-muted-foreground">
                      You can also download later from <strong>Cycle Management</strong> after saving.
                    </p>
                  </CardContent>
                </Card>
              </div>
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
              <Button onClick={handleCreateCycleClick} disabled={loading || !goal}>
                {loading ? 'Saving...' : isEditMode ? 'Update Plan →' : 'Create Cycle →'}
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

{/* Export Modal - appears before autopilot for new cycles */}
        <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Download className="h-6 w-6 text-primary" />
                Save Your 90-Day Plan
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                Before adding to your planner, download a copy of your complete business plan to reference anytime.
              </DialogDescription>
            </DialogHeader>
            
<div className="space-y-4 py-4">
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-4">
                  Your PDF will include your goal, strategy, offers, metrics, weekly routines, and first 3 days action plan.
                </p>
                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={handleExportPDFFromState}
                    disabled={exporting}
                  >
                    <FileText className="h-5 w-5" />
                    {exporting ? "Downloading..." : "Download PDF"}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full gap-2"
                    onClick={handleExportJSONFromState}
                    disabled={exporting}
                  >
                    <FileJson className="h-5 w-5" />
                    {exporting ? "Preparing..." : "Download JSON"}
                  </Button>
                </div>
              </div>

              {/* Success info */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Works on all devices!
                </p>
                <p className="text-muted-foreground mt-1">
                  Downloads directly - no popups needed. Works on mobile, tablet & desktop.
                </p>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                <strong>No worries!</strong> You can always download your plan later from the Cycle Management page.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button 
                variant="ghost" 
                onClick={handleContinueToAutopilot}
                className="gap-2"
              >
                Skip and Add to Planner
                <ChevronRight className="h-4 w-4" />
              </Button>
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
          nurturePostingDaysCount={nurturePostingDays.length}
          offersCount={offers.filter(o => o.name.trim()).length}
          customProjectsCount={projects.filter(p => p.trim()).length}
        />

        {/* PDF Instructions Modal */}
        <PDFInstructionsModal
          open={showPDFInstructions}
          onClose={() => setShowPDFInstructions(false)}
          onDownload={async () => {
            await handleExportPDFFromState();
          }}
          cycleTitle={goal || '90-Day Business Plan'}
          isDownloading={exporting}
        />
      </div>
    </Layout>
  );
}
