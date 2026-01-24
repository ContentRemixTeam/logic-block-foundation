import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { HabitWizardData } from '@/pages/HabitWizardPage';
import { 
  Heart, 
  Brain, 
  Users, 
  Dumbbell, 
  BookOpen, 
  Sparkles,
  DollarSign,
  Home,
  Briefcase
} from 'lucide-react';

interface HabitLifeAreasProps {
  data: HabitWizardData;
  onChange: (updates: Partial<HabitWizardData>) => void;
}

const LIFE_AREAS = [
  {
    id: 'health',
    name: 'Health & Fitness',
    description: 'Exercise, nutrition, sleep, energy',
    icon: Dumbbell,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    examples: ['Morning workout', 'Drink 8 glasses of water', 'Sleep by 10pm'],
  },
  {
    id: 'self-care',
    name: 'Self-Care & Wellness',
    description: 'Relaxation, skincare, mental health',
    icon: Heart,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    examples: ['Skincare routine', 'Take breaks', 'Digital detox'],
  },
  {
    id: 'mindset',
    name: 'Mindset & Growth',
    description: 'Meditation, journaling, mindfulness',
    icon: Brain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    examples: ['Morning meditation', 'Gratitude journal', 'Affirmations'],
  },
  {
    id: 'relationships',
    name: 'Relationships',
    description: 'Family, friends, community',
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    examples: ['Call a friend', 'Date night', 'Family dinner'],
  },
  {
    id: 'learning',
    name: 'Learning & Development',
    description: 'Reading, courses, skill building',
    icon: BookOpen,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    examples: ['Read 20 pages', 'Online course', 'Practice a skill'],
  },
  {
    id: 'creativity',
    name: 'Creativity & Hobbies',
    description: 'Art, music, personal projects',
    icon: Sparkles,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    examples: ['Creative writing', 'Practice instrument', 'DIY project'],
  },
  {
    id: 'finances',
    name: 'Finances',
    description: 'Budgeting, saving, investing',
    icon: DollarSign,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    examples: ['Track expenses', 'Review budget', 'Check investments'],
  },
  {
    id: 'home',
    name: 'Home & Environment',
    description: 'Cleaning, organizing, maintenance',
    icon: Home,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    examples: ['10-min tidy', 'Declutter one area', 'Meal prep'],
  },
  {
    id: 'business',
    name: 'Business & Career',
    description: 'Work habits, professional growth',
    icon: Briefcase,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    examples: ['Morning planning', 'Networking', 'Skill development'],
  },
];

export function HabitLifeAreas({ data, onChange }: HabitLifeAreasProps) {
  const toggleArea = (areaId: string) => {
    const current = data.selectedAreas || [];
    const updated = current.includes(areaId)
      ? current.filter(id => id !== areaId)
      : [...current, areaId];
    onChange({ selectedAreas: updated });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Which areas of your life do you want to focus on?</h2>
        <p className="text-muted-foreground">
          Select the areas where you want to build better habits. You can always add more later.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LIFE_AREAS.map((area) => {
          const Icon = area.icon;
          const isSelected = (data.selectedAreas || []).includes(area.id);

          return (
            <Card
              key={area.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                isSelected && 'ring-2 ring-primary bg-primary/5'
              )}
              onClick={() => toggleArea(area.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={cn('p-2 rounded-lg', area.bgColor)}>
                    <Icon className={cn('h-5 w-5', area.color)} />
                  </div>
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => toggleArea(area.id)}
                  />
                </div>
                <CardTitle className="text-base mt-2">{area.name}</CardTitle>
                <CardDescription className="text-xs">{area.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1">
                  {area.examples.slice(0, 2).map((example, i) => (
                    <span 
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(data.selectedAreas?.length || 0) > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {data.selectedAreas.length} area{data.selectedAreas.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
