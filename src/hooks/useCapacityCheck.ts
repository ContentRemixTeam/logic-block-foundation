import { useMemo } from 'react';

interface PlatformCommitment {
  platform: string;
  postsPerWeek: number;
  hoursPerPost: number;
}

interface CapacityResult {
  isOvercommitted: boolean;
  totalHoursNeeded: number;
  availableHours: number;
  utilizationPercent: number;
  platforms: PlatformCommitment[];
  suggestions: CapacitySuggestion[];
}

interface CapacitySuggestion {
  id: string;
  title: string;
  description: string;
  platforms: PlatformCommitment[];
  totalHours: number;
}

// Default time estimates per content type
const DEFAULT_HOURS_PER_POST: Record<string, number> = {
  instagram: 1.5,
  linkedin: 1,
  youtube: 4,
  tiktok: 1,
  facebook: 1,
  email: 2,
  blog: 3,
  podcast: 5,
  twitter: 0.5,
};

export function useCapacityCheck(
  platforms: PlatformCommitment[],
  availableHoursPerWeek: number,
  offersPerQuarter: number = 0,
  hasLaunch: boolean = false
): CapacityResult {
  return useMemo(() => {
    // Calculate content creation time
    let totalHoursNeeded = platforms.reduce((sum, p) => {
      return sum + (p.postsPerWeek * p.hoursPerPost);
    }, 0);

    // Add time for offers (estimate 15 min per offer)
    const offersPerWeek = offersPerQuarter / 13; // 13 weeks in a quarter
    totalHoursNeeded += offersPerWeek * 0.25;

    // Add launch overhead (average ~5 extra hours/week during launch period)
    if (hasLaunch) {
      totalHoursNeeded += 5;
    }

    const utilizationPercent = availableHoursPerWeek > 0 
      ? Math.round((totalHoursNeeded / availableHoursPerWeek) * 100)
      : 0;
    
    const isOvercommitted = utilizationPercent > 100;

    // Generate simplified suggestions if overcommitted
    const suggestions: CapacitySuggestion[] = [];
    
    if (isOvercommitted && platforms.length > 0) {
      // Sort platforms by hours consumed (descending)
      const sortedPlatforms = [...platforms].sort((a, b) => 
        (b.postsPerWeek * b.hoursPerPost) - (a.postsPerWeek * a.hoursPerPost)
      );

      // Option A: Focus on primary platform
      const primaryPlatform = sortedPlatforms[0];
      const optionAPlatforms: PlatformCommitment[] = [
        { ...primaryPlatform, postsPerWeek: Math.min(primaryPlatform.postsPerWeek, 3) },
      ];
      if (sortedPlatforms.length > 1) {
        optionAPlatforms.push({ ...sortedPlatforms[1], postsPerWeek: 1 });
      }
      const optionAHours = optionAPlatforms.reduce((sum, p) => sum + (p.postsPerWeek * p.hoursPerPost), 0);
      
      suggestions.push({
        id: 'option-a',
        title: `${primaryPlatform.platform} Focus`,
        description: `Focus on ${primaryPlatform.platform} with minimal presence elsewhere`,
        platforms: optionAPlatforms,
        totalHours: optionAHours,
      });

      // Option B: Email/nurture focus if email is in the list
      const emailPlatform = platforms.find(p => p.platform.toLowerCase() === 'email');
      if (emailPlatform) {
        const optionBPlatforms: PlatformCommitment[] = [
          { ...emailPlatform, postsPerWeek: 3 },
          { platform: sortedPlatforms[0].platform, postsPerWeek: 1, hoursPerPost: sortedPlatforms[0].hoursPerPost },
        ];
        const optionBHours = optionBPlatforms.reduce((sum, p) => sum + (p.postsPerWeek * p.hoursPerPost), 0);
        
        suggestions.push({
          id: 'option-b',
          title: 'Email Focus',
          description: 'Prioritize email marketing with minimal social presence',
          platforms: optionBPlatforms,
          totalHours: optionBHours,
        });
      }

      // Option C: Reduce everything proportionally
      const reductionFactor = availableHoursPerWeek / totalHoursNeeded;
      const optionCPlatforms = platforms.map(p => ({
        ...p,
        postsPerWeek: Math.max(1, Math.round(p.postsPerWeek * reductionFactor)),
      }));
      const optionCHours = optionCPlatforms.reduce((sum, p) => sum + (p.postsPerWeek * p.hoursPerPost), 0);
      
      suggestions.push({
        id: 'option-c',
        title: 'Balanced Reduction',
        description: 'Reduce frequency across all platforms proportionally',
        platforms: optionCPlatforms,
        totalHours: optionCHours,
      });
    }

    return {
      isOvercommitted,
      totalHoursNeeded: Math.round(totalHoursNeeded * 10) / 10,
      availableHours: availableHoursPerWeek,
      utilizationPercent,
      platforms,
      suggestions,
    };
  }, [platforms, availableHoursPerWeek, offersPerQuarter, hasLaunch]);
}

export function getDefaultHoursPerPost(platform: string): number {
  return DEFAULT_HOURS_PER_POST[platform.toLowerCase()] ?? 1;
}
