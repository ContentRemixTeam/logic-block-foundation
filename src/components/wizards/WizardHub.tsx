import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, ArrowRight, RotateCcw, Rocket, Mail, Zap } from 'lucide-react';
import { WizardTemplate, WizardCompletion } from '@/types/wizard';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const ICON_MAP: Record<string, React.ReactNode> = {
  Target: <Target className="h-8 w-8" />,
  Rocket: <Rocket className="h-8 w-8" />,
  Mail: <Mail className="h-8 w-8" />,
  Zap: <Zap className="h-8 w-8" />,
};

export default function WizardHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WizardTemplate[]>([]);
  const [completions, setCompletions] = useState<WizardCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      navigate('/cycle-setup');
    } else if (templateName === 'launch-planner') {
      navigate('/wizards/launch');
    } else if (templateName === 'habit-planner') {
      navigate('/wizards/habits');
    } else if (templateName === 'finance-recovery') {
      navigate('/wizards/finance-recovery');
    } else {
      // Email and Content Sprint wizards coming soon
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
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {templates.map(template => {
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

      {templates.length === 0 && (
        <Card className="col-span-full">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No wizards available yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
