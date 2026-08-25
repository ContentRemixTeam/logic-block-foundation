export const FILMING_GROUPS = ['record_now', 'edit_existing', 'tool_first_do_not_film', 'deferred'] as const;

export type FilmingGroup = (typeof FILMING_GROUPS)[number];

export type FilmingManifestItem = Readonly<{
  id: string;
  group: FilmingGroup;
  statusLabel: 'RECORD THIS' | 'EDIT EXISTING — DO NOT RESHOOT' | 'DO NOT FILM YET' | 'VIDEO DEFERRED';
  title: string;
  target: string;
  purpose: string;
  nextAction: string;
  internalStatus?: 'EDITORIAL CANDIDATE — NOT APPROVED OR PLAYABLE';
  slot?: 'F4' | 'N4' | 'S2' | 'D1' | 'D3' | 'L3' | 'L4';
}>;

export const mastermindVideoFilmingManifest = [
  {
    id: 'V01', group: 'record_now', statusLabel: 'RECORD THIS',
    title: 'Start Here: You Are the Boss of Your Success Path',
    target: '6–8 minute Faith-to-camera orientation',
    purpose: 'Explain the suggested Success Path, one current focus, and the member’s authority to change every recommendation.',
    nextAction: 'Faith records the orientation before the private pilot; add screen clips only after the interface is frozen.',
  },
  {
    id: 'E01', group: 'edit_existing', statusLabel: 'EDIT EXISTING — DO NOT RESHOOT', internalStatus: 'EDITORIAL CANDIDATE — NOT APPROVED OR PLAYABLE',
    title: 'Choose Your Money-Making Focus', target: 'Edit and condense Money Moves Day One',
    purpose: 'Help a member choose one money-making focus.', nextAction: 'Editorially review DAY ONE: Find Your Next Money Move; do not make it playable until approved.',
  },
  {
    id: 'E02', group: 'edit_existing', statusLabel: 'EDIT EXISTING — DO NOT RESHOOT', internalStatus: 'EDITORIAL CANDIDATE — NOT APPROVED OR PLAYABLE',
    title: 'Package the Minimum Viable Offer', target: 'Edit and condense Money Moves Day Two',
    purpose: 'Help a member package a minimum viable offer.', nextAction: 'Editorially review DAY TWO: Package Your Money Move; reshoot only if QA proves a teaching gap.',
  },
  {
    id: 'E03', group: 'edit_existing', statusLabel: 'EDIT EXISTING — DO NOT RESHOOT', internalStatus: 'EDITORIAL CANDIDATE — NOT APPROVED OR PLAYABLE',
    title: 'Validate by Making Offers', target: 'Edit and condense Money Moves Day Three',
    purpose: 'Help a member validate by making real offers.', nextAction: 'Editorially review DAY THREE: Create Your Sales Plan; reshoot only if QA proves a teaching gap.',
  },
  { id: 'G01', group: 'tool_first_do_not_film', statusLabel: 'DO NOT FILM YET', slot: 'F4', title: 'Repeat and Evaluate Discovery', target: 'Evidence log + repeat/evaluate decision tool', purpose: 'Close the Find 4 gap with evidence before teaching.', nextAction: 'Test the decision tool in the private pilot; film only if repeated evidence shows it is insufficient.' },
  { id: 'G02', group: 'tool_first_do_not_film', statusLabel: 'DO NOT FILM YET', slot: 'N4', title: 'Learn From Audience Behavior', target: 'Metric definitions + audience-signal review tool', purpose: 'Close the Nurture 4 gap with a calm signal review.', nextAction: 'Pilot the tool and collect evidence before deciding whether to film.' },
  { id: 'G03', group: 'tool_first_do_not_film', statusLabel: 'DO NOT FILM YET', slot: 'S2', title: 'Choose One Sales Process', target: 'Sales-process decision guide', purpose: 'Close the Sell 2 gap with a bounded process choice.', nextAction: 'Establish and test the Faith-led primary source before any filming decision.' },
  { id: 'G04', group: 'tool_first_do_not_film', statusLabel: 'DO NOT FILM YET', slot: 'D1', title: 'Map the Customer Result', target: 'Customer Result Canvas', purpose: 'Close the Deliver 1 gap by mapping the promised result.', nextAction: 'Pilot the canvas; film only if members need additional explanation.' },
  { id: 'G05', group: 'tool_first_do_not_film', statusLabel: 'DO NOT FILM YET', slot: 'D3', title: 'Support Follow-Through', target: 'Follow-through checkpoint + support loop', purpose: 'Close the Deliver 3 gap with a practical support loop.', nextAction: 'Test the support tool before deciding whether a micro-video is needed.' },
  { id: 'G06', group: 'tool_first_do_not_film', statusLabel: 'DO NOT FILM YET', slot: 'L3', title: 'Choose the Right Leverage', target: 'Leverage decision matrix + safety gate', purpose: 'Close the Leverage 3 gap without a general lecture.', nextAction: 'Pilot the decision matrix and safety gate before filming.' },
  { id: 'G07', group: 'tool_first_do_not_film', statusLabel: 'DO NOT FILM YET', slot: 'L4', title: 'Lead Through Evidence and Capacity', target: 'Operating scorecard + capacity review', purpose: 'Close the Leverage 4 gap with stable evidence measures.', nextAction: 'Stabilize the scorecard measures before considering a video.' },
  {
    id: 'D01', group: 'deferred', statusLabel: 'VIDEO DEFERRED', title: 'Safely Manage Your First AI Employee',
    target: 'Interactive text + AI Employee Job Card first', purpose: 'Teach a beginner workflow only after its runtime, approvals, and receipts are stable.',
    nextAction: 'Build and test the interactive Job Card; record the walkthrough after product behavior is stable.',
  },
] as const satisfies readonly FilmingManifestItem[];

export const filmingManifestSummary = '1 new now / 3 edits / 7 tool-first / 1 deferred' as const;
