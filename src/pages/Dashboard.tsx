import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Settings2, 
  Pencil, 
  TrendingUp, 
  ListTodo, 
  Target, 
  Compass 
} from 'lucide-react';

interface WidgetSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  elevated?: boolean;
}

function WidgetSection({ title, icon, children, elevated }: WidgetSectionProps) {
  return (
    <div className={`p-4 md:p-6 ${elevated ? 'bg-muted/30' : 'bg-card'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-primary">{icon}</span>
        <h3 className="font-semibold text-base md:text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const isMobile = useIsMobile();

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground">Your 90-day planning hub</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile: Icon buttons */}
            <Button variant="outline" size="icon" className="md:hidden">
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="md:hidden" asChild>
              <Link to="/cycle-setup">
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            
            {/* Desktop: Text buttons */}
            <Button variant="outline" className="hidden md:flex">
              <Settings2 className="h-4 w-4 mr-2" />
              Customize Layout
            </Button>
            <Button variant="outline" className="hidden md:flex" asChild>
              <Link to="/cycle-setup">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Plan
              </Link>
            </Button>
          </div>
        </div>

        {/* Widget Container */}
        <Card className="overflow-hidden">
          {/* Quarter Progress - Always visible */}
          <WidgetSection 
            title="Quarter Progress" 
            icon={<TrendingUp className="h-5 w-5" />}
          >
            <Progress value={0} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">Day 0 of 90</p>
          </WidgetSection>
          
          <div className="border-t border-border" />
          
          {/* Planning Next Steps - Always visible */}
          <WidgetSection 
            title="Planning Next Steps" 
            icon={<ListTodo className="h-5 w-5" />}
            elevated
          >
            <p className="text-muted-foreground text-sm">Your next actions will appear here</p>
          </WidgetSection>
          
          <div className="border-t border-border" />
          
          {/* 90-Day Goal - Default on */}
          <WidgetSection 
            title="90-Day Goal" 
            icon={<Target className="h-5 w-5" />}
          >
            <p className="text-muted-foreground text-sm">Your main goal will appear here</p>
          </WidgetSection>
          
          <div className="border-t border-border" />
          
          {/* Focus Area - Default on */}
          <WidgetSection 
            title="Focus Area" 
            icon={<Compass className="h-5 w-5" />}
            elevated
          >
            <p className="text-muted-foreground text-sm">Your strategic focus will appear here</p>
          </WidgetSection>
        </Card>
      </div>
    </Layout>
  );
}
