import type { MastermindStageId } from '@/lib/mastermindSuccessPath';

export type MastermindRoundMode = 'build' | 'improve';

export interface MastermindPhaseRound {
  milestoneId: string;
  question: string;
  buildAction: string;
  improveAction: string;
  doneEnough: string;
  evidence: string;
  lowCapacity: string;
  rescue: string;
  primaryResourceId: string;
  primaryResourceTitle: string;
  aiProject: string;
}

export interface CreatorCampPlatformMatch {
  id: string;
  label: string;
  title: string;
  teacher: string;
  status: 'ready_for_entitlement_review' | 'transcript_needed';
}

const round = (
  milestoneId: string,
  question: string,
  buildAction: string,
  improveAction: string,
  doneEnough: string,
  evidence: string,
  lowCapacity: string,
  rescue: string,
  primaryResourceId: string,
  primaryResourceTitle: string,
  aiProject: string,
): MastermindPhaseRound => ({ milestoneId, question, buildAction, improveAction, doneEnough, evidence, lowCapacity, rescue, primaryResourceId, primaryResourceTitle, aiProject });

export const MASTERMIND_PHASE_ROUNDS: Record<MastermindStageId, MastermindPhaseRound[]> = {
  offer: [
    round('offer-focus', 'Does this quarter need a new offer, or a better-supported working offer?', 'Choose the smallest useful offer or paid experiment that fits this quarter.', 'Review recent sales and customer evidence. Name one constraint and what you will not change.', 'The offer has one job this quarter and the next test is clear.', 'Record the route, recent invitations/sales/results, the variable in scope, and protected elements.', 'Review the last three relevant buyer or customer interactions.', 'If I want to rebuild everything, I will name the evidence that requires the change.', 'ninety-day-goal-setting-introduction', '90-Day Goal Setting: Start Here', 'Offer Lab'),
    round('offer-buyer', 'Who can I reach, and what result matters enough to pay to change?', 'Hold buyer conversations and write a provisional buyer/problem/promise.', 'Use recent buyer language to preserve or sharpen only the unclear part.', 'The buyer is reachable and the problem/result uses observed language.', 'Save who was asked, exact words, urgency, desired result, objections, and unknowns.', 'Have one qualified conversation and save one exact-language note.', 'If I am guessing, I will ask one evidence question instead of polishing a persona.', 'money-move-day-one', 'Find Your Next Money Move', 'Offer Lab'),
    round('offer-mvp', 'What is the smallest clear, safe version someone can buy?', 'Create the promise, price, format, scope, boundaries, and next step.', 'Change one diagnosed variable and keep the rest of the working offer stable.', 'A buyer can understand what changes, what it costs, and how to say yes.', 'Save the offer version, changed variable, questions, objections, and interest.', 'Write the one-sentence offer and send it to one qualified person.', 'If I start rewriting everything, I will return to the single variable in scope.', 'money-move-day-two', 'Package Your Money Move', 'Offer Lab'),
    round('offer-validate', 'What happens when qualified people receive a real invitation and follow-up?', 'Make five invitations and complete one follow-up round.', 'Run a comparable test against the existing baseline with one changed variable.', 'The response window and follow-up are complete and facts are separated from interpretation.', 'Record invitations, replies, objections, decisions, sales, revenue, and next decision.', 'Make one direct invitation today and schedule the rest.', 'If silence feels final, I will check qualification, clarity, directness, follow-up, and test size.', 'money-move-day-three', 'Create Your Sales Plan', 'Offer Lab'),
  ],
  find: [
    round('find-path', 'Where will the right people find me for the next four weeks?', 'Choose one capacity-fit discovery lane and complete the first rep.', 'Preserve the strongest lane and choose one measurable improvement.', 'One channel, job, repetition target, indicator, and review date are saved.', 'Record the first rep and baseline qualified reach, replies, searches, referrals, or conversations.', 'Complete one outreach, collaboration ask, searchable post, or buyer-problem post.', 'If I research another platform, I will finish one rep in the chosen lane first.', 'get-social-media-done-workshop-one', 'Get Social Media Done: Workshop One', 'Discovery Engine'),
    round('find-create', 'What will make the right person recognize this is for her?', 'Create and publish four buyer-relevant content or outreach attempts.', 'Repeat the strongest message while changing one format, hook, CTA, or distribution variable.', 'Four coherent attempts exist and each has one response path.', 'Record qualified replies, clicks, searches, profile actions, conversations, and exact language.', 'Publish one useful text, voice, video, community reply, or warm message.', 'If polish takes more than 45 minutes, I will publish the minimum version.', 'great-marketing-breakthrough-day-two', 'Great Marketing Breakthrough: Content Strategy', 'Discovery Engine'),
    round('find-bridge', 'What should an interested person do next?', 'Create one simple reply, conversation, waitlist, opt-in, inquiry, or offer bridge.', 'Repair the first broken handoff in the existing bridge instead of rebuilding it.', 'A stranger can complete the next step and receive what was promised.', 'Save the live test receipt plus opt-ins, replies, inquiries, or breakpoints.', 'Add one reply or conversation CTA and test it with one person.', 'If tech blocks the bridge, I will use a human reply or email path.', 'get-your-freebie-non-boring-idea', 'Get Your Freebie Done: Non-Boring Idea', 'Discovery Engine'),
    round('find-evaluate', 'Is this lane creating enough qualified signal to continue?', 'Complete the agreed reps and decide persist, narrow, adjust, or change lane.', 'Compare this round with the baseline and select the next single improvement.', 'The test is reviewed using buyer quality and signal, not followers alone.', 'Record reps, qualified responses, buyer fit, time cost, strongest message, and next decision.', 'Review the last three reps and choose one thing to repeat.', 'If a quiet week feels like failure, I will check reps, buyer quality, CTA, and test length.', 'great-marketing-breakthrough-day-three', 'Great Marketing Breakthrough: Follow Your Plan', 'Discovery Engine'),
  ],
  nurture: [
    round('nurture-map', 'What happens after discovery and before someone is ready to buy?', 'Map discovery, first value, belief/proof, invitation, and follow-up.', 'Walk one real person through the existing path and repair the first missing handoff.', 'One simple nurture path and one current gap are visible.', 'Save the entry source, owned connection, belief/proof need, invitation, follow-up, and test receipt.', 'Map one person from discovery to the next invitation.', 'If I draw a giant funnel, I will repair only the first handoff.', 'get-your-freebie-non-boring-idea', 'Get Your Freebie Done: Non-Boring Idea', 'Nurture Desk'),
    round('nurture-content', 'What does my buyer need to understand, believe, see, or do next?', 'Create recognition, belief, proof/story, and invitation messages.', 'Use audience response to improve one job in the current nurture content.', 'Every message has one job tied to the current offer.', 'Record replies, clicks, questions, objections, buying signals, and quiet spots.', 'Send one plain-text message about the strongest question or belief gap.', 'If this content could support any offer, I will reconnect it to this buyer decision.', 'great-marketing-breakthrough-day-two', 'Great Marketing Breakthrough: Content Strategy', 'Nurture Desk'),
    round('nurture-email', 'What is the smallest sustainable welcome and nurture rhythm?', 'Send one welcome email and schedule the next useful email.', 'Improve the missing welcome, nurture, invitation, or follow-up element.', 'A subscriber receives value, knows what comes next, and can reach the offer.', 'Save the end-to-end test, first send, replies, clicks, opt-outs, and next send date.', 'Send one plain-text email manually.', 'If automation delays contact, I will send the useful email first.', 'get-your-freebie-welcome-email', 'Get Your Freebie Done: Welcome Email', 'Nurture Desk'),
    round('nurture-evaluate', 'What is the audience showing me about readiness and relevance?', 'Review one response window and choose one next experiment.', 'Compare the current signal with the prior baseline and improve one element.', 'Facts and interpretation are separated and one experiment is selected.', 'Record messages, replies, contextual clicks, questions, opt-outs, signals, and next hypothesis.', 'Review the last three audience responses and choose one follow-up.', 'If engagement is low, I will check relevance, list quality, invitation clarity, and response path first.', 'great-marketing-breakthrough-day-three', 'Great Marketing Breakthrough: Follow Your Plan', 'Nurture Desk'),
  ],
  sell: [
    round('sell-math', 'What sales activity would make this 90-day goal possible?', 'Choose one offer and calculate sales, invitations, and follow-ups needed.', 'Use actual conversion and customer value to select one economic lever.', 'The target connects to feasible sales activity, capacity, and dates.', 'Save target, baseline, offer, value, assumed conversion, invitation target, and review date.', 'Calculate sales needed and name the first three invitations.', 'If the math feels discouraging, I will shrink the test or choose a faster qualified path.', 'money-move-day-three', 'Create Your Sales Plan', 'Sales Room'),
    round('sell-process', 'How will a qualified buyer move from invitation to a clear decision?', 'Choose one sales motion and test invitation, response, decision, payment, and follow-up.', 'Keep the proven motion and repair one measured stage.', 'A buyer can move through the whole process without hidden steps.', 'Save the motion, tested path, owner, follow-up cadence, and breakpoints.', 'Create one invitation, response path, and follow-up date.', 'If I start building a complicated funnel, I will use the shortest safe decision path.', 'launch-aligned-half-ass-launch', 'Launch Aligned: Half-Ass Launch', 'Sales Room'),
    round('sell-run', 'Will I complete the invitation, response, follow-up, and decision cycle?', 'Run the agreed invitation and follow-up target through the decision window.', 'Run a comparable cycle without changing the offer mid-test.', 'The complete sales process has run, including follow-up.', 'Record invitations, conversations, objections, follow-ups, decisions, sales, revenue, and missed steps.', 'Send one invitation and one appropriate follow-up today.', 'If fear sends me to asset editing, I will invite one qualified person first.', 'bosses-make-sales-day-one', 'Bosses Make Sales: Day One', 'Sales Room'),
    round('sell-evaluate', 'Where did the sales cycle actually work or break?', 'Debrief the complete cycle and choose one variable for the next round.', 'Compare denominators and conversion by stage against the existing baseline.', 'One evidence-backed persist, improve, or reroute decision is saved.', 'Record stage counts, buyer quality, objections, time cost, breakdown, and next test.', 'Review the last five invitations and choose one repeat or improve decision.', 'If I decide the offer is broken, I will locate the exact stage and denominator first.', 'launch-aligned-debrief', 'Launch Aligned: Debrief', 'Sales Room'),
  ],
  deliver: [
    round('deliver-result', 'What did the customer buy, and what progress leads to that result?', 'Map the promise, first win, customer actions, evidence, support, and boundaries.', 'Compare the intended journey with real customer progress and friction.', 'A customer-result map and one improvement point are clear.', 'Save starting state, first win, milestones, evidence, friction, support, and examples.', 'Map one customer from purchase to first meaningful win.', 'If I list lessons or features, I will rewrite them as customer actions or results.', 'program-upgrade-strategic-improvement', 'Program Upgrade: Strategic Improvement', 'Customer Results Lab'),
    round('deliver-first-win', 'What should a new customer do first to feel movement quickly?', 'Create one welcome, first action, expectation, and help path.', 'Reduce time-to-first-value or confusion in the existing onboarding.', 'The customer knows and can complete the first action and find help.', 'Record time to first action/win, completion, confusion, questions, and support requests.', 'Send one welcome, one first action, and one help route.', 'If onboarding grows beyond the first win, I will move later information out.', 'program-upgrade-onboarding-upgrade', 'Program Upgrade: Onboarding Upgrade', 'Customer Results Lab'),
    round('deliver-follow-through', 'How will I know who is moving, stuck, or needs different help?', 'Create and send one three-question progress pulse.', 'Keep only progress questions that change a support decision.', 'Customers can report progress and the owner can classify the stall.', 'Record response, progress marker, stall type, support action, response time, and recovery.', 'Send one check-in at the most important stall point.', 'If tracking becomes burdensome, I will keep only the decision-changing question.', 'program-upgrade-surprise-and-delight', 'Program Upgrade: Surprise and Delight', 'Customer Results Lab'),
    round('deliver-proof', 'What did customers achieve, and what should improve next?', 'Ask for permissioned feedback at a meaningful progress point.', 'Use real outcome/retention/referral evidence to choose one bounded improvement.', 'Proof is accurate and permissioned and one improvement is selected.', 'Record permission, exact progress, context, language, friction, and improvement result.', 'Have one feedback conversation and make one small improvement.', 'If I want to add content, I will first test clarity, sequence, support, or action.', 'program-upgrade-offboard-like-a-boss', 'Program Upgrade: Offboard Like a Boss', 'Customer Results Lab'),
  ],
  leverage: [
    round('leverage-constraint', 'What repeated work is slowing the current 90-day result most?', 'Observe and time one repeated workflow connected to the goal.', 'Choose the proven workflow with the largest measured load or growth constraint.', 'One workflow and usable baseline are selected.', 'Record trigger/end, owner, frequency, minutes, wait, rework, volume, and impact.', 'Time one task and write its start and end.', 'If a shiny tool drives the choice, I will return to the goal and baseline.', 'do-less-make-more-workshop', 'Do Less Make More Workshop', 'Workflow and Systems Lab'),
    round('leverage-simplify', 'What is the simplest version that still produces acceptable quality?', 'Remove unnecessary steps and write a happy-path checklist plus one exception.', 'Test whether a second operator can run the simplified documented workflow.', 'A second operator can produce acceptable output without hidden founder knowledge.', 'Record time, questions, errors, missing inputs, quality, and founder intervention.', 'Write the happy path and one exception rule.', 'If the SOP becomes longer than the work, I will simplify before documenting more.', 'do-less-make-more-workshop', 'Do Less Make More Workshop', 'Workflow and Systems Lab'),
    round('leverage-choice', 'Should this be deleted, templated, AI-assisted, delegated, or automated?', 'Choose the lowest-complexity method and run one reversible supervised test.', 'Compare the method with the manual baseline on time, quality, cost, and review burden.', 'The method is useful without unacceptable risk or review load.', 'Record allowed/blocked actions, approval, rollback, time, quality, corrections, cost, and exceptions.', 'Use a template or AI draft with human review.', 'If setup takes longer than it saves, I will reduce scope or return to manual/template.', 'faith-ai', 'AI Business Profile + Safe Job Card', 'Workflow and Systems Lab'),
    round('leverage-evaluate', 'Did this reduce load while protecting quality?', 'Complete three supervised runs and make a keep, improve, pause, or rollback decision.', 'Review the scorecard against the baseline and reassign saved capacity to the active constraint.', 'Ownership, quality, approvals, receipts, escalation, and stop rules work in practice.', 'Record minutes saved, cycle time, quality, rework, exceptions, cost, and downstream result.', 'Complete three supervised runs and one debrief.', 'If quality falls or exceptions repeat, I will pause expansion and repair the workflow.', 'do-less-make-more-bonus-coaching', 'Do Less Make More Bonus Coaching', 'Workflow and Systems Lab'),
  ],
};

