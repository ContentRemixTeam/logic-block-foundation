// Wizard AI Generator Modal
// Reusable modal component for generating AI copy within wizards

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, 
  Mail, 
  RefreshCw, 
  Calendar, 
  Archive, 
  Check, 
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { 
  WizardContentType, 
  GeneratedEmail, 
  GeneratedSequence,
  WizardAIGeneratorState,
  EMAIL_SEQUENCE_CONFIGS 
} from '@/types/wizardAIGeneration';
import { useWizardAIGeneration } from '@/hooks/useWizardAIGeneration';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WizardAIGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wizardType: 'launch-v2' | 'summit' | 'content-planner';
  wizardData: Record<string, unknown>;
  contentType: WizardContentType;
  onScheduleToCalendar?: (emails: GeneratedEmail[], baseDate: string) => void;
  onSaveToVault?: (emails: GeneratedEmail[]) => void;
  baseDate?: string; // For scheduling (e.g., cart opens date)
  campaignId?: string;
}

// AI Detection Score Badge
function AIScoreBadge({ score }: { score: number }) {
  const getVariant = () => {
    if (score <= 2) return 'success';
    if (score <= 3) return 'secondary';
    if (score <= 5) return 'warning';
    return 'destructive';
  };
  
  const getLabel = () => {
    if (score <= 2) return 'Excellent';
    if (score <= 3) return 'Good';
    if (score <= 5) return 'Moderate';
    return 'High Risk';
  };
  
  const colorClass = {
    success: 'bg-green-100 text-green-800 border-green-300',
    secondary: 'bg-blue-100 text-blue-800 border-blue-300',
    warning: 'bg-amber-100 text-amber-800 border-amber-300',
    destructive: 'bg-red-100 text-red-800 border-red-300',
  }[getVariant()];
  
  return (
    <Badge variant="outline" className={cn('text-xs', colorClass)}>
      AI: {score}/10 ({getLabel()})
    </Badge>
  );
}

// Generation Progress Component
function GenerationProgress({ state }: { state: WizardAIGeneratorState }) {
  const passLabels = {
    draft: 'Generating draft...',
    critique: 'Analyzing for improvements...',
    rewrite: 'Rewriting with feedback...',
    detection: 'Refining for natural voice...',
    complete: 'Complete!',
  };
  
  return (
    <div className="space-y-4 py-8">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Sparkles className="h-12 w-12 text-primary animate-pulse" />
            <div className="absolute inset-0 h-12 w-12 border-4 border-primary/20 rounded-full animate-spin border-t-primary" />
          </div>
        </div>
        <h3 className="text-lg font-semibold">{passLabels[state.currentPass]}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Multi-pass generation ensures high-quality, human-sounding copy
        </p>
      </div>
      
      <Progress value={state.progress} className="w-full" />
      
      <div className="flex justify-between text-xs text-muted-foreground px-4">
        <span className={state.currentPass === 'draft' ? 'text-primary font-medium' : ''}>Draft</span>
        <span className={state.currentPass === 'critique' ? 'text-primary font-medium' : ''}>Critique</span>
        <span className={state.currentPass === 'rewrite' ? 'text-primary font-medium' : ''}>Rewrite</span>
        <span className={state.currentPass === 'detection' ? 'text-primary font-medium' : ''}>Refine</span>
        <span className={state.currentPass === 'complete' ? 'text-primary font-medium' : ''}>Done</span>
      </div>
    </div>
  );
}

