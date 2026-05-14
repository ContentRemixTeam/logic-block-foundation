import type { MoneyTrack } from '@/constants/moneyMovesConfig';

export type DQ1 = 'yes' | 'kind_of' | 'no';
export type DQ2 = 'multiple' | 'once_twice' | 'not_yet' | 'never_public';
export type DQ3 = 'email' | 'social' | 'community' | 'collabs' | 'nowhere';
export type DQ4 = 'weekly_plus' | 'sometimes' | 'start_stop' | 'not_showing_up';
export type DQ5 = 'weekly_plus' | 'sometimes' | 'rarely' | 'no_list';
export type DQ6 = 'yes' | 'no' | 'hinted';
export type DQ7 = 'seen' | 'trust' | 'ask' | 'offer' | 'overthink';
export type DQ8 = 'post' | 'email' | 'freebie' | 'collab' | 'free_event' | 'direct_offer' | 'limited_offer';

export interface DiagnosticAnswers {
  q1: DQ1;
  q2: DQ2;
  q3: DQ3;
  q4: DQ4;
  q5: DQ5;
  q6: DQ6;
  q7: DQ7;
  q8: DQ8;
}

export interface DiagnosisResult {
  track: MoneyTrack;
  rung: number;
}

export function diagnose(a: DiagnosticAnswers): DiagnosisResult {
  // 1. Offer Foundation
  if (a.q1 === 'no' || a.q1 === 'kind_of') {
    let rung = 1;
    if (a.q1 === 'kind_of') rung = 2;
    return { track: 'offer_foundation', rung };
  }

  // 2. Lead Gen
  if (a.q3 === 'nowhere' || a.q4 === 'not_showing_up') {
    let rung = 1;
    if (a.q4 === 'start_stop') rung = 2;
    else if (a.q4 === 'sometimes') rung = 3;
    if (a.q8 === 'freebie') rung = Math.max(rung, 4);
    if (a.q8 === 'collab') rung = 6;
    return { track: 'lead_gen', rung };
  }

  // 3. Nurture
  if (a.q5 === 'no_list' || a.q5 === 'rarely' || a.q2 === 'not_yet') {
    let rung = 1;
    if (a.q5 === 'rarely') rung = 2;
    else if (a.q5 === 'sometimes') rung = 3;
    else if (a.q5 === 'weekly_plus') rung = 4;
    if (a.q7 === 'trust') rung = Math.max(rung, 3);
    return { track: 'nurture', rung };
  }

  // 4. Sell
  if (a.q6 === 'no' || a.q6 === 'hinted') {
    let rung = 1;
    if (a.q2 === 'once_twice') rung = 2;
    else if (a.q2 === 'multiple') rung = 3;
    if (a.q8 === 'limited_offer') rung = Math.max(rung, 3);
    if (a.q8 === 'direct_offer' && a.q2 === 'multiple') rung = 4;
    return { track: 'sell', rung };
  }

  // Already pitching — push them up the Sell ladder
  let rung = 4;
  if (a.q7 === 'ask') rung = 4;
  if (a.q2 === 'multiple') rung = 5;
  return { track: 'sell', rung };
}

export const DIAGNOSTIC_QUESTIONS: Array<{
  key: keyof DiagnosticAnswers;
  question: string;
  options: { value: string; label: string }[];
}> = [
  {
    key: 'q1',
    question: 'Do you currently have something you can sell?',
    options: [
      { value: 'yes', label: "Yes, I know what I'm selling" },
      { value: 'kind_of', label: 'Kind of, but it needs work' },
      { value: 'no', label: "No, I'm not sure what to sell yet" },
    ],
  },
  {
    key: 'q2',
    question: 'Have you sold this offer before?',
    options: [
      { value: 'multiple', label: 'Yes, more than once' },
      { value: 'once_twice', label: 'Yes, once or twice' },
      { value: 'not_yet', label: 'No, not yet' },
      { value: 'never_public', label: 'I have not made an offer publicly yet' },
    ],
  },
  {
    key: 'q3',
    question: 'Where are people currently finding you?',
    options: [
      { value: 'email', label: 'Email list' },
      { value: 'social', label: 'Instagram / TikTok / short-form content' },
      { value: 'community', label: 'Facebook group or community' },
      { value: 'collabs', label: 'Collaborations / referrals' },
      { value: 'nowhere', label: 'Nowhere consistently yet' },
    ],
  },
  {
    key: 'q4',
    question: 'How consistently are you showing up?',
    options: [
      { value: 'weekly_plus', label: 'Weekly or more' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'start_stop', label: 'I keep stopping and starting' },
      { value: 'not_showing_up', label: 'I have not been showing up publicly' },
    ],
  },
  {
    key: 'q5',
    question: 'Are you emailing your audience consistently?',
    options: [
      { value: 'weekly_plus', label: 'Yes, weekly or more' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'rarely', label: 'I have a list but rarely email' },
      { value: 'no_list', label: 'I do not have an email list yet' },
    ],
  },
  {
    key: 'q6',
    question: 'Have you invited people to buy anything in the last 30 days?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'hinted', label: 'I hinted at it but did not make a clear ask' },
    ],
  },
  {
    key: 'q7',
    question: 'What feels most stuck right now?',
    options: [
      { value: 'seen', label: 'I need more people seeing me' },
      { value: 'trust', label: 'I need people to trust me more before I sell' },
      { value: 'ask', label: 'I need to make the ask' },
      { value: 'offer', label: 'I need a clearer offer' },
      { value: 'overthink', label: 'I need to stop overthinking and take action' },
    ],
  },
  {
    key: 'q8',
    question: 'What kind of action feels doable this week?',
    options: [
      { value: 'post', label: 'Post something publicly' },
      { value: 'email', label: 'Send an email' },
      { value: 'freebie', label: 'Create or promote a freebie' },
      { value: 'collab', label: 'Pitch a collaboration' },
      { value: 'free_event', label: 'Invite people to a free event' },
      { value: 'direct_offer', label: 'Make a direct offer' },
      { value: 'limited_offer', label: 'Open a limited-time offer' },
    ],
  },
];
