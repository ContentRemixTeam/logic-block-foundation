import type { MoneyTrack } from '@/constants/moneyMovesConfig';

export interface LadderAction {
  label: string;
  dueOffsetDays: number;
}

export interface Rung {
  number: number;
  title: string;
  moveTitle: string;
  moveWhy: string;
  defaultActions: [LadderAction, LadderAction, LadderAction];
}

export const LADDER: Record<MoneyTrack, Rung[]> = {
  offer_foundation: [
    {
      number: 1,
      title: 'Name one offer idea',
      moveTitle: 'Choose one thing you could sell.',
      moveWhy: 'You can\'t sell what you haven\'t named. Pick one idea to move on.',
      defaultActions: [
        { label: 'Write the offer idea', dueOffsetDays: 1 },
        { label: 'Write who it helps', dueOffsetDays: 2 },
        { label: 'Write the result they want', dueOffsetDays: 3 },
      ],
    },
    {
      number: 2,
      title: 'Clarify the problem',
      moveTitle: 'Name the problem your offer solves.',
      moveWhy: 'Clarity on the problem is what makes the offer land.',
      defaultActions: [
        { label: 'Write the problem', dueOffsetDays: 1 },
        { label: 'Write why it matters now', dueOffsetDays: 2 },
        { label: 'Write what changes after they solve it', dueOffsetDays: 3 },
      ],
    },
    {
      number: 3,
      title: 'Validate the offer',
      moveTitle: 'Ask 3 people if this is something they want.',
      moveWhy: 'Real demand beats theory every time.',
      defaultActions: [
        { label: 'Write a simple validation question', dueOffsetDays: 1 },
        { label: 'Send it to 3 people', dueOffsetDays: 2 },
        { label: 'Record what they say', dueOffsetDays: 4 },
      ],
    },
  ],
  lead_gen: [
    {
      number: 1,
      title: 'Never or rarely posts publicly',
      moveTitle: 'Post once. Do not make it perfect.',
      moveWhy: 'The first post breaks the seal. Quality comes after consistency.',
      defaultActions: [
        { label: 'Pick one simple idea', dueOffsetDays: 1 },
        { label: 'Post it publicly', dueOffsetDays: 2 },
        { label: 'Mark it done', dueOffsetDays: 2 },
      ],
    },
    {
      number: 2,
      title: 'Posts inconsistently',
      moveTitle: 'Post 3 times this week.',
      moveWhy: 'Rhythm builds reach. Three posts proves you can do it.',
      defaultActions: [
        { label: 'Pick 3 simple post ideas', dueOffsetDays: 1 },
        { label: 'Publish post 1', dueOffsetDays: 2 },
        { label: 'Publish post 2 or 3', dueOffsetDays: 5 },
      ],
    },
    {
      number: 3,
      title: 'Posts but has no plan',
      moveTitle: 'Plan your first week of content.',
      moveWhy: 'A plan lowers the daily decision cost.',
      defaultActions: [
        { label: 'Choose one topic your audience cares about', dueOffsetDays: 1 },
        { label: 'Plan 3-5 posts in the app', dueOffsetDays: 2 },
        { label: 'Publish the first post', dueOffsetDays: 3 },
      ],
    },
    {
      number: 4,
      title: 'Has content but no lead capture',
      moveTitle: 'Create a simple freebie.',
      moveWhy: 'You need a way to convert browsers into people you can email.',
      defaultActions: [
        { label: 'Choose one quick result your freebie gives', dueOffsetDays: 1 },
        { label: 'Name the freebie', dueOffsetDays: 2 },
        { label: 'Write the first simple version or outline', dueOffsetDays: 5 },
      ],
    },
    {
      number: 5,
      title: 'Has a freebie but is not promoting it',
      moveTitle: 'Make one Reel or post selling the freebie.',
      moveWhy: 'A freebie no one sees does not grow a list.',
      defaultActions: [
        { label: 'Write the hook', dueOffsetDays: 1 },
        { label: 'Record or write the post', dueOffsetDays: 2 },
        { label: 'Publish it with the freebie CTA', dueOffsetDays: 3 },
      ],
    },
    {
      number: 6,
      title: 'Has a freebie and some audience',
      moveTitle: 'Pitch 3 collaborations.',
      moveWhy: 'Borrowed audiences grow faster than cold reach.',
      defaultActions: [
        { label: 'List 3 possible collaboration partners', dueOffsetDays: 1 },
        { label: 'Write a simple pitch', dueOffsetDays: 2 },
        { label: 'Send 3 pitches', dueOffsetDays: 4 },
      ],
    },
  ],
  nurture: [
    {
      number: 1,
      title: 'Not emailing',
      moveTitle: 'Send one email this week.',
      moveWhy: 'One email beats a perfect plan that never ships.',
      defaultActions: [
        { label: 'Choose one thing your audience needs to hear', dueOffsetDays: 1 },
        { label: 'Write a simple email', dueOffsetDays: 2 },
        { label: 'Send it', dueOffsetDays: 3 },
      ],
    },
    {
      number: 2,
      title: 'Emails occasionally, no rhythm',
      moveTitle: 'Pick an email day and send on that day.',
      moveWhy: 'A predictable cadence trains your list to expect you.',
      defaultActions: [
        { label: 'Choose your weekly email day', dueOffsetDays: 1 },
        { label: "Write this week's email", dueOffsetDays: 2 },
        { label: 'Send it on the chosen day', dueOffsetDays: 4 },
      ],
    },
    {
      number: 3,
      title: 'Sends emails but not much value',
      moveTitle: 'Send one high-value nurture email.',
      moveWhy: 'Trust is built one useful email at a time.',
      defaultActions: [
        { label: 'Choose one useful insight, result, story, or tip', dueOffsetDays: 1 },
        { label: 'Write the email', dueOffsetDays: 2 },
        { label: 'Send it', dueOffsetDays: 3 },
      ],
    },
    {
      number: 4,
      title: 'Emails consistently but wants stronger nurture',
      moveTitle: 'Add a short video or audio to your weekly email.',
      moveWhy: 'Voice and face deepen the relationship faster than text.',
      defaultActions: [
        { label: 'Pick one idea to explain in 2-5 minutes', dueOffsetDays: 1 },
        { label: 'Record the video or audio', dueOffsetDays: 2 },
        { label: 'Add it to your email', dueOffsetDays: 3 },
      ],
    },
    {
      number: 5,
      title: 'Has consistent nurture but no welcome path',
      moveTitle: 'Map a simple 3-email welcome sequence.',
      moveWhy: 'A welcome sequence does the warm-up while you sleep.',
      defaultActions: [
        { label: 'Email 1: who you are and what to expect', dueOffsetDays: 1 },
        { label: 'Email 2: your story or belief shift', dueOffsetDays: 3 },
        { label: 'Email 3: useful tip or quick win that tees up what you sell', dueOffsetDays: 5 },
      ],
    },
    {
      number: 6,
      title: 'Has a welcome sequence',
      moveTitle: 'Create a private podcast or core nurture asset.',
      moveWhy: 'Deep nurture turns subscribers into believers.',
      defaultActions: [
        { label: 'Pick 3 core ideas your audience needs before buying', dueOffsetDays: 2 },
        { label: 'Outline episode 1', dueOffsetDays: 3 },
        { label: 'Record or draft episode 1', dueOffsetDays: 6 },
      ],
    },
  ],
  sell: [
    {
      number: 1,
      title: 'Has never made an offer publicly',
      moveTitle: 'Pitch something once.',
      moveWhy: 'The first ask is the hardest. Just make it.',
      defaultActions: [
        { label: 'Write what you are selling', dueOffsetDays: 1 },
        { label: 'Write the price', dueOffsetDays: 1 },
        { label: 'Say it publicly or send it to one person', dueOffsetDays: 3 },
      ],
    },
    {
      number: 2,
      title: 'Has pitched but no clear deadline',
      moveTitle: 'Pitch with a real close date.',
      moveWhy: 'Deadlines create decisions.',
      defaultActions: [
        { label: 'Choose the offer', dueOffsetDays: 1 },
        { label: 'Choose the deadline', dueOffsetDays: 1 },
        { label: 'Make the ask with the deadline included', dueOffsetDays: 3 },
      ],
    },
    {
      number: 3,
      title: 'Has made sales but inconsistently',
      moveTitle: 'Run a 48-hour limited-time offer.',
      moveWhy: 'A short window concentrates buying energy.',
      defaultActions: [
        { label: 'Write the offer', dueOffsetDays: 1 },
        { label: 'Open the offer', dueOffsetDays: 3 },
        { label: 'Close the offer', dueOffsetDays: 5 },
      ],
    },
    {
      number: 4,
      title: 'Has an offer but no sales sequence',
      moveTitle: 'Write and send a simple 3-message sales sequence.',
      moveWhy: 'Most sales happen between message 2 and 3.',
      defaultActions: [
        { label: 'Message 1: open the offer', dueOffsetDays: 1 },
        { label: 'Message 2: handle the hesitation or show the result', dueOffsetDays: 3 },
        { label: 'Message 3: last chance before close', dueOffsetDays: 5 },
      ],
    },
    {
      number: 5,
      title: 'Has a sequence but low conversion',
      moveTitle: 'Test a new angle or hook.',
      moveWhy: 'A new angle can outperform a new offer.',
      defaultActions: [
        { label: 'Identify what did not convert', dueOffsetDays: 1 },
        { label: 'Write a new desire-based angle', dueOffsetDays: 2 },
        { label: 'Test the new angle in one post or email', dueOffsetDays: 4 },
      ],
    },
    {
      number: 6,
      title: 'Has a converting offer',
      moveTitle: 'Add an upsell, bonus, or next-step offer.',
      moveWhy: 'Average order value compounds without new traffic.',
      defaultActions: [
        { label: 'Choose the next step', dueOffsetDays: 1 },
        { label: 'Write the upgrade reason', dueOffsetDays: 2 },
        { label: 'Add it to the sales path', dueOffsetDays: 4 },
      ],
    },
  ],
};

export function getRung(track: MoneyTrack, rung: number): Rung {
  const list = LADDER[track];
  return list.find(r => r.number === rung) ?? list[0];
}
