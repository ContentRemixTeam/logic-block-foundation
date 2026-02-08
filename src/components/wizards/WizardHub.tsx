import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, ArrowRight, RotateCcw, Rocket, Mail, Zap, DollarSign, History, ExternalLink, Lightbulb, Sparkles, Kanban } from 'lucide-react';
import { WizardTemplate, WizardCompletion } from '@/types/wizard';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

// Fully implemented wizards that should be shown
const IMPLEMENTED_WIZARDS = [
  'cycle-90-day',
  'launch-planner',
  'habit-planner',
  'content-planner',
  'summit-planner',
  'money_momentum',
  'project-designer',
  'lead-magnet-wizard',
];

const ICON_MAP: Record<string, React.ReactNode> = {
  Target: <Target className="h-8 w-8" />,
  Rocket: <Rocket className="h-8 w-8" />,
  Mail: <Mail className="h-8 w-8" />,
  Zap: <Zap className="h-8 w-8" />,
  DollarSign: <DollarSign className="h-8 w-8" />,
  Kanban: <Kanban className="h-8 w-8" />,
};

const ICON_MAP_SMALL: Record<string, React.ReactNode> = {
  Target: <Target className="h-5 w-5" />,
  Rocket: <Rocket className="h-5 w-5" />,
  Mail: <Mail className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
  DollarSign: <DollarSign className="h-5 w-5" />,
  Kanban: <Kanban className="h-5 w-5" />,
};

export default function WizardHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WizardTemplate[]>([]);
  const [completions, setCompletions] = useState<WizardCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create template lookup map
  const templateMap = useMemo(() => {
    return templates.reduce((acc, t) => {
      acc[t.template_name] = {
        displayName: t.display_name,
        icon: t.icon
      };
      return acc;
    }, {} as Record<string, { displayName: string; icon: string | null }>);
  }, [templates]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load templates
        const { data: templatesData } = await supabase
          .from('wizard_templates')
          .select('*')
          .order('display_name');

        if (templatesData) {
          setTemplates(templatesData as WizardTemplate[]);
        }

        // Load user completions
        if (user) {
          const { data: completionsData } = await supabase
            .from('wizard_completions')
            .select('*')
            .eq('user_id', user.id)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false });

          if (completionsData) {
            setCompletions(completionsData as WizardCompletion[]);
          }
        }
      } catch (err) {
        console.error('Error loading wizard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const getLastCompletion = (templateName: string): WizardCompletion | undefined => {
    return completions.find(c => c.template_name === templateName);
  };

  const handleStart = (templateName: string) => {
    if (templateName === 'cycle-90-day') {
      navigate('/cycle-wizard');
    } else if (templateName === 'launch-planner') {
      navigate('/wizards/launch');
    } else if (templateName === 'habit-planner') {
      navigate('/wizards/habits');
    } else if (templateName === 'finance-recovery') {
      navigate('/wizards/finance-recovery');
    } else if (templateName === 'content-planner') {
      navigate('/wizards/content');
    } else if (templateName === 'summit-planner') {
      navigate('/wizards/summit');
    } else if (templateName === 'money_momentum') {
      navigate('/wizards/money-momentum');
    } else if (templateName === 'project-designer') {
      navigate('/wizards/project-designer');
    } else if (templateName === 'lead-magnet-wizard') {
      navigate('/wizards/lead-magnet');
    } else {
      toast.info('This wizard is coming soon!');
    }
  };

  const handleViewLast = (completion: WizardCompletion) => {
    if (completion.created_cycle_id) {
      navigate(`/cycle/${completion.created_cycle_id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-6 w-3/4 mt-3" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="wizards" className="space-y-6">
      <TabsList>
        <TabsTrigger value="wizards">Wizards</TabsTrigger>
        <TabsTrigger value="history" className="gap-2">
          <History className="h-4 w-4" />
          History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="wizards" className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates
            .filter(template => IMPLEMENTED_WIZARDS.includes(template.template_name))
            .map(template => {
              const lastCompletion = getLastCompletion(template.template_name);
              const icon = template.icon ? ICON_MAP[template.icon] : <Target className="h-8 w-8" />;

              return (
                <Card key={template.id} className="flex flex-col">
                  <CardHeader>
                    <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit">
                      {icon}
                    </div>
                    <CardTitle className="mt-3">{template.display_name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end gap-3">
                    {lastCompletion && (
                      <div className="text-sm text-muted-foreground">
                        Last completed {formatDistanceToNow(new Date(lastCompletion.completed_at), { addSuffix: true })}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleStart(template.template_name)}
                        className="flex-1"
                      >
                        {lastCompletion ? (
                          <>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Create Another
                          </>
                        ) : (
                          <>
                            Start
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                      {lastCompletion?.created_cycle_id && (
                        <Button 
                          variant="outline"
                          onClick={() => handleViewLast(lastCompletion)}
                        >
                          View Last
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

          {templates.filter(t => IMPLEMENTED_WIZARDS.includes(t.template_name)).length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No wizards available yet.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coming Soon Banner */}
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">More Wizards Coming Soon!</p>
                <p className="text-sm text-muted-foreground">We're building more guided workflows to help you grow.</p>
              </div>
            </div>
            <Button variant="outline" asChild className="shrink-0">
              <Link to="/support?tab=features">
                <Lightbulb className="h-4 w-4 mr-2" />
                Request a Wizard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history">
        {completions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No completed wizards yet.</p>
              <p className="text-sm mt-1">Complete a wizard to see it here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {completions.map(completion => {
              const template = templateMap[completion.template_name];
              const displayName = template?.displayName || completion.template_name;
              const iconName = template?.icon;
              const icon = iconName ? ICON_MAP_SMALL[iconName] : <Target className="h-5 w-5" />;
              const formattedDate = format(new Date(completion.completed_at), "MMM d, yyyy 'at' h:mm a");

              return (
                <Card 
                  key={completion.id} 
                  className="hover:bg-muted/50 transition-colors"
                >
                  <CardContent className="py-4 px-4 flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{displayName}</p>
                      <p className="text-sm text-muted-foreground">{formattedDate}</p>
                    </div>
                    {completion.created_cycle_id && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewLast(completion)}
                        className="shrink-0"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
