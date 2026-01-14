import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Flame, Users, ArrowRight } from 'lucide-react';

const categories = [
  { 
    key: 'content', 
    label: 'Content', 
    icon: Sparkles, 
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20',
    description: 'Lead generation'
  },
  { 
    key: 'nurture', 
    label: 'Nurture', 
    icon: Flame, 
    color: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
    description: 'Email & engagement'
  },
  { 
    key: 'offer', 
    label: 'Offer', 
    icon: Users, 
    color: 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20',
    description: 'Sales & conversion'
  },
];

export function CategoryProjectLinks() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        Quick filters:
        <ArrowRight className="h-3 w-3" />
      </span>
      {categories.map((cat) => {
        const Icon = cat.icon;
        return (
          <Link key={cat.key} to={`/tasks?category=${cat.key}`}>
            <Badge 
              variant="outline" 
              className={`${cat.color} cursor-pointer transition-colors text-xs`}
            >
              <Icon className="h-3 w-3 mr-1" />
              {cat.label}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}
