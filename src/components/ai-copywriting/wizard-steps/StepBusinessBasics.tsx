import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { BrandWizardData, INDUSTRY_OPTIONS } from '@/types/aiCopywriting';
import { useAPIKey } from '@/hooks/useAICopywriting';
import { AlertTriangle, Sparkles, Clock, Key, FileText, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StepBusinessBasicsProps {
  data: BrandWizardData;
  onChange: (updates: Partial<BrandWizardData>) => void;
}

export function StepBusinessBasics({ data, onChange }: StepBusinessBasicsProps) {
  const { data: apiKey } = useAPIKey();
  const navigate = useNavigate();
  const hasValidKey = apiKey?.key_status === 'valid';
  return (
    <div className="space-y-6">
      {/* Intro Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Setting Up AI Copywriting</h4>
              <p className="text-xs text-muted-foreground">
                This wizard teaches AI your unique brand voice. Once complete, you'll generate 
                high-converting copy that sounds exactly like you.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ~10 minutes
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Writing samples needed
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Product info helpful
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key Warning */}
      {!hasValidKey && (
        <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-300">API Key Required</AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-400">
            <p className="mb-2">
              You'll need an OpenAI API key to analyze your voice and generate copy.
            </p>
            <button
              onClick={() => navigate('/ai-copywriting/settings')}
              className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium hover:underline"
            >
              <Key className="h-3 w-3" />
              Add your API key in Settings →
            </button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="businessName">Business Name *</Label>
        <Input
          id="businessName"
          value={data.businessName}
          onChange={(e) => onChange({ businessName: e.target.value })}
          placeholder="Your business or brand name"
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="industry">Industry</Label>
        <Select value={data.industry} onValueChange={(v) => onChange({ industry: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select your industry" />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRY_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatYouSell">What do you sell?</Label>
        <Textarea
          id="whatYouSell"
          value={data.whatYouSell}
          onChange={(e) => onChange({ whatYouSell: e.target.value })}
          placeholder="Online courses for entrepreneurs"
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground text-right">
          {data.whatYouSell.length}/200
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetCustomer">Who buys it?</Label>
        <Textarea
          id="targetCustomer"
          value={data.targetCustomer}
          onChange={(e) => onChange({ targetCustomer: e.target.value })}
          placeholder="Busy moms starting online businesses"
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground text-right">
          {data.targetCustomer.length}/200
        </p>
      </div>
    </div>
  );
}