export const CREATOR_CAMP_PLATFORM_MATCHES: CreatorCampPlatformMatch[] = [
  { id: 'instagram-system', label: 'Instagram', title: 'Content Creation System for Instagram and TikTok', teacher: 'Sarah Magnoni', status: 'transcript_needed' },
  { id: 'instagram-reels', label: 'Instagram Reels', title: 'Easy and Effective Ways to Create Instagram Reels', teacher: 'Katie Tovey-Grindlay', status: 'transcript_needed' },
  { id: 'instagram-funnel', label: 'Instagram leads', title: 'Funnels Over Followers: Rethinking Success on Instagram', teacher: 'Brittany Verlenich', status: 'transcript_needed' },
  { id: 'tiktok', label: 'TikTok', title: 'How to Get Your First 1000 Followers on TikTok', teacher: 'Megan Griffith', status: 'transcript_needed' },
  { id: 'youtube', label: 'YouTube', title: 'Creating YouTube Videos That Convert to Paid Clients', teacher: 'Megan Griffith', status: 'transcript_needed' },
  { id: 'pinterest', label: 'Pinterest', title: 'Profitable Pinterest Blueprint', teacher: 'Camille Kurtenbach', status: 'transcript_needed' },
  { id: 'pinterest-seo', label: 'Pinterest SEO', title: 'Crafting a Pinterest SEO Strategy', teacher: 'Heather Farris', status: 'transcript_needed' },
  { id: 'linkedin', label: 'LinkedIn', title: 'LinkedIn: Getting Started & Best Practices', teacher: 'Karen McClure', status: 'transcript_needed' },
  { id: 'threads', label: 'Threads', title: 'Threads for Growth', teacher: 'Monica Monfre', status: 'transcript_needed' },
  { id: 'networking', label: 'Networking', title: 'Non-Sleazy Networking', teacher: 'Tavona Denise', status: 'ready_for_entitlement_review' },
];

export function getMastermindPhaseRound(stageId: MastermindStageId, milestoneId?: string | null) {
  const rounds = MASTERMIND_PHASE_ROUNDS[stageId];
  return rounds.find((item) => item.milestoneId === milestoneId) ?? rounds[0];
}
