/**
 * Challenge Enrollment Modal
 * Allows users to enroll in the current month's challenge
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Target, Folder, Calendar, Loader2 } from 'lucide-react';
import { useMonthlyChallenge, ChallengeType } from '@/hooks/useMonthlyChallenge';
import { useProjects } from '@/hooks/useProjects';

interface ChallengeEnrollmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHALLENGE_TYPES: { value: ChallengeType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'tasks_total',
    label: 'Task Momentum',
    description: 'Complete a target number of tasks this month',
    icon: <Target className="h-5 w-5" />,
  },
  {
    value: 'tasks_in_project',
    label: 'Project Sprint',
    description: 'Focus on completing tasks in a specific project',
    icon: <Folder className="h-5 w-5" />,
  },
  {
    value: 'daily_checkins',
    label: 'Consistency',
    description: 'Check in daily to build momentum',
    icon: <Calendar className="h-5 w-5" />,
  },
];

const TARGET_SUGGESTIONS: Record<ChallengeType, number[]> = {
  tasks_total: [30, 50, 75, 100],
  tasks_in_project: [15, 25, 40, 60],
  daily_checkins: [15, 20, 25, 30],
};

export function ChallengeEnrollmentModal({ open, onOpenChange }: ChallengeEnrollmentModalProps) {
  const { currentTemplate, enroll, isEnrolling } = useMonthlyChallenge();
  const projectsQuery = useProjects();
  const projects = projectsQuery.data;
  const projectsLoading = projectsQuery.isLoading;
  
  const [challengeType, setChallengeType] = useState<ChallengeType>('tasks_total');
  const [targetValue, setTargetValue] = useState<number>(50);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setChallengeType('tasks_total');
      setTargetValue(50);
      setSelectedProjectId('');
    }
  }, [open]);

  const handleEnroll = async () => {
    if (!currentTemplate) return;
    
    // Validate project selection for project sprint
    if (challengeType === 'tasks_in_project' && !selectedProjectId) {
      return;
    }

    try {
      await enroll({
        templateId: currentTemplate.id,
        challengeType,
        targetValue,
        projectId: challengeType === 'tasks_in_project' ? selectedProjectId : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const suggestions = TARGET_SUGGESTIONS[challengeType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🎯 {currentTemplate?.title || 'Monthly Challenge'}
          </DialogTitle>
          <DialogDescription>
            {currentTemplate?.description || 'Choose your challenge and set your target to unlock a special theme!'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Challenge Type Selection */}
          <div className="space-y-3">
            <Label>Choose Your Challenge</Label>
            <RadioGroup value={challengeType} onValueChange={(v) => setChallengeType(v as ChallengeType)}>
              {CHALLENGE_TYPES.map((type) => (
                <div
                  key={type.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    challengeType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setChallengeType(type.value)}
                >
                  <RadioGroupItem value={type.value} id={type.value} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {type.icon}
                      <Label htmlFor={type.value} className="font-medium cursor-pointer">
                        {type.label}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Project Selection (for Project Sprint) */}
          {challengeType === 'tasks_in_project' && (
            <div className="space-y-2">
              <Label>Select Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projectsLoading ? (
                    <div className="p-2 text-center text-muted-foreground">Loading...</div>
                  ) : (
                    projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Target Value */}
          <div className="space-y-2">
            <Label>Your Target</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24"
              />
              <div className="flex-1 flex gap-1 flex-wrap">
                {suggestions.map((num) => (
                  <Button
                    key={num}
                    variant={targetValue === num ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setTargetValue(num)}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {challengeType === 'daily_checkins'
                ? `Check in ${targetValue} days this month`
                : `Complete ${targetValue} tasks this month`}
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button
            onClick={handleEnroll}
            disabled={isEnrolling || (challengeType === 'tasks_in_project' && !selectedProjectId)}
          >
            {isEnrolling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Start Challenge 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
