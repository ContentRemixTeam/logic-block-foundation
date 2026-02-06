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
import { BrandWizardData, INDUSTRY_OPTIONS } from '@/types/aiCopywriting';

interface StepBusinessBasicsProps {
  data: BrandWizardData;
  onChange: (updates: Partial<BrandWizardData>) => void;
}

export function StepBusinessBasics({ data, onChange }: StepBusinessBasicsProps) {
  return (
    <div className="space-y-6">
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
