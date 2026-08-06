import { supabase } from '@/integrations/supabase/client';
import { LowBatteryPlanData, emptyLowBatteryPlan } from './lowBatteryPlanTypes';

export const LOW_BATTERY_SUBMISSION_KEY = 'low-battery-business-plan-submission-v1';

export interface SubmissionRef {
  id: string;
  token: string;
}

/** True when at least one field anywhere in the plan has real content. */
export function hasAnsweredFields(data: LowBatteryPlanData | null | undefined): boolean {
  if (!data) return false;
  return Object.values(data).some((section) =>
    Object.values(section as Record<string, unknown>).some((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return typeof value === 'string' && value.trim().length > 0;
    })
  );
}

/** Merge an unknown JSON payload onto the empty plan shape (never throws). */
export function coercePlan(raw: unknown): LowBatteryPlanData | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<LowBatteryPlanData>;
  return {
    step1: { ...emptyLowBatteryPlan.step1, ...(parsed.step1 ?? {}) },
    step2: { ...emptyLowBatteryPlan.step2, ...(parsed.step2 ?? {}) },
    step3: { ...emptyLowBatteryPlan.step3, ...(parsed.step3 ?? {}) },
    step4: { ...emptyLowBatteryPlan.step4, ...(parsed.step4 ?? {}) },
    step5: { ...emptyLowBatteryPlan.step5, ...(parsed.step5 ?? {}) },
    step6: { ...emptyLowBatteryPlan.step6, ...(parsed.step6 ?? {}) },
    step7: { ...emptyLowBatteryPlan.step7, ...(parsed.step7 ?? {}) },
  };
}

export function readSubmissionRef(): SubmissionRef | null {
  try {
    const raw = localStorage.getItem(LOW_BATTERY_SUBMISSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SubmissionRef>;
    if (typeof parsed.id === 'string' && typeof parsed.token === 'string') {
      return { id: parsed.id, token: parsed.token };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeSubmissionRef(ref: SubmissionRef | null) {
  try {
    if (ref) localStorage.setItem(LOW_BATTERY_SUBMISSION_KEY, JSON.stringify(ref));
    else localStorage.removeItem(LOW_BATTERY_SUBMISSION_KEY);
  } catch {
    // Storage unavailable; online backup simply stays session-only.
  }
}

/** Token-protected read of an existing online submission. */
export async function loadSubmissionAnswers(ref: SubmissionRef) {
  const { data, error } = await supabase.rpc('load_low_battery_workshop_answers', {
    p_submission_id: ref.id,
    p_submission_token: ref.token,
  });
  if (error || !data || typeof data !== 'object') return null;
  const payload = data as { answers?: unknown; current_step?: number | null };
  return {
    answers: coercePlan(payload.answers),
    currentStep: typeof payload.current_step === 'number' ? payload.current_step : 1,
  };
}

/** Signed-in cross-browser lookup of the newest submission for this account. */
export async function loadMyLatestSubmission() {
  const { data, error } = await supabase.rpc('load_my_latest_low_battery_workshop');
  if (error || !data || typeof data !== 'object') return null;
  const payload = data as {
    id?: string;
    token?: string;
    answers?: unknown;
    current_step?: number | null;
  };
  if (!payload.id || !payload.token) return null;
  return {
    ref: { id: payload.id, token: payload.token } as SubmissionRef,
    answers: coercePlan(payload.answers),
    currentStep: typeof payload.current_step === 'number' ? payload.current_step : 1,
  };
}

/** Create an online submission so answers can be backed up and recovered. */
export async function registerSubmission(firstName: string, email: string) {
  const { data, error } = await supabase.rpc('register_low_battery_workshop', {
    p_first_name: firstName,
    p_email: email,
  });
  if (error || !data || typeof data !== 'object') return null;
  const payload = data as { id?: string; token?: string };
  if (!payload.id || !payload.token) return null;
  return { id: payload.id, token: payload.token } as SubmissionRef;
}

export async function saveSubmissionAnswers(
  ref: SubmissionRef,
  answers: LowBatteryPlanData,
  currentStep: number,
  completed = false
) {
  const { data, error } = await supabase.rpc('save_low_battery_workshop_answers', {
    p_submission_id: ref.id,
    p_submission_token: ref.token,
    p_answers: JSON.parse(JSON.stringify(answers)),
    p_current_step: currentStep,
    p_completed: completed,
  });
  return !error && data === true;
}

export async function checkpointSubmission(ref: SubmissionRef, reason: string) {
  const { error } = await supabase.rpc('checkpoint_low_battery_workshop_answers', {
    p_submission_id: ref.id,
    p_submission_token: ref.token,
    p_reason: reason,
  });
  return !error;
}
