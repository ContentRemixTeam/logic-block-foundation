import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, Users, Sparkles, Zap, Plus, X, Check, Lightbulb, Briefcase } from 'lucide-react';
import { MoneyMomentumData, Offer, formatCurrency } from '@/types/moneyMomentum';

interface StepWhatYouHaveProps {
  data: MoneyMomentumData;
  onChange: (updates: Partial<MoneyMomentumData>) => void;
}

export function StepWhatYouHave({ data, onChange }: StepWhatYouHaveProps) {
  const [newOfferName, setNewOfferName] = useState('');
  const [newOfferPrice, setNewOfferPrice] = useState('');

  const handleAddOffer = () => {
    if (!newOfferName.trim()) return;
    
    const newOffer: Offer = {
      name: newOfferName.trim(),
      price: newOfferPrice ? Number(newOfferPrice) : 0,
    };
    
    onChange({ currentOffers: [...data.currentOffers, newOffer] });
    setNewOfferName('');
    setNewOfferPrice('');
  };

  const handleRemoveOffer = (index: number) => {
    onChange({ 
      currentOffers: data.currentOffers.filter((_, i) => i !== index) 
    });
  };

  const warmLeadOptions = [
    { value: 'email-list', label: 'Email list' },
    { value: 'dms-social', label: 'DMs/social media' },
    { value: 'discovery-calls', label: 'Past discovery calls' },
    { value: 'webinar', label: 'Webinar attendees' },
    { value: 'freebie', label: 'Freebie downloaders' },
  ];

  const handleWarmLeadSourceChange = (source: string, checked: boolean) => {
    if (checked) {
      onChange({ warmLeadsSources: [...data.warmLeadsSources, source] });
    } else {
      onChange({ warmLeadsSources: data.warmLeadsSources.filter(s => s !== source) });
    }
  };

  const pastOfferOptions = [
    { value: 'upsell', label: 'Upsell to higher tier' },
    { value: 'new-offer', label: 'New offer' },
    { value: 'extension', label: 'Extension/renewal' },
    { value: 'referral', label: 'Referral incentive' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Find your low-hanging fruit.</h2>
        <p className="text-muted-foreground">
          No new product creation. Use what you already have.
        </p>
      </div>

      {/* Section 1: How You Sell - Offer Type Gate */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">How Do You Sell?</CardTitle>
          </div>
          <CardDescription>
            This helps us tailor the brainstorming to your business model.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={data.offerType || ''}
            onValueChange={(value) => onChange({ offerType: value as MoneyMomentumData['offerType'] })}
            className="space-y-3"
          >
            <Label 
              htmlFor="offer-type-defined"
              className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem value="defined" id="offer-type-defined" />
              <div>
                <div className="font-medium">I have defined offers/packages</div>
                <p className="text-sm text-muted-foreground">Courses, programs, coaching packages, templates, memberships</p>
              </div>
            </Label>
            <Label 
              htmlFor="offer-type-custom"
              className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem value="custom-project" id="offer-type-custom" />
              <div>
                <div className="font-medium">I sell custom/project-based work</div>
                <p className="text-sm text-muted-foreground">Consulting, freelance, agency work, done-for-you services</p>
              </div>
            </Label>
            <Label 
              htmlFor="offer-type-figuring"
              className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem value="figuring-out" id="offer-type-figuring" />
              <div>
                <div className="font-medium">I'm still figuring out my offers</div>
                <p className="text-sm text-muted-foreground">New business, pivoting, or testing different approaches</p>
              </div>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Section 2: Offers Based on Type */}
      {data.offerType === 'defined' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Your Current Offers</CardTitle>
            </div>
            <CardDescription>
              What are you currently selling or have sold before?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing offers */}
            {data.currentOffers.length > 0 && (
              <div className="space-y-2">
                {data.currentOffers.map((offer, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-accent/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{offer.name}</span>
                      {offer.price > 0 && (
                        <span className="text-muted-foreground">
                          - {formatCurrency(offer.price)}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOffer(index)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new offer */}
            <div className="flex gap-2 flex-col sm:flex-row">
              <Input
                placeholder="Offer name"
                value={newOfferName}
                onChange={(e) => setNewOfferName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddOffer()}
                className="flex-1"
              />
              <div className="relative w-full sm:w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="Price"
                  value={newOfferPrice}
                  onChange={(e) => setNewOfferPrice(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddOffer()}
                  className="pl-7"
                />
              </div>
              <Button onClick={handleAddOffer} disabled={!newOfferName.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {data.currentOffers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Add your offers to help brainstorm revenue ideas
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Custom/Project-based input */}
      {data.offerType === 'custom-project' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Your Project-Based Work</CardTitle>
            </div>
            <CardDescription>
              Help us understand your typical projects so we can brainstorm effectively.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="block mb-2">Typical project price range</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={data.projectPriceMin || ''}
                      onChange={(e) => onChange({ projectPriceMin: e.target.value ? Number(e.target.value) : null })}
                      className="pl-7"
                    />
                  </div>
                  <span className="text-muted-foreground">to</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={data.projectPriceMax || ''}
                      onChange={(e) => onChange({ projectPriceMax: e.target.value ? Number(e.target.value) : null })}
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="project-capacity" className="block mb-2">
                  How many projects can you take this month?
                </Label>
                <Input
                  id="project-capacity"
                  type="number"
                  min="0"
                  placeholder="e.g., 2"
                  value={data.projectCapacity || ''}
                  onChange={(e) => onChange({ projectCapacity: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Still figuring out offers */}
      {data.offerType === 'figuring-out' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Let's Find Your Quick Win</CardTitle>
            </div>
            <CardDescription>
              That's okay! This sprint can help you test ideas fast.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-primary/5 border-primary/20">
              <Lightbulb className="h-5 w-5 text-primary" />
              <AlertDescription>
                Don't overthink this. What's ONE thing you could offer THIS WEEK, even if imperfect?
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="quick-offer-idea" className="block mb-2">
                My quick offer idea:
              </Label>
              <Textarea
                id="quick-offer-idea"
                placeholder="e.g., 1-hour consulting call for $150, a quick audit for $200, a templates bundle..."
                value={data.quickOfferIdea}
                onChange={(e) => onChange({ quickOfferIdea: e.target.value })}
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {data.quickOfferIdea.length}/200
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Past Customers - Gate Question */}
      {data.offerType && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Past Customers</CardTitle>
            </div>
            <CardDescription>
              Who might buy from you again?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Gate Question */}
            <RadioGroup
              value={data.hasPastCustomers === null ? '' : data.hasPastCustomers ? 'yes' : 'no'}
              onValueChange={(value) => onChange({ 
                hasPastCustomers: value === 'yes',
                // Reset past customer data if they say no
                ...(value === 'no' ? { 
                  pastCustomersCount: 0, 
                  pastCustomersComfortable: 0,
                  pastCustomersOfferType: '',
                  pastCustomersDetails: ''
                } : {})
              })}
              className="space-y-3"
            >
              <Label 
                htmlFor="past-customers-yes"
                className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
              >
                <RadioGroupItem value="yes" id="past-customers-yes" />
                <div>
                  <div className="font-medium">Yes - I have past customers I could reach out to</div>
                </div>
              </Label>
              <Label 
                htmlFor="past-customers-no"
                className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
              >
                <RadioGroupItem value="no" id="past-customers-no" />
                <div>
                  <div className="font-medium">No - I'm too new / My past customers aren't relevant</div>
                  <p className="text-sm text-muted-foreground">New business, pivoting to new niche, or B2B with few customers</p>
                </div>
              </Label>
            </RadioGroup>

            {/* Past customer details - only if they have past customers */}
            {data.hasPastCustomers === true && (
              <div className="pt-4 border-t space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="total-customers" className="block mb-2">
                      How many past customers total?
                    </Label>
                    <Input
                      id="total-customers"
                      type="number"
                      min="0"
                      value={data.pastCustomersCount || ''}
                      onChange={(e) => onChange({ 
                        pastCustomersCount: e.target.value ? Number(e.target.value) : 0 
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="comfortable-customers" className="block mb-2">
                      How many would you reach out to?
                    </Label>
                    <Input
                      id="comfortable-customers"
                      type="number"
                      min="0"
                      max={data.pastCustomersCount || 999}
                      value={data.pastCustomersComfortable || ''}
                      onChange={(e) => onChange({ 
                        pastCustomersComfortable: Math.min(
                          e.target.value ? Number(e.target.value) : 0,
                          data.pastCustomersCount || 999
                        )
                      })}
                    />
                  </div>
                </div>

                {data.pastCustomersComfortable > 0 && (
                  <>
                    <div>
                      <Label className="block mb-3">What would you offer them?</Label>
                      <RadioGroup
                        value={data.pastCustomersOfferType}
                        onValueChange={(value) => onChange({ pastCustomersOfferType: value })}
                        className="grid gap-2 sm:grid-cols-2"
                      >
                        {pastOfferOptions.map(({ value, label }) => (
                          <Label 
                            key={value}
                            htmlFor={`offer-type-${value}`}
                            className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors min-h-[48px] [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
                          >
                            <RadioGroupItem value={value} id={`offer-type-${value}`} />
                            <span>{label}</span>
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>

                    <div>
                      <Label htmlFor="past-customer-details" className="block mb-2">
                        Details:
                      </Label>
                      <Input
                        id="past-customer-details"
                        placeholder="e.g., VIP upgrade to premium coaching"
                        value={data.pastCustomersDetails}
                        onChange={(e) => onChange({ pastCustomersDetails: e.target.value })}
                        maxLength={200}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Supportive message if no past customers */}
            {data.hasPastCustomers === false && (
              <Alert className="bg-primary/5 border-primary/20">
                <Check className="h-5 w-5 text-primary" />
                <AlertDescription>
                  No problem - we'll focus on other revenue sources like warm leads and new sales.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 4: Warm Leads - Gate Question */}
      {data.offerType && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Warm Leads</CardTitle>
            </div>
            <CardDescription>
              People who know you but haven't bought yet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Gate Question */}
            <RadioGroup
              value={data.hasWarmLeads === null ? '' : data.hasWarmLeads ? 'yes' : 'no'}
              onValueChange={(value) => onChange({ 
                hasWarmLeads: value === 'yes',
                // Reset warm leads data if they say no
                ...(value === 'no' ? { 
                  warmLeadsSources: [], 
                  warmLeadsOther: '',
                  warmLeadsCount: 0
                } : {})
              })}
              className="space-y-3"
            >
              <Label 
                htmlFor="warm-leads-yes"
                className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
              >
                <RadioGroupItem value="yes" id="warm-leads-yes" />
                <div>
                  <div className="font-medium">Yes - I have warm leads I can reach out to</div>
                  <p className="text-sm text-muted-foreground">Email list, social followers, past inquiries, discovery calls</p>
                </div>
              </Label>
              <Label 
                htmlFor="warm-leads-no"
                className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
              >
                <RadioGroupItem value="no" id="warm-leads-no" />
                <div>
                  <div className="font-medium">No - I don't have warm leads right now</div>
                  <p className="text-sm text-muted-foreground">Just starting out or haven't built an audience yet</p>
                </div>
              </Label>
            </RadioGroup>

            {/* Warm lead details - only if they have warm leads */}
            {data.hasWarmLeads === true && (
              <div className="pt-4 border-t space-y-4">
                <div>
                  <Label className="block mb-3">Where are these leads?</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {warmLeadOptions.map(({ value, label }) => (
                      <Label 
                        key={value}
                        htmlFor={`warm-lead-${value}`}
                        className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors min-h-[48px]"
                      >
                        <Checkbox
                          id={`warm-lead-${value}`}
                          checked={data.warmLeadsSources.includes(value)}
                          onCheckedChange={(checked) => handleWarmLeadSourceChange(value, checked as boolean)}
                        />
                        <span>{label}</span>
                      </Label>
                    ))}
                    <Label 
                      htmlFor="warm-lead-other"
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors min-h-[48px]"
                    >
                      <Checkbox
                        id="warm-lead-other"
                        checked={data.warmLeadsSources.includes('other')}
                        onCheckedChange={(checked) => handleWarmLeadSourceChange('other', checked as boolean)}
                      />
                      <Input
                        placeholder="Other..."
                        value={data.warmLeadsOther}
                        onChange={(e) => onChange({ warmLeadsOther: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        className="border-0 p-0 h-auto focus-visible:ring-0"
                      />
                    </Label>
                  </div>
                </div>

                <div className="max-w-xs">
                  <Label htmlFor="warm-leads-count" className="block mb-2">
                    Estimated number:
                  </Label>
                  <Input
                    id="warm-leads-count"
                    type="number"
                    min="0"
                    value={data.warmLeadsCount || ''}
                    onChange={(e) => onChange({ 
                      warmLeadsCount: e.target.value ? Number(e.target.value) : 0 
                    })}
                  />
                </div>
              </div>
            )}

            {/* Supportive message if no warm leads */}
            {data.hasWarmLeads === false && (
              <Alert className="bg-primary/5 border-primary/20">
                <Check className="h-5 w-5 text-primary" />
                <AlertDescription>
                  That's okay - we'll help you build lead sources through your sprint actions. 
                  Focus on direct outreach and quick wins.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 5: Fastest Sale */}
      {data.offerType && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Fastest Sale This Week</CardTitle>
            </div>
            <CardDescription>
              What's the fastest thing you could sell THIS WEEK?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-3 space-y-1">
              <p>Think:</p>
              <ul className="list-disc list-inside pl-2">
                <li>Something you've sold before</li>
                <li>No new creation needed</li>
                <li>Can deliver immediately</li>
                <li>Someone's already asked about it</li>
              </ul>
            </div>
            <Textarea
              placeholder="e.g., 1-hour strategy call for $200 - had 3 people ask about this last month"
              value={data.fastestSale}
              onChange={(e) => onChange({ fastestSale: e.target.value })}
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {data.fastestSale.length}/200
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
