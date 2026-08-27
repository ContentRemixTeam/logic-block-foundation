import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MastermindGate } from '@/components/membership/MastermindGate';
import { MASTERMIND_PORTAL_RESOURCES, type MastermindPortalResource } from '@/data/mastermindPortalResources';
import { isDefaultMastermindPortalResource } from '@/lib/mastermindPortalSearch';
import { ArrowRight, CalendarCheck, ExternalLink, Target } from 'lucide-react';

const RESOURCE_GROUPS = [
  {
    id: 'planner',
    title: 'Planner',
    description: 'Build the 90-day plan here, then use the hub only when a resource helps the next action.',
    resourceIds: ['ninety-day-planning', 'faith-ai'],
  },
  {
    id: 'learning',
    title: 'Core Curriculum Links',
    description: 'Open the existing member portal lessons. The curriculum stays in the portal.',
    resourceIds: [
      'success-plan',
      'products-offers',
      'grow-email-list',
      'content-creation',
      'sales-marketing',
      'organization-systems',
      'messy-action-sprints',
    ],
  },
  {
    id: 'support',
    title: 'Calls & Support',
    description: 'Use the room, replays, and live support when the plan needs context or momentum.',
    resourceIds: ['current-replays', 'ask-faith', 'coworking', 'events'],
  },
] as const;

export default function MastermindHub() {
  const navigate = useNavigate();

  const resourcesById = useMemo(() => {
    return new Map(
      MASTERMIND_PORTAL_RESOURCES
        .filter(isDefaultMastermindPortalResource)
        .map((resource) => [resource.id, resource])
    );
  }, []);

  const resourceGroups = useMemo(() => {
    return RESOURCE_GROUPS.map((group) => ({
      ...group,
      resources: group.resourceIds
        .map((resourceId) => resourcesById.get(resourceId))
        .filter((resource): resource is MastermindPortalResource => Boolean(resource)),
    })).filter((group) => group.resources.length > 0);
  }, [resourcesById]);

  const openResource = (resource: MastermindPortalResource) => {
    if (resource.isExternal) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
      return;
    }

    navigate(resource.url);
  };

  return (
    <Layout>
      <MastermindGate>
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <header className="space-y-3">
            <Badge variant="secondary" className="w-fit">Becoming Boss Mastermind</Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Resource Hub</h1>
              <p className="max-w-3xl text-muted-foreground">
                Fast links for the planner, live support, and existing Mastermind resources. The app keeps the plan and actions; curriculum and replays stay in the member portal.
              </p>
            </div>
          </header>

          <Card className="border-primary/20">
            <CardHeader>
              <Badge variant="outline" className="w-fit">Planner first</Badge>
              <CardTitle>Your plan stays in the Planner.</CardTitle>
              <CardDescription>
                Start with the 90-day plan, then choose one link only when it helps you finish the next business action.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row">
              <Button className="min-h-11 justify-start" onClick={() => navigate('/cycle-setup')}>
                <Target className="mr-2 h-4 w-4" />
                Open 90-Day Planner
              </Button>
              <Button variant="outline" className="min-h-11 justify-start" onClick={() => navigate('/weekly-review')}>
                <CalendarCheck className="mr-2 h-4 w-4" />
                Weekly Check-In
              </Button>
            </CardContent>
          </Card>

          {resourceGroups.map((group) => (
            <section key={group.id} className="space-y-3" aria-labelledby={`${group.id}-resources-title`}>
              <div className="space-y-1">
                <h2 id={`${group.id}-resources-title`} className="text-xl font-semibold tracking-tight">
                  {group.title}
                </h2>
                <p className="max-w-3xl text-sm text-muted-foreground">{group.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.resources.map((resource) => (
                  <ResourceLinkCard
                    key={resource.id}
                    resource={resource}
                    onOpen={() => openResource(resource)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </MastermindGate>
    </Layout>
  );
}

interface ResourceLinkCardProps {
  resource: MastermindPortalResource;
  onOpen: () => void;
}

function ResourceLinkCard({ resource, onOpen }: ResourceLinkCardProps) {
  const Icon = resource.icon;

  return (
    <Card className="group flex h-full flex-col transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="break-words text-base leading-snug">{resource.title}</CardTitle>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[11px]">{resource.accessLabel}</Badge>
              <Badge variant="secondary" className="text-[11px]">Link</Badge>
            </div>
          </div>
        </div>
        <CardDescription className="text-sm leading-relaxed">{resource.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <Button
          variant="secondary"
          className="min-h-11 w-full justify-between gap-2 whitespace-normal text-left"
          onClick={onOpen}
        >
          <span className="min-w-0 break-words">{resource.primaryAction}</span>
          {resource.isExternal ? (
            <ExternalLink className="h-4 w-4 shrink-0" />
          ) : (
            <ArrowRight className="h-4 w-4 shrink-0" />
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
