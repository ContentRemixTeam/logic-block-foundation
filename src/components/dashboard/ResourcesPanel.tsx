import { ExternalLink } from 'lucide-react';
import { PremiumCard } from '@/components/ui/premium-card';
import { MASTERMIND_LINKS } from '@/lib/mastermindLinks';

export function ResourcesPanel() {
  const resources = [
    {
      label: 'Mastermind Group',
      href: MASTERMIND_LINKS.MASTERMIND_GROUP,
    },
    {
      label: 'Coworking Sessions',
      href: MASTERMIND_LINKS.COWORKING_ROOM,
    },
    {
      label: 'Calendar & Events',
      href: MASTERMIND_LINKS.EVENTS_CALENDAR,
    },
  ];

  return (
    <PremiumCard showAccent={false}>
      <h3 className="text-sm font-semibold mb-3">Resources</h3>
      <div className="space-y-2">
        {resources.map((resource) => (
          <a
            key={resource.href}
            href={resource.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-sm text-primary hover:underline py-1.5 group"
          >
            <span>{resource.label}</span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>
    </PremiumCard>
  );
}
