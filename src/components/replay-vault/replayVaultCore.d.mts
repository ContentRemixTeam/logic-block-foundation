import type { ProtectedDetailTarget, VaultAccessState, VaultReplayGroup } from './types';

export function isStableVaultId(value: unknown): value is string;
export function normalizeAccessResponse(data: unknown): VaultAccessState;
export function groupSearchResults(payload: unknown): VaultReplayGroup[];
export function makeDetailHref(target: ProtectedDetailTarget): string;
export function parseDetailTarget(search: string): ProtectedDetailTarget | null;
export function clampSeekTarget(target: number, duration: number, safetyMargin?: number): number;
export function applySeekTarget(media: Pick<HTMLMediaElement, 'duration' | 'currentTime'>, target: number): number;
export function formatCompactTime(seconds: number | null): string;
export function formatSpokenTime(seconds: number | null): string;
export function shouldAutoRefresh(attempts: number): boolean;
