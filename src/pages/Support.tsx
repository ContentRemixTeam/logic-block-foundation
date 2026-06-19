import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { QuickStartGuide } from '@/components/support/QuickStartGuide';
import { FAQSection } from '@/components/support/FAQSection';
import { FeaturesGuide } from '@/components/support/FeaturesGuide';
import { FeatureRequestSection } from '@/components/support/FeatureRequestSection';
import { ReportIssueSection } from '@/components/support/ReportIssueSection';
import { Rocket, HelpCircle, Lightbulb, AlertTriangle, PlayCircle, BookOpen, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTour } from '@/hooks/useTour';

export default function Support() {
  const [activeTab, setActiveTab] = useState('quick-start');
  const { restartTour } = useTour();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Support Center</h1>
            <p className="text-muted-foreground">
              We're here to help you get the most out of your 90-Day Planner journey.
            </p>
          </div>
          <Button
            onClick={restartTour}
            variant="outline"
            className="flex items-center gap-2 shrink-0"
          >
            <PlayCircle className="h-4 w-4" />
            Start Walkthrough
          </Button>
        </div>

        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">Google Drive planner storage</h2>
                <p className="text-sm text-muted-foreground">
                  Setup steps, what the planner Sheet does, and troubleshooting if Google backup needs attention.
                </p>
              </div>
            </div>
            <Button variant="outline" asChild className="shrink-0">
              <Link to="/help/planner-storage">Open storage help</Link>
            </Button>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto gap-2 bg-transparent p-0 mb-8">
            <TabsTrigger 
              value="quick-start" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3 border border-border rounded-lg"
            >
              <Rocket className="h-4 w-4" />
              <span className="hidden sm:inline">Quick Start</span>
            </TabsTrigger>
            <TabsTrigger 
              value="features" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3 border border-border rounded-lg"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Features</span>
            </TabsTrigger>
            <TabsTrigger 
              value="faq" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3 border border-border rounded-lg"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">FAQ</span>
            </TabsTrigger>
            <TabsTrigger 
              value="feature-request" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3 border border-border rounded-lg"
            >
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Request</span>
            </TabsTrigger>
            <TabsTrigger 
              value="report-issue" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3 border border-border rounded-lg"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Report</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick-start" className="mt-0">
            <QuickStartGuide />
          </TabsContent>

          <TabsContent value="features" className="mt-0">
            <FeaturesGuide />
          </TabsContent>

          <TabsContent value="faq" className="mt-0">
            <FAQSection />
          </TabsContent>

          <TabsContent value="feature-request" className="mt-0">
            <FeatureRequestSection />
          </TabsContent>

          <TabsContent value="report-issue" className="mt-0">
            <ReportIssueSection />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
