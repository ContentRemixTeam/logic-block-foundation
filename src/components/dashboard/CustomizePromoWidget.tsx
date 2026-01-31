import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sliders, X, ChevronRight } from 'lucide-react';
import { useDailyPageLayout } from '@/hooks/useDailyPageLayout';
import { DEFAULT_SECTION_ORDER } from '@/types/dailyPage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function CustomizePromoWidget() {
  const { user } = useAuth();
  const { layout, isLoading } = useDailyPageLayout();
  const [isDismissed, setIsDismissed] = useState(false);
  const [loadingDismissed, setLoadingDismissed] = useState(true);

  // Check if layout is still default (not customized)
  const isDefaultLayout = useMemo(() => {
    if (!layout) return true;
    
    const hiddenMatch = layout.hidden_sections.length === 0;
    const orderMatch = layout.section_order.length === DEFAULT_SECTION_ORDER.length &&
      layout.section_order
        .filter(id => !id.startsWith('custom_question_'))
        .every((id, i) => id === DEFAULT_SECTION_ORDER[i]);
    const noCustomQuestions = !layout.custom_questions || layout.custom_questions.length === 0;
    
    return hiddenMatch && orderMatch && noCustomQuestions;
  }, [layout]);

  // Load dismissed state from user_settings
  useEffect(() => {
    const loadDismissedState = async () => {
      if (!user?.id) {
        setLoadingDismissed(false);
        return;
      }
      
      try {
        const { data } = await supabase
          .from('user_settings')
          .select('dashboard_widgets')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data?.dashboard_widgets) {
          const widgets = data.dashboard_widgets as Record<string, boolean>;
          setIsDismissed(widgets?.dismissed_customize_promo === true);
        }
      } catch (error) {
        console.error('Error loading dismissed state:', error);
      } finally {
        setLoadingDismissed(false);
      }
    };

    loadDismissedState();
  }, [user?.id]);

  // Handle dismiss
  const handleDismiss = async () => {
    setIsDismissed(true);
    
    if (!user?.id) return;
    
    try {
      // First get existing dashboard_widgets
      const { data: existing } = await supabase
        .from('user_settings')
        .select('dashboard_widgets')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const currentWidgets = (existing?.dashboard_widgets as Record<string, any>) || {};
      
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          dashboard_widgets: {
            ...currentWidgets,
            dismissed_customize_promo: true,
          },
        });
    } catch (error) {
      console.error('Error saving dismiss state:', error);
    }
  };

  // Don't show if loading, dismissed, or user has customized
  if (isLoading || loadingDismissed || isDismissed || !isDefaultLayout) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden border-border/40 bg-gradient-to-br from-primary/5 to-transparent hover:shadow-md transition-all">
      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sliders className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-sm font-medium">Customize Your Daily Page</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <CardDescription className="text-xs mb-3">
          Hide sections you don't use, add custom check-ins
        </CardDescription>
        
        <Button 
          asChild 
          size="sm" 
          className="w-full group"
        >
          <Link to="/settings/daily-page">
            Personalize
            <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
