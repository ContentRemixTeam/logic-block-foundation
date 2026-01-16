import { Link } from 'react-router-dom';
import { Brain, Shield, Anchor, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { cn } from '@/lib/utils';

interface MindsetCard {
  title: string;
  description: string;
  href: string;
  icon: typeof Brain;
  iconBgClass: string;
  iconColorClass: string;
}

const mindsetCards: MindsetCard[] = [
  {
    title: 'Useful Thoughts',
    description: 'Capture and reframe thoughts that serve you.',
    href: '/useful-thoughts',
    icon: Brain,
    iconBgClass: 'bg-status-waiting/10',
    iconColorClass: 'text-status-waiting',
  },
  {
    title: 'Belief Builder',
    description: 'Transform limiting beliefs into empowering ones.',
    href: '/belief-builder',
    icon: Shield,
    iconBgClass: 'bg-success/10',
    iconColorClass: 'text-success',
  },
  {
    title: 'Identity Anchors',
    description: 'Define and strengthen your core identity.',
    href: '/identity-anchors',
    icon: Anchor,
    iconBgClass: 'bg-status-scheduled/10',
    iconColorClass: 'text-status-scheduled',
  },
  {
    title: 'Self-Coaching',
    description: 'Guide yourself through challenges with clarity.',
    href: '/self-coaching',
    icon: MessageCircle,
    iconBgClass: 'bg-status-backlog/10',
    iconColorClass: 'text-status-backlog',
  },
];

export default function Mindset() {
  return (
    <Layout>
      <div className="max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Mindset</h1>
          <p className="text-muted-foreground">Your mental toolkit for growth</p>
        </div>

        {/* Mindset Options */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Mindset Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mindsetCards.map((card) => (
              <Link
                key={card.href}
                to={card.href}
                className="block"
              >
                <Card className={cn(
                  "p-6 h-full transition-all duration-200",
                  "hover:shadow-lg hover:border-primary/50",
                  "cursor-pointer"
                )}>
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-lg",
                      card.iconBgClass
                    )}>
                      <card.icon className={cn("h-6 w-6", card.iconColorClass)} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold hover:text-primary transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
