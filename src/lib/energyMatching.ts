/**
 * Match tasks to the user's current battery level.
 *
 *   empty → bare-minimum only
 *   low   → bare-minimum + energy_cost = 'low'
 *   half  → bare-minimum + 'low' + 'medium' + untagged
 *   full  → everything
 *
 * "Untagged" (null energy_cost) is only shown at half+ so that low-energy
 * days aren't polluted with unknown-cost tasks.
 */
import type { BatteryLevel } from '@/hooks/useBatteryCheckin';

export type EnergyCost = 'low' | 'medium' | 'high' | null | undefined;

export interface EnergyMatchTask {
  energy_cost?: string | null;
  is_bare_minimum?: boolean | null;
}

export function matchesBattery<T extends EnergyMatchTask>(
  task: T,
  battery: BatteryLevel | null,
): boolean {
  if (!battery) return true; // no check-in → no filtering
  const e = (task.energy_cost ?? null) as EnergyCost;
  const bm = !!task.is_bare_minimum;
  switch (battery) {
    case 'empty': return bm;
    case 'low':   return bm || e === 'low';
    case 'half':  return bm || e === 'low' || e === 'medium' || e == null;
    case 'full':  return true;
  }
}

export function filterByBattery<T extends EnergyMatchTask>(
  tasks: T[],
  battery: BatteryLevel | null,
): T[] {
  if (!battery) return tasks;
  return tasks.filter((t) => matchesBattery(t, battery));
}