// Single Email Preview Card
function EmailPreviewCard({ 
  email, 
  onRegenerate,
  isRegenerating
}: { 
  email: GeneratedEmail;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    const fullContent = `Subject: ${email.subjectLines[0]}\n\n${email.body}`;
    await navigator.clipboard.writeText(fullContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Card className="border">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              Email {email.sequencePosition}
            </CardTitle>
            <Badge variant="outline" className="text-xs">Day {email.sendDay}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <AIScoreBadge score={email.aiDetectionScore} />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {email.purpose && (
          <p className="text-xs text-muted-foreground mt-1">{email.purpose}</p>
        )}
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0 px-4 pb-4 space-y-3">
          {/* Subject Lines */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject Lines</p>
            <div className="space-y-1">
              {email.subjectLines.map((subject, i) => (
                <div key={i} className="text-sm p-2 bg-muted/50 rounded border flex items-center gap-2">
                  <span className="text-muted-foreground text-xs w-4">{i + 1}.</span>
                  <span>{subject}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Email Body */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Body</p>
            <div className="text-sm p-3 bg-muted/30 rounded border whitespace-pre-wrap max-h-64 overflow-y-auto">
              {email.body}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex-1"
            >
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            {onRegenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="flex-1"
              >
                <RefreshCw className={cn('h-4 w-4 mr-1', isRegenerating && 'animate-spin')} />
                Regenerate
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Main Modal Component
export function WizardAIGeneratorModal({
  open,
  onOpenChange,
  wizardType,
  wizardData,
  contentType,
  onScheduleToCalendar,
  onSaveToVault,
  baseDate,
  campaignId,
}: WizardAIGeneratorModalProps) {
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  
  const {
    isGenerating,
    currentPass,
    progress,
    result,
    error,
    isAvailable,
    missingRequirements,
    generateEmailSequence,
    scheduleToCalendar,
    saveSequenceToVault,
    reset,
    buildContext,
  } = useWizardAIGeneration({ wizardType, wizardData });
  
  const sequenceConfig = EMAIL_SEQUENCE_CONFIGS[contentType];
  const context = buildContext();
  
  // Handle generation
  const handleGenerate = async () => {
    try {
      await generateEmailSequence(contentType);
      // Select all emails by default
      if (result?.emailSequence) {
        setSelectedEmails(new Set(result.emailSequence.emails.map(e => e.id)));
      }
    } catch (err) {
      toast.error('Generation failed. Please try again.');
    }
  };
  
  // Handle schedule to calendar
  const handleSchedule = async () => {
    if (!result?.emailSequence || !baseDate) {
      toast.error('No emails to schedule or missing base date');
      return;
    }
    
    try {
      await scheduleToCalendar(
        result.emailSequence.emails.filter(e => selectedEmails.has(e.id)),
        baseDate,
        campaignId
      );
      toast.success('Emails scheduled to Editorial Calendar!');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to schedule emails');
    }
  };
  
  // Handle save to vault
  const handleSaveToVault = async () => {
    if (!result?.emailSequence) {
      toast.error('No emails to save');
      return;
    }
    
    try {
      await saveSequenceToVault(
        result.emailSequence.emails.filter(e => selectedEmails.has(e.id))
      );
      toast.success('Emails saved to Content Vault!');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to save emails');
    }
  };
  
  // Toggle email selection
  const toggleEmail = (emailId: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
  };
  
  // Reset when modal closes
  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
      setSelectedEmails(new Set());
    }
    onOpenChange(open);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate {sequenceConfig?.label || 'Email Sequence'} with AI
          </DialogTitle>
          <DialogDescription>
            AI will generate high-quality, conversion-focused emails in your brand voice.
          </DialogDescription>
        </DialogHeader>
        
        {/* Not Available State */}
        {!isAvailable && (
          <div className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">AI Generation Not Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              To generate copy with AI, you need:
            </p>
            <ul className="text-sm text-left max-w-xs mx-auto space-y-2">
              {missingRequirements.apiKey && (
                <li className="flex items-center gap-2">
                  <span className="text-red-500">✗</span> OpenAI API Key configured
                </li>
              )}
              {missingRequirements.brandProfile && (
                <li className="flex items-center gap-2">
                  <span className="text-red-500">✗</span> Brand profile completed
                </li>
              )}
            </ul>
            <Button variant="outline" className="mt-4" asChild>
              <a href="/ai-copywriting">Go to AI Copywriting Settings</a>
            </Button>
          </div>
        )}
        
        {/* Generation Progress */}
        {isAvailable && isGenerating && (
          <GenerationProgress state={{ isGenerating, currentPass, progress, result, error }} />
        )}
        
        {/* Pre-Generation: Context Preview */}
        {isAvailable && !isGenerating && !result && (
          <div className="space-y-4 py-4">
            <Card className="bg-muted/30">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Generation Context</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm space-y-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Business:</span>
                  <span>{context.businessName || 'Not set'}</span>
                  <span className="text-muted-foreground">Offer:</span>
                  <span>{context.offerName || 'Not set'}</span>
                  <span className="text-muted-foreground">Price:</span>
                  <span>{context.pricePoint ? `$${context.pricePoint}` : 'Not set'}</span>
                  <span className="text-muted-foreground">Ideal Customer:</span>
                  <span className="truncate">{context.idealCustomer || 'Not set'}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex gap-3">
                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      Ready to generate {sequenceConfig?.emailCount || 5} emails
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Uses 4-pass generation: Draft → Critique → Rewrite → AI Detection Refinement
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-center pt-2">
              <Button onClick={handleGenerate} size="lg" className="px-8">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate {sequenceConfig?.label || 'Sequence'}
              </Button>
            </div>
          </div>
        )}
        
        {/* Results View */}
        {isAvailable && !isGenerating && result?.emailSequence && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Results Header */}
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {result.emailSequence.totalEmails} emails generated
                </span>
                <AIScoreBadge score={result.emailSequence.avgAiScore} />
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round(result.generationTimeMs / 1000)}s • {result.tokensUsed.toLocaleString()} tokens
              </div>
            </div>
            
            {/* Email List */}
            <ScrollArea className="flex-1 py-4">
              <div className="space-y-3 pr-4">
                {result.emailSequence.emails.map((email) => (
                  <EmailPreviewCard
                    key={email.id}
                    email={email}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Generation Failed</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleGenerate}>Try Again</Button>
          </div>
        )}
        
        {/* Footer Actions */}
        {result?.emailSequence && (
          <DialogFooter className="border-t pt-4">
            <div className="flex gap-2 w-full justify-between">
              <Button variant="outline" onClick={handleGenerate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate All
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSaveToVault}>
                  <Archive className="h-4 w-4 mr-2" />
                  Save to Vault
                </Button>
                {baseDate && (
                  <Button onClick={handleSchedule}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Add to Calendar
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
