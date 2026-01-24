import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LaunchWizardData, PreLaunchTaskConfig } from '@/types/launch';
import { 
  ShoppingCart, 
  CreditCard, 
  Users, 
  Gift, 
  MessageSquareQuote, 
  FileText, 
  Video, 
  Image as ImageIcon, 
  Mail, 
  Zap, 
  BarChart3, 
  Presentation, 
  Share2, 
  Megaphone, 
  FileDown 
} from 'lucide-react';

interface LaunchPreLaunchTasksProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

export function LaunchPreLaunchTasks({ data, onChange }: LaunchPreLaunchTasksProps) {
  const tasks = data.preLaunchTasks;

  const updateTask = (key: keyof PreLaunchTaskConfig, value: unknown) => {
    onChange({
      preLaunchTasks: {
        ...tasks,
        [key]: value,
      },
    });
  };

  const updateEmailType = (key: keyof PreLaunchTaskConfig['emailTypes'], checked: boolean) => {
    onChange({
      preLaunchTasks: {
        ...tasks,
        emailTypes: {
          ...tasks.emailTypes,
          [key]: checked,
        },
      },
    });
  };

  // Count selected tasks (only boolean fields)
  const selectedCount = Object.entries(tasks).filter(
    ([key, value]) => typeof value === 'boolean' && value === true && key !== 'emailTypes'
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ✅ Pre-Launch Task Checklist
        </CardTitle>
        <CardDescription>
          Everything you need to complete BEFORE cart opens. We'll create scheduled tasks for each item you select.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sales-assets" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="sales-assets">Sales Assets</TabsTrigger>
            <TabsTrigger value="social-proof">Social Proof</TabsTrigger>
            <TabsTrigger value="tech-setup">Tech Setup</TabsTrigger>
            <TabsTrigger value="content">Content Prep</TabsTrigger>
          </TabsList>

          {/* SALES ASSETS TAB */}
          <TabsContent value="sales-assets" className="space-y-4">
            <TaskItem
              icon={<ShoppingCart className="h-5 w-5" />}
              checked={tasks.salesPage}
              onCheckedChange={(checked) => updateTask('salesPage', checked)}
              title="Build Sales Page"
              description="Complete sales page with transformation, benefits, pricing, FAQs"
            >
              {tasks.salesPage && (
                <div className="mt-3 space-y-2">
                  <Label className="text-xs">Deadline:</Label>
                  <Input
                    type="date"
                    value={tasks.salesPageDeadline}
                    onChange={(e) => updateTask('salesPageDeadline', e.target.value)}
                  />
                </div>
              )}
            </TaskItem>

            <TaskItem
              icon={<CreditCard className="h-5 w-5" />}
              checked={tasks.checkoutFlow}
              onCheckedChange={(checked) => updateTask('checkoutFlow', checked)}
              title="Set Up Checkout & Payment Processing"
              description="Test purchase flow, payment gateway, confirmation emails"
            />

            <TaskItem
              icon={<Users className="h-5 w-5" />}
              checked={tasks.waitlistPage}
              onCheckedChange={(checked) => updateTask('waitlistPage', checked)}
              title="Create Waitlist Landing Page"
              description="Capture early interest, build anticipation"
            >
              {tasks.waitlistPage && (
                <div className="mt-3 space-y-2">
                  <Label className="text-xs">Waitlist open date:</Label>
                  <Input
                    type="date"
                    value={tasks.waitlistDeadline}
                    onChange={(e) => updateTask('waitlistDeadline', e.target.value)}
                  />
                </div>
              )}
            </TaskItem>

            <TaskItem
              icon={<Zap className="h-5 w-5" />}
              checked={tasks.orderBumpUpsell}
              onCheckedChange={(checked) => updateTask('orderBumpUpsell', checked)}
              title="Order Bump / Upsell Offer"
              description="Increase average order value with strategic upsell"
            />

            <TaskItem
              icon={<Gift className="h-5 w-5" />}
              checked={tasks.bonuses}
              onCheckedChange={(checked) => updateTask('bonuses', checked)}
              title="Create Launch Bonuses"
              description="Fast-action bonuses, templates, swipe files, etc."
            />
          </TabsContent>

          {/* SOCIAL PROOF TAB */}
          <TabsContent value="social-proof" className="space-y-4">
            <TaskItem
              icon={<MessageSquareQuote className="h-5 w-5" />}
              checked={tasks.testimonials}
              onCheckedChange={(checked) => updateTask('testimonials', checked)}
              title="Collect Testimonials"
              description="Reach out to past clients, beta testers, case study participants"
            >
              {tasks.testimonials && (
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">How many do you need?</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 10"
                      value={tasks.testimonialGoal || ''}
                      onChange={(e) => updateTask('testimonialGoal', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Outreach deadline:</Label>
                    <Input
                      type="date"
                      value={tasks.testimonialDeadline}
                      onChange={(e) => updateTask('testimonialDeadline', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </TaskItem>

            <TaskItem
              icon={<FileText className="h-5 w-5" />}
              checked={tasks.caseStudies}
              onCheckedChange={(checked) => updateTask('caseStudies', checked)}
              title="Create 2-3 Case Studies"
              description="Detailed success stories with before/after, numbers, quotes"
            />

            <TaskItem
              icon={<Video className="h-5 w-5" />}
              checked={tasks.videoTestimonials}
              onCheckedChange={(checked) => updateTask('videoTestimonials', checked)}
              title="Record Video Testimonials"
              description="Video proof converts 2-3x higher than text testimonials"
            >
              {tasks.videoTestimonials && (
                <Alert className="mt-3 bg-secondary/50 border-secondary">
                  <Video className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-sm text-foreground">Conversion Boost</AlertTitle>
                  <AlertDescription className="text-xs text-muted-foreground">
                    Adding 3-5 video testimonials to your sales page can increase conversions by 20-30%
                  </AlertDescription>
                </Alert>
              )}
            </TaskItem>

            <TaskItem
              icon={<ImageIcon className="h-5 w-5" />}
              checked={tasks.resultsScreenshots}
              onCheckedChange={(checked) => updateTask('resultsScreenshots', checked)}
              title="Gather Results Screenshots"
              description="Numbers, messages from happy clients, transformations"
            />
          </TabsContent>

          {/* TECH SETUP TAB */}
          <TabsContent value="tech-setup" className="space-y-4">
            <TaskItem
              icon={<Mail className="h-5 w-5" />}
              checked={tasks.emailSequences}
              onCheckedChange={(checked) => updateTask('emailSequences', checked)}
              title="Write Email Sequences"
              description="Pre-launch warm-up + launch week + cart close + post-purchase"
            >
              {tasks.emailSequences && (
                <div className="mt-3 space-y-2 ml-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={tasks.emailTypes.warmUp}
                      onCheckedChange={(checked) => updateEmailType('warmUp', !!checked)}
                    />
                    <Label className="text-xs cursor-pointer">Warm-up sequence (3-7 emails)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={tasks.emailTypes.launch}
                      onCheckedChange={(checked) => updateEmailType('launch', !!checked)}
                    />
                    <Label className="text-xs cursor-pointer">Launch week (5-7 emails)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={tasks.emailTypes.cartClose}
                      onCheckedChange={(checked) => updateEmailType('cartClose', !!checked)}
                    />
                    <Label className="text-xs cursor-pointer">Cart close urgency (3 emails)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={tasks.emailTypes.postPurchase}
                      onCheckedChange={(checked) => updateEmailType('postPurchase', !!checked)}
                    />
                    <Label className="text-xs cursor-pointer">Post-purchase onboarding</Label>
                  </div>
                </div>
              )}
            </TaskItem>

            <TaskItem
              icon={<Zap className="h-5 w-5" />}
              checked={tasks.automations}
              onCheckedChange={(checked) => updateTask('automations', checked)}
              title="Set Up Automations"
              description="Tags, sequences, abandoned cart, purchase follow-up"
            />

            <TaskItem
              icon={<BarChart3 className="h-5 w-5" />}
              checked={tasks.trackingPixels}
              onCheckedChange={(checked) => updateTask('trackingPixels', checked)}
              title="Install Tracking & Analytics"
              description="FB Pixel, Google Analytics, conversion tracking"
            />
          </TabsContent>

          {/* CONTENT PREP TAB */}
          <TabsContent value="content" className="space-y-4">
            <TaskItem
              icon={<Presentation className="h-5 w-5" />}
              checked={tasks.liveEventContent}
              onCheckedChange={(checked) => updateTask('liveEventContent', checked)}
              title="Prepare Live Event Content"
              description="Slides, demos, handouts, pitch for webinar/workshop/masterclass"
            >
              {tasks.liveEventContent && (
                <div className="mt-3 space-y-2">
                  <Label className="text-xs">Event type:</Label>
                  <Select
                    value={tasks.liveEventType}
                    onValueChange={(value) => updateTask('liveEventType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="webinar">Webinar</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="masterclass">Masterclass</SelectItem>
                      <SelectItem value="challenge">Challenge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TaskItem>

            <TaskItem
              icon={<Share2 className="h-5 w-5" />}
              checked={tasks.socialContent}
              onCheckedChange={(checked) => updateTask('socialContent', checked)}
              title="Batch Create Social Content"
              description="Posts, graphics, reels/shorts for entire launch period"
            />

            <TaskItem
              icon={<Megaphone className="h-5 w-5" />}
              checked={tasks.adCreatives}
              onCheckedChange={(checked) => updateTask('adCreatives', checked)}
              title="Design Ad Creatives"
              description="If running paid ads - images, copy variations, A/B tests"
            />

            <TaskItem
              icon={<FileDown className="h-5 w-5" />}
              checked={tasks.leadMagnet}
              onCheckedChange={(checked) => updateTask('leadMagnet', checked)}
              title="Create Lead Magnet"
              description="Free valuable resource to grow list before launch"
            />
          </TabsContent>
        </Tabs>

        {/* Summary Footer */}
        <div className="mt-6 p-4 bg-primary/5 rounded-lg flex items-center justify-between">
          <div>
            <p className="font-semibold flex items-center gap-2">
              📊 Tasks Selected: <Badge variant="secondary">{selectedCount}</Badge>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              We'll create a task for each item with recommended deadlines based on your runway timeline.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component for consistent task item rendering
interface TaskItemProps {
  icon: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
  description: string;
  children?: React.ReactNode;
}

function TaskItem({ icon, checked, onCheckedChange, title, description, children }: TaskItemProps) {
  return (
    <div
      className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
        checked ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
      }`}
      onClick={() => onCheckedChange(!checked)}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(c) => onCheckedChange(!!c)}
        className="mt-1 pointer-events-none"
      />
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1" onClick={(e) => e.stopPropagation()}>
        <Label className="font-medium cursor-pointer" onClick={() => onCheckedChange(!checked)}>
          {title}
        </Label>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {children}
      </div>
    </div>
  );
}
