/**
 * Platform Content Strategy Configurations
 * 
 * Deep, platform-specific conversion intelligence for generating high-quality,
 * high-converting content optimized for each platform's algorithm, audience
 * behavior, and engagement mechanics.
 * 
 * This file provides the strategic layer that ensures AI-generated content
 * follows proven patterns for each platform.
 */

export interface PlatformStrategyConfig {
  // Platform fundamentals
  platform: string;
  displayName: string;
  description: string;
  contentType: 'written' | 'video_script' | 'hybrid';
  
  // Audience & psychology
  audienceBehavior: {
    whyTheyreHere: string;
    scrollingMindset: string;
    engagementTriggers: string[];
    whatMakesThemStop: string[];
  };
  
  // Content format rules
  formatRules: {
    optimalLength: { min: number; max: number; unit: 'words' | 'characters' };
    structure: string[];
    hookRequirements: string[];
    visualNotes: string[];
    formattingTips: string[];
  };
  
  // Conversion psychology
  conversionMechanics: {
    primaryGoal: string;
    secondaryGoals: string[];
    ctaStrategy: string;
    engagementBoosters: string[];
    avoidAtAllCosts: string[];
  };
  
  // Platform-specific patterns that work
  psychologicalHooks: string[];
  bestPerformingFormats: string[];
  
  // Gold standard examples
  goldStandardExamples: {
    hooks: string[];
    fullPostExample: string;
    whyItWorks: string[];
  };
  
  // Common mistakes
  platformSpecificMistakes: string[];
  
  // Generation instructions for AI
  aiGenerationPrompt: string;
}

// ============================================
// INSTAGRAM STRATEGY
// ============================================
export const INSTAGRAM_STRATEGY: PlatformStrategyConfig = {
  platform: 'instagram',
  displayName: 'Instagram',
  description: 'Visual-first platform for inspiration, entertainment, and community building',
  contentType: 'written',
  
  audienceBehavior: {
    whyTheyreHere: 'Seeking inspiration, entertainment, connection. They want to feel something - motivated, understood, entertained, or inspired.',
    scrollingMindset: 'Fast thumb-scrolling, decision to stop in 0.3 seconds. Looking for patterns that break the visual monotony.',
    engagementTriggers: [
      'Relatable content that makes them think "this is SO me"',
      'Aspirational content they want to be associated with',
      'Educational value they can apply immediately',
      'Behind-the-scenes that feels exclusive',
      'Controversial takes they have an opinion on'
    ],
    whatMakesThemStop: [
      'Bold, unexpected opening lines',
      'Pattern interrupts (unusual formatting)',
      'Personal stories with emotional hooks',
      'Numbers and specific claims',
      'Direct address ("You...")'
    ]
  },
  
  formatRules: {
    optimalLength: { min: 100, max: 200, unit: 'words' },
    structure: [
      'Hook in first 5 words (visible above "...more")',
      'Line break after hook',
      'Short paragraphs (1-3 sentences max)',
      'White space between ideas',
      'Question OR soft CTA at end',
      '3-5 relevant hashtags at the very end'
    ],
    hookRequirements: [
      'Must be compelling in isolation (before "...more" click)',
      'Create curiosity gap or immediate resonance',
      'Avoid starting with "I" unless it\'s a shocking admission',
      'Numbers, lists, or contrarian takes work well'
    ],
    visualNotes: [
      'Caption complements visual, doesn\'t repeat it',
      'First line can be text overlay on image',
      'Emojis sparingly - max 3-5 total',
      'Use line breaks as "visual breathing room"'
    ],
    formattingTips: [
      'Break after every 1-2 sentences',
      'Use • or → for lists (not dashes)',
      'One idea per paragraph',
      'End with engagement driver (question or soft CTA)'
    ]
  },
  
  conversionMechanics: {
    primaryGoal: 'Drive SAVES - algorithm loves saves, signals high-value content',
    secondaryGoals: [
      'Comments (triggers reply notifications, builds relationship)',
      'Shares to stories (massive reach expansion)',
      'Profile visits (opportunity for bio link click)'
    ],
    ctaStrategy: 'Soft CTAs work best. Ask questions, invite opinions, or create "save this for later" moments. Avoid hard sells in feed content.',
    engagementBoosters: [
      'End with a question they can answer quickly',
      '"Save this for later" hooks (lists, frameworks, tips)',
      'Controversial or polarizing takes that demand a response',
      'Fill-in-the-blank prompts',
      '"Tell me in comments" invitations'
    ],
    avoidAtAllCosts: [
      'Long unbroken paragraphs (wall of text)',
      'Hard selling in feed posts',
      'More than 10 hashtags',
      'Hashtags in the middle of captions',
      'Generic motivational quotes without personal angle',
      'Asking for follows directly'
    ]
  },
  
  psychologicalHooks: [
    'The [X] mistake that cost me [specific result]',
    'Stop doing [common thing] if you want [desired outcome]',
    'I was today years old when I learned...',
    'POV: You finally [desired outcome]',
    'The truth about [topic] nobody talks about',
    'I used to [old behavior]. Then I realized [insight].',
    'Unpopular opinion: [contrarian take]',
    '[Number] signs you\'re [identity/situation]',
    'This one shift changed everything for my [area]',
    'You\'re not [negative label]. You\'re [reframe].'
  ],
  
  bestPerformingFormats: [
    'Listicles (3-7 items with brief explanations)',
    'Before/after transformations',
    'Hot takes with reasoning',
    'Behind-the-scenes with lessons',
    'Client/customer win stories',
    '"Day in the life" with insights',
    'Myth-busting posts',
    'Personal stories with takeaways'
  ],
  
  goldStandardExamples: {
    hooks: [
      'The $50,000 lesson I learned the hard way.',
      'Stop romanticizing "hustle culture." Here\'s why.',
      'Nobody talks about the ugly middle of building a business.',
      'I fired my best client last week.',
      'The advice I wish I ignored when starting out:'
    ],
    fullPostExample: `The $50,000 lesson I learned the hard way.

When I first started, I said yes to everyone.

Every client. Every project. Every "opportunity."

I thought busy meant successful.

Spoiler: it doesn't.

That year, I made less than I did working my 9-5.
I burned out. Twice.
I nearly quit altogether.

The turning point?

Learning that "no" is a complete sentence.

Now I only work with clients who:
→ Value my expertise
→ Respect my boundaries  
→ Are ready to do the work

Revenue went up 3x.
Stress went down by half.

What's a lesson you learned the expensive way?

#businesslessons #entrepreneurlife #boundaries`,
    whyItWorks: [
      'Hook creates curiosity with specific number',
      'Vulnerable admission builds trust',
      'Short, punchy sentences for easy scanning',
      'Clear before/after transformation',
      'Actionable framework (the 3 criteria)',
      'Results quantified (3x, half)',
      'Ends with engaging question',
      'Minimal, relevant hashtags'
    ]
  },
  
  platformSpecificMistakes: [
    'Starting with "Hey guys!" or similar greetings',
    'Burying the hook after 2+ sentences',
    'Using hashtags as part of sentences',
    'Posting long captions without line breaks',
    'Being overly salesy or promotional',
    'Generic content that could apply to anyone',
    'Ignoring the visual-caption relationship',
    'Not having a clear takeaway or value prop'
  ],
  
  aiGenerationPrompt: `You are a strategic Instagram content creator who understands the platform's psychology deeply.

CRITICAL RULES:
1. Hook MUST be compelling in the first 5 words (visible before "...more")
2. Use line breaks after every 1-2 sentences
3. Keep total length between 100-200 words
4. End with a question or soft CTA to drive engagement
5. Include 3-5 relevant hashtags at the very end only
6. Focus on creating SAVE-worthy content (lists, frameworks, tips)
7. Be specific - use numbers, examples, personal stories
8. Write like a human, not a brand

FORMAT:
[Compelling hook line]

[Short paragraph 1]

[Short paragraph 2]

[Value/teaching/insight]

[Question or soft CTA]

#relevant #hashtags #here`
};

// ============================================
// LINKEDIN STRATEGY
// ============================================
export const LINKEDIN_STRATEGY: PlatformStrategyConfig = {
  platform: 'linkedin',
  displayName: 'LinkedIn',
  description: 'Professional platform for thought leadership, industry insights, and career growth',
  contentType: 'written',
  
  audienceBehavior: {
    whyTheyreHere: 'Professional development, industry insights, networking, career advancement. They want to look smart and stay informed.',
    scrollingMindset: 'Morning coffee scrollers, lunch break browsers. Looking for insights they can use or share to boost their professional image.',
    engagementTriggers: [
      'Contrarian takes on industry norms',
      'Personal career stories with lessons',
      'Data-backed insights and observations',
      'Leadership and management wisdom',
      'Industry predictions and trends'
    ],
    whatMakesThemStop: [
      'Unexpected admissions or vulnerabilities',
      'Contrarian professional opinions',
      'Specific numbers or results',
      'Titles that challenge conventional wisdom',
      'Personal stories from senior professionals'
    ]
  },
  
  formatRules: {
    optimalLength: { min: 150, max: 300, unit: 'words' },
    structure: [
      'Hook line MUST stand alone (first 210 chars visible)',
      'One sentence paragraphs work well',
      'Clear beginning, middle, end structure',
      'List format for multi-point posts',
      'End with thought-provoking question'
    ],
    hookRequirements: [
      'First 210 characters determine "see more" clicks',
      'Create professional curiosity or challenge assumptions',
      'Personal admission + unexpected twist works well',
      'Avoid clickbait - be substantive but intriguing'
    ],
    visualNotes: [
      'No hashtags in middle of post',
      '3-5 hashtags maximum at the end',
      'Emojis: minimal and professional only',
      'Use → or • for lists'
    ],
    formattingTips: [
      'One idea per line for scanability',
      'Short paragraphs (1-3 sentences)',
      'Use numbers to quantify impact',
      'Break pattern with single-word lines occasionally'
    ]
  },
  
  conversionMechanics: {
    primaryGoal: 'Drive COMMENTS - LinkedIn\'s algorithm heavily favors posts with early comments',
    secondaryGoals: [
      'Follows (builds long-term audience)',
      'Reshares (expands reach significantly)',
      'Profile visits (opportunity for connection requests)'
    ],
    ctaStrategy: 'End with genuine questions that invite professional perspective sharing. Avoid "agree?" - ask for specific opinions or experiences.',
    engagementBoosters: [
      'Pose industry-relevant questions',
      'Share contrarian takes that demand response',
      'Ask for others\' experiences with similar situations',
      'Create "I\'ve been there" moments',
      'Invite specific professional perspectives'
    ],
    avoidAtAllCosts: [
      'Excessive hashtags (#growth #mindset spam)',
      'Generic motivational content',
      'Obviously salesy posts without value',
      'Humble-bragging without genuine insight',
      'Engagement bait ("Like if you agree!")',
      'Copying viral post formats without adding value'
    ]
  },
  
  psychologicalHooks: [
    'I [did unexpected thing]. Here\'s what happened:',
    'Everyone\'s talking about [X]. Here\'s what they\'re missing:',
    'My worst [professional experience] taught me [lesson]',
    'Unpopular opinion: [industry contrarian take]',
    'I got rejected from [impressive thing]. Best thing that happened.',
    'The [title/role] who [unexpected action] taught me more than any course.',
    '[Number] years in [industry]. Here\'s what I\'d tell my younger self:',
    'We [made major decision]. The results surprised everyone.',
    'I stopped [common practice] 6 months ago. Here\'s what changed:',
    'The difference between [good thing] and [great thing]:'
  ],
  
  bestPerformingFormats: [
    'Personal stories with professional lessons',
    'Career mistake → lesson learned arcs',
    'Contrarian industry takes with reasoning',
    'Numbered lists of insights/tips',
    'Before/after professional transformations',
    'Behind-the-scenes of business decisions',
    'Predictions with supporting observations',
    'Framework reveals (how I do X)'
  ],
  
  goldStandardExamples: {
    hooks: [
      'I interviewed 47 candidates last month. Only 3 made it past round one.',
      'Our best-performing team member has never worked in an office.',
      'I was so wrong about remote work.',
      'The highest-paid person in our company has no degree.',
      'I fired myself from my own company. Here\'s why:'
    ],
    fullPostExample: `I interviewed 47 candidates last month.

Only 3 made it past round one.

The difference?

Not experience.
Not credentials.
Not even technical skills.

It was how they talked about failure.

The 3 who made it?

They shared specific failures openly.
Explained what they learned without excuse.
Showed genuine curiosity about our challenges.

The other 44?

Polished answers.
Zero vulnerability.
Scripted responses to "what's your weakness?"

Here's what I've learned after 500+ interviews:

The best people aren't perfect.

They're self-aware.
They're honest.
They're curious.

Credentials get you in the door.
Self-awareness gets you the offer.

Hiring managers: what's the #1 thing you look for that isn't on the resume?`,
    whyItWorks: [
      'Specific numbers create credibility (47 candidates, 3 made it)',
      'Single-line paragraphs for scanability',
      'Unexpected insight (not skills, vulnerability)',
      'Clear contrast (3 vs 44)',
      'Actionable framework (what to do)',
      'Ends with engaging question for comments',
      'Professional without being stuffy'
    ]
  },
  
  platformSpecificMistakes: [
    'Using LinkedIn like Twitter (one-liners without substance)',
    'Excessive emojis and informal language',
    'Hashtag stuffing throughout the post',
    'Obvious humble-brags',
    '"Agree?" as engagement bait',
    'Copying viral formats without original insight',
    'Being overly corporate and stiff',
    'Not having a clear takeaway or lesson'
  ],
  
  aiGenerationPrompt: `You are a thought leader creating LinkedIn content that positions the author as an insightful industry voice.

CRITICAL RULES:
1. First 210 characters MUST hook - this is what shows before "see more"
2. Use single-sentence paragraphs for rhythm
3. Keep total length between 150-300 words
4. Share genuine insights, not platitudes
5. End with a question that invites professional discussion
6. Maximum 3-5 hashtags at the very end
7. Be vulnerable and specific - not generic and polished
8. Focus on LESSONS and INSIGHTS, not just stories

FORMAT:
[Attention-grabbing hook that creates curiosity]

[Setup - the situation or context]

[The unexpected insight or twist]

[What I learned / what this means]

[Question for the community]

#relevant #hashtags`
};

// ============================================
// TWITTER/X STRATEGY
// ============================================
export const TWITTER_STRATEGY: PlatformStrategyConfig = {
  platform: 'twitter',
  displayName: 'Twitter/X',
  description: 'Real-time platform for quick takes, threads, and niche community engagement',
  contentType: 'written',
  
  audienceBehavior: {
    whyTheyreHere: 'Information, hot takes, niche community connection, real-time commentary. They want sharp, quotable insights.',
    scrollingMindset: 'Fast consumption, high volume. Looking for tweets they can quote, share, or screenshot.',
    engagementTriggers: [
      'Sharp, quotable one-liners',
      'Thread promises with value upfront',
      'Hot takes on trending topics',
      'Niche-specific insights',
      'Tactical how-to threads'
    ],
    whatMakesThemStop: [
      'Controversial or contrarian openings',
      'Specific numbers or results',
      'List threads with clear promise',
      'Behind-the-scenes reveals',
      'Quotable wisdom'
    ]
  },
  
  formatRules: {
    optimalLength: { min: 50, max: 280, unit: 'characters' },
    structure: [
      'Single tweet: One complete thought, max impact',
      'Thread: 5-12 tweets, each valuable standalone',
      'Thread hook must promise AND deliver',
      'Number threads for easy following',
      'End thread with summary + CTA'
    ],
    hookRequirements: [
      'First tweet determines thread performance',
      'Create urgency or curiosity immediately',
      'Be specific about what reader will learn',
      'Use numbers when possible'
    ],
    visualNotes: [
      'No hashtags in thread tweets (wastes characters)',
      'One hashtag at end of standalone tweets max',
      'Screenshots and lists perform well',
      'Use line breaks sparingly - space is precious'
    ],
    formattingTips: [
      'Each tweet must be valuable if read alone',
      'Use → or • for micro-lists',
      'Numbers add credibility (specific > vague)',
      'End with retweet-worthy summary'
    ]
  },
  
  conversionMechanics: {
    primaryGoal: 'Drive RETWEETS - this is how tweets go viral and reach new audiences',
    secondaryGoals: [
      'Replies (builds relationship, boosts visibility)',
      'Quote tweets (expands reach with context)',
      'Follows (builds long-term audience)'
    ],
    ctaStrategy: 'Make content so good people WANT to share it. Explicit CTAs ("RT if you agree") feel cheap. Instead: create quotable, screenshot-worthy content.',
    engagementBoosters: [
      'Threads that teach specific skills',
      'Controversial takes that demand response',
      'Lists people want to save/bookmark',
      'Behind-the-scenes reveals',
      '"Tag someone who needs this" (sparingly)'
    ],
    avoidAtAllCosts: [
      'Threads that could be one tweet',
      'Generic motivational content',
      '"RT if you agree" begging',
      'Hashtag spam',
      'Threads without a clear learning/value',
      'Overly long threads (>15 tweets)'
    ]
  },
  
  psychologicalHooks: [
    'Unpopular opinion: [contrarian take]',
    '[Number] things I wish I knew about [topic]:',
    'The difference between [A] and [B]:',
    'Most people [common mistake]. Top performers [better approach]:',
    'I spent [time/money] learning [topic]. Here\'s the summary:',
    'Thread: [Specific skill] in [short time]',
    '[Expert] told me something that changed how I [action]:',
    'The [topic] iceberg: (thread)',
    'If I had to start [thing] from zero, here\'s exactly what I\'d do:',
    'Hot take: [provocative statement]'
  ],
  
  bestPerformingFormats: [
    'Tactical how-to threads',
    'Lessons learned lists',
    'Contrarian hot takes',
    'Framework reveals',
    'Before/after stories (single tweet)',
    'Expert insights distilled',
    'Mistakes to avoid lists',
    '"If I started over" threads'
  ],
  
  goldStandardExamples: {
    hooks: [
      'I spent $50,000 on courses. Here are the 10 lessons that actually mattered: (thread)',
      'Unpopular opinion: Most people don\'t need a morning routine. They need an evening one.',
      'The difference between $50k and $500k businesses isn\'t what you think.',
      'Thread: How to [specific skill] in 30 days (even if you\'re starting from zero)',
      'I\'ve hired 200+ people. The ones who succeed always do this one thing:'
    ],
    fullPostExample: `Thread: 7 copywriting tricks I learned spending $50k on courses

(So you don't have to)

1/ The "So what?" test

After every sentence, ask "so what?"

If you can't answer → delete it.

Your reader is asking this constantly. Beat them to it.

2/ One reader, one problem

Write to ONE specific person.

Not "business owners"
Not "marketers"
Not "entrepreneurs"

Sarah, 34, running a Shopify store, struggling with email.

That specific.

[... tweets 3-6 ...]

7/ The curiosity gap

Never reveal everything upfront.

Create questions in the reader's mind.

Then answer them... one at a time.

---

That's it. 7 lessons worth $50k, free.

If this helped, RT the first tweet.

Follow me @handle for more copywriting breakdowns.`,
    whyItWorks: [
      'Clear promise in hook (7 tricks, $50k value)',
      'Each tweet valuable standalone',
      'Specific, actionable advice',
      'Numbered for easy following',
      'Ends with clear CTA',
      'Creates bookmark/save impulse'
    ]
  },
  
  platformSpecificMistakes: [
    'Threads that could be one tweet',
    'Not making each tweet standalone valuable',
    'Weak thread hooks that don\'t promise value',
    'Too many tweets (>12 loses attention)',
    'Generic content without specific insights',
    'Hashtag overuse',
    'Not numbering thread tweets',
    'Burying the value too deep in thread'
  ],
  
  aiGenerationPrompt: `You are a Twitter/X power user creating punchy, high-value content.

FOR SINGLE TWEETS:
- Maximum 280 characters
- One sharp, quotable insight
- Make it screenshot-worthy
- No hashtags (wastes characters)

FOR THREADS:
- Hook tweet MUST promise specific value
- 5-12 tweets maximum
- Each tweet valuable if read alone
- Number your tweets (1/, 2/, etc.)
- End with summary + follow CTA

CRITICAL RULES:
1. Be specific - use numbers, examples, specifics
2. Be contrarian when appropriate
3. Make it quotable and shareable
4. Every word must earn its place
5. Create "I need to save this" moments

FORMAT (Thread):
[Hook with specific promise]

1/ [First insight - must be strong]

2/ [Second insight]

[... more numbered insights ...]

N/ [Final insight + wrap-up]

---
[Summary or CTA]`
};

// ============================================
// TIKTOK STRATEGY
// ============================================
export const TIKTOK_STRATEGY: PlatformStrategyConfig = {
  platform: 'tiktok',
  displayName: 'TikTok',
  description: 'Entertainment-first platform where educational content must feel fun and immediate',
  contentType: 'video_script',
  
  audienceBehavior: {
    whyTheyreHere: 'Entertainment first, education second. They want to be entertained while learning something.',
    scrollingMindset: 'Endless scroll, 1-2 second attention test. If you don\'t hook immediately, they\'re gone.',
    engagementTriggers: [
      'Pattern interrupts and unexpected twists',
      'High energy delivery',
      'Relatable situations and humor',
      'Quick, actionable tips',
      'Trend participation with unique angle'
    ],
    whatMakesThemStop: [
      'Movement in first second',
      'Unexpected opening lines',
      'Direct eye contact and high energy',
      'On-screen text hooks',
      'Pattern interrupts'
    ]
  },
  
  formatRules: {
    optimalLength: { min: 50, max: 150, unit: 'words' },
    structure: [
      'Hook in first 3 seconds (determines watch-through)',
      'Pattern interrupt every 5-10 seconds',
      '15-60 seconds optimal length',
      'Text overlays for silent viewers',
      'Clear payoff by end'
    ],
    hookRequirements: [
      'First 3 seconds determine if they keep watching',
      'Start with movement, not still frame',
      'Text overlay reinforcing verbal hook',
      'Create immediate curiosity or shock'
    ],
    visualNotes: [
      'Face must be visible quickly',
      'Good lighting essential',
      'Text overlays for key points',
      'Jump cuts maintain energy',
      'Vertical format (9:16)'
    ],
    formattingTips: [
      'Write for spoken word (contractions, casual)',
      'Build in pattern interrupts',
      'End before you think you should',
      'Save the payoff for last 5 seconds'
    ]
  },
  
  conversionMechanics: {
    primaryGoal: 'WATCH TIME - algorithm cares about completion rate above all else',
    secondaryGoals: [
      'Comments (signals engagement)',
      'Shares (expands reach massively)',
      'Follows (builds long-term audience)',
      'Saves (signals high value)'
    ],
    ctaStrategy: 'Soft CTAs work best. "Follow for more" at end, or "Comment [X] if you want part 2." Avoid hard sells that kill entertainment value.',
    engagementBoosters: [
      'Cliffhangers that demand part 2',
      'Asking viewers to comment specific things',
      'Duet/stitch bait content',
      'Controversial takes that demand response',
      '"Wait for the end" hooks'
    ],
    avoidAtAllCosts: [
      'Slow, boring intros',
      'No text overlays (50%+ watch without sound)',
      'Being too polished/corporate',
      'Long, meandering content',
      'Not getting to the point fast enough',
      'Hard selling products'
    ]
  },
  
  psychologicalHooks: [
    'Wait, you\'re still doing [X]?!',
    'The reason your [X] isn\'t working...',
    'I can\'t believe I\'m sharing this but...',
    'This changed everything for my [niche]',
    'Stop scrolling if you want to [benefit]',
    'POV: You finally figure out [solution]',
    'Things [your niche] knows that [general public] doesn\'t',
    'The [topic] hack nobody talks about',
    'I wish someone told me this before [experience]',
    'Storytime: How I [unexpected result]'
  ],
  
  bestPerformingFormats: [
    'Quick tips (numbered, fast-paced)',
    'Storytime with lessons',
    'Day in the life with insights',
    'Before/after reveals',
    'Mistakes to avoid lists',
    'Reply to comments (Q&A style)',
    'Trend participation with unique twist',
    'POV storytelling'
  ],
  
  goldStandardExamples: {
    hooks: [
      'Stop. If you\'re doing [X], you need to hear this.',
      'The [industry] gatekeepers don\'t want you to know this.',
      'I was today years old when I learned...',
      'This is the [topic] advice I wish existed when I started.',
      'Controversial opinion but hear me out...'
    ],
    fullPostExample: `[HOOK - 0-3 sec]
"Wait, you're STILL writing emails that way?!"

[SETUP - 3-10 sec]
"Three years ago, my emails got like a 5% open rate. I was doing everything wrong."

[TEACHING - 10-40 sec]
"Here's what I changed:

One: I stopped using clickbait subject lines. Now I use curiosity gaps instead.

Two: I write like I'm texting a friend, not a customer.

Three: I always end with a question, never a hard sell."

[PAYOFF - 40-50 sec]
"My open rates? Now hitting 45%. 

Follow for more marketing tips that actually work."

[TEXT OVERLAYS THROUGHOUT]:
- "EMAIL TIPS 📧"
- "5% → 45% open rates"
- "1. Curiosity > Clickbait"
- "2. Text like a friend"
- "3. End with question"`,
    whyItWorks: [
      'Hook creates immediate curiosity in 3 seconds',
      'Personal story adds credibility',
      'Clear, numbered tips for retention',
      'Specific numbers (5% → 45%)',
      'Text overlays for silent viewers',
      'Soft CTA at end',
      'Under 60 seconds total'
    ]
  },
  
  platformSpecificMistakes: [
    'Slow, boring openings (no hook in first 3 sec)',
    'No text overlays for silent viewers',
    'Being too polished/corporate feeling',
    'Not using pattern interrupts',
    'Going on too long without payoff',
    'Copying trends without adding unique angle',
    'Hard selling products/services',
    'Forgetting to create completion incentive'
  ],
  
  aiGenerationPrompt: `You are a TikTok content creator writing video scripts that are entertaining AND educational.

CRITICAL RULES:
1. HOOK in first 3 seconds - or they scroll
2. Keep scripts 50-150 words (15-60 second videos)
3. Include pattern interrupts every 5-10 seconds
4. Write for SPOKEN WORD (contractions, casual language)
5. Include text overlay suggestions [IN BRACKETS]
6. Entertainment value is non-negotiable
7. End with soft CTA

SCRIPT FORMAT:
[HOOK - 0-3 sec]
"Attention-grabbing opening line"
[Text overlay: HOOK KEYWORD]

[SETUP - 3-10 sec]
"Context or problem setup"

[TEACHING - 10-40 sec]
"Main content with pattern interrupts"
[Text overlay: KEY POINT 1]
[Text overlay: KEY POINT 2]

[PAYOFF - 40-50 sec]
"Conclusion with results or wisdom"
[Text overlay: RESULT]

[CTA]
"Soft call to action"`
};

// ============================================
// FACEBOOK STRATEGY
// ============================================
export const FACEBOOK_STRATEGY: PlatformStrategyConfig = {
  platform: 'facebook',
  displayName: 'Facebook',
  description: 'Community-focused platform for personal connection, stories, and group engagement',
  contentType: 'written',
  
  audienceBehavior: {
    whyTheyreHere: 'Connection with friends, family, communities. Seeking content that resonates with their values and life experiences.',
    scrollingMindset: 'Longer attention spans than Instagram. Looking for stories and posts that feel personal and relatable.',
    engagementTriggers: [
      'Personal stories and milestones',
      'Community-building content',
      'Life lessons and reflections',
      'Local/niche community content',
      'Feel-good and inspirational posts'
    ],
    whatMakesThemStop: [
      'Authentic personal sharing',
      'Questions that invite their experience',
      'Stories they can relate to',
      'Behind-the-scenes of real life',
      'Vulnerable admissions'
    ]
  },
  
  formatRules: {
    optimalLength: { min: 100, max: 250, unit: 'words' },
    structure: [
      'Personal, conversational opening',
      'Story or reflection as core',
      'Clear lesson or takeaway',
      'Question or engagement driver at end',
      'Minimal or no hashtags'
    ],
    hookRequirements: [
      'Can be more personal/casual than LinkedIn',
      'Story-based hooks work well',
      'Vulnerability connects',
      'Can be longer than Instagram hook'
    ],
    visualNotes: [
      'Photos with faces perform best',
      'Carousel posts work well',
      'Video gets priority in algorithm',
      'Native video > YouTube links'
    ],
    formattingTips: [
      'Short paragraphs but can be longer than Instagram',
      'Conversational tone',
      'Questions drive comments',
      'Personal pronouns ("I", "you", "we")'
    ]
  },
  
  conversionMechanics: {
    primaryGoal: 'Drive SHARES - shares on Facebook = massive reach expansion',
    secondaryGoals: [
      'Comments (builds community feeling)',
      'Reactions (signals emotional resonance)',
      'Page/profile follows'
    ],
    ctaStrategy: 'Community-oriented CTAs work best. Invite experiences, ask opinions, create "share with someone who..." moments.',
    engagementBoosters: [
      'Ask about their experiences',
      'Create "share with someone who needs this" moments',
      'Polarizing topics (with respect)',
      'Nostalgia and shared memories',
      'Local/community-specific content'
    ],
    avoidAtAllCosts: [
      'Overly promotional content',
      'Link-heavy posts (algorithm punishes)',
      'Impersonal, corporate messaging',
      'Engagement bait ("Share if...")',
      'Cross-posting Instagram content without adaptation',
      'Hashtag overuse'
    ]
  },
  
  psychologicalHooks: [
    'Can I be honest about something?',
    'Something happened today that I need to share...',
    'I used to [old belief]. Then [thing happened].',
    'The best advice I ever got was...',
    'I\'m curious: [question about shared experience]',
    'This might be controversial, but...',
    'A lesson I keep learning over and over:',
    'What [person/experience] taught me about [topic]',
    'The thing about [topic] nobody talks about:',
    'This changed my perspective on [thing]:'
  ],
  
  bestPerformingFormats: [
    'Personal stories with lessons',
    'Reflections on life experiences',
    'Community questions and discussions',
    'Behind-the-scenes of work/life',
    'Milestone celebrations with gratitude',
    'Controversial opinion discussions',
    'Nostalgia and memory posts',
    'Local community content'
  ],
  
  goldStandardExamples: {
    hooks: [
      'Something happened at the grocery store today that I can\'t stop thinking about.',
      'My 8-year-old asked me something at dinner that stopped me in my tracks.',
      'I\'m going to share something I don\'t talk about often.',
      'The best business advice I ever got didn\'t come from a business book.',
      'Can I be real about something for a second?'
    ],
    fullPostExample: `Something happened at the coffee shop this morning.

A woman in line was trying to pay, but her card kept declining. You could see the embarrassment on her face.

Before I could react, the teenager behind me stepped forward and said, "I got it."

No hesitation. No big announcement. Just quiet kindness.

Here's what got me: she was probably 16. Working a part-time job. That $7 latte probably meant more to her budget than it would to most of us.

But she did it anyway.

In a world that sometimes feels divided and angry, I'm holding onto moments like this.

Kindness isn't dead. Sometimes it shows up when you least expect it.

What's a random act of kindness you've witnessed lately? Would love to hear your stories.`,
    whyItWorks: [
      'Story-based hook that creates curiosity',
      'Emotional, relatable narrative',
      'Specific details make it believable',
      'Universal theme (kindness)',
      'Ends with community-building question',
      'Shareable (people want to spread good news)',
      'Personal but not self-centered'
    ]
  },
  
  platformSpecificMistakes: [
    'Treating it like Instagram (same content, different platform)',
    'Being too promotional or salesy',
    'Link dumps without context',
    'Impersonal, brand-voice content',
    'Hashtag overuse',
    'Not engaging in comments',
    'One-line posts without substance',
    'Ignoring the community aspect'
  ],
  
  aiGenerationPrompt: `You are creating Facebook content that builds genuine community connection.

CRITICAL RULES:
1. Lead with personal story or honest reflection
2. Be conversational - write like you're talking to a friend
3. Keep length 100-250 words
4. End with a question that invites their experiences
5. No hashtags (or max 1-2 if highly relevant)
6. Focus on creating SHARE-worthy, feel-good content
7. Be vulnerable and authentic

FORMAT:
[Story-based or vulnerable hook]

[The main story or reflection - with specific details]

[The lesson or insight]

[Community-building question]`
};

// ============================================
// BLOG STRATEGY
// ============================================
export const BLOG_STRATEGY: PlatformStrategyConfig = {
  platform: 'blog',
  displayName: 'Blog Post',
  description: 'Long-form content for SEO, thought leadership, and in-depth teaching',
  contentType: 'written',
  
  audienceBehavior: {
    whyTheyreHere: 'Actively searching for solutions. They have a problem and want comprehensive answers.',
    scrollingMindset: 'Skimming first, reading second. Looking for headers that match their question, then diving deeper.',
    engagementTriggers: [
      'Clear answers to specific questions',
      'Actionable frameworks and steps',
      'Examples and case studies',
      'Comprehensive coverage of topic',
      'Credibility and expertise signals'
    ],
    whatMakesThemStop: [
      'Headlines that match their search intent',
      'Clear promise of value in intro',
      'Scannable structure (headers, bullets)',
      'Specific numbers and results',
      'Author credibility'
    ]
  },
  
  formatRules: {
    optimalLength: { min: 1200, max: 2500, unit: 'words' },
    structure: [
      'Compelling headline with primary keyword',
      'Hook intro (pain point → promise → credibility)',
      'Table of contents for long posts',
      'H2/H3 headers every 200-300 words',
      'Bullet points and numbered lists',
      'Conclusion with clear next step'
    ],
    hookRequirements: [
      'First paragraph must hook AND establish relevance',
      'Address the reader\'s problem directly',
      'Promise specific value they\'ll get',
      'Establish credibility early'
    ],
    visualNotes: [
      'Include relevant images every 300-500 words',
      'Screenshots for tutorials',
      'Charts/graphics for data',
      'Featured image that captures attention'
    ],
    formattingTips: [
      'Use headers for navigation/skimming',
      'Bold key phrases and takeaways',
      'Keep paragraphs to 3-4 sentences max',
      'Include internal and external links'
    ]
  },
  
  conversionMechanics: {
    primaryGoal: 'EMAIL SIGNUP - capture the reader for ongoing relationship',
    secondaryGoals: [
      'Internal link clicks (keep them on site)',
      'Social shares',
      'Comments and engagement',
      'Backlinks (SEO value)'
    ],
    ctaStrategy: 'Offer relevant lead magnet or content upgrade. Place CTAs strategically: after intro, mid-content, and conclusion.',
    engagementBoosters: [
      'Content upgrades (checklist, template)',
      'Related post recommendations',
      'Comment prompts',
      'Social share buttons',
      'Exit-intent offers'
    ],
    avoidAtAllCosts: [
      'Fluffy intros that don\'t get to the point',
      'Walls of text without headers',
      'No clear structure or organization',
      'Keyword stuffing',
      'Thin content without substance',
      'No clear call-to-action'
    ]
  },
  
  psychologicalHooks: [
    'The Complete Guide to [Topic]: Everything You Need to Know',
    '[Number] [Topic] Mistakes (And How to Fix Them)',
    'How to [Desired Outcome] in [Timeframe]: A Step-by-Step Guide',
    '[Topic]: What It Is, Why It Matters, and How to [Action]',
    'The [Year] Guide to [Topic]: [Number] Strategies That Work',
    'Why [Common Approach] Doesn\'t Work (And What to Do Instead)',
    '[Topic] 101: A Beginner\'s Guide to [Outcome]',
    'How I [Achieved Result] in [Timeframe] (And How You Can Too)',
    '[Number] [Topic] Tips from [Experts/Experience]',
    'The Ultimate [Topic] Checklist for [Audience]'
  ],
  
  bestPerformingFormats: [
    'How-to guides with step-by-step instructions',
    'Comprehensive "ultimate guide" posts',
    'Listicles with depth (not just bullet points)',
    'Case studies with results',
    'Comparison posts (A vs B)',
    'Beginner\'s guides',
    'Expert roundups',
    'Mistake-focused posts'
  ],
  
  goldStandardExamples: {
    hooks: [
      'You\'re about to learn the exact [system/method] I used to [achieve result] in [timeframe].',
      'If you\'re struggling with [problem], you\'re not alone. [Stat or observation]. Here\'s how to fix it.',
      'Most [topic] advice is wrong. Here\'s what actually works (based on [experience/data]).',
      'In this guide, you\'ll learn [specific outcome] – even if [common objection].',
      '[Number]% of [group] fail at [thing] because they miss this one crucial step.'
    ],
    fullPostExample: `# How to Write Email Subject Lines That Get 50%+ Open Rates

**You're about to learn the exact system I used to increase email open rates from 15% to 52% in 90 days.**

If you're tired of spending hours crafting emails that nobody opens, you're not alone. The average email open rate is just 21.5% – which means nearly 80% of your work goes unseen.

Here's the good news: with the right subject line formula, you can double (or even triple) your open rates.

In this guide, you'll learn:
- The psychology behind why people open emails
- 7 proven subject line formulas (with examples)
- Common mistakes that kill open rates
- How to A/B test for continuous improvement

Let's dive in.

## Why Most Subject Lines Fail

Before we get to what works, let's understand what doesn't...

[Content continues with H2 sections, bullet points, examples, and actionable advice...]

## Conclusion: Your Subject Line Action Plan

You now have 7 proven formulas to boost your open rates. Here's what to do next:

1. **Audit your last 10 emails** – identify which formula each used
2. **Pick one formula** to test in your next email
3. **Track your results** and iterate

**Want the subject line swipe file?** [CTA: Download the free cheat sheet with 50+ proven subject lines →]`,
    whyItWorks: [
      'Clear, benefit-driven headline',
      'Hook immediately addresses the outcome',
      'Credibility established (15% → 52%)',
      'Table of contents previews value',
      'Scannable structure with headers',
      'Actionable conclusion with next steps',
      'Clear CTA with content upgrade'
    ]
  },
  
  platformSpecificMistakes: [
    'No clear structure or headers',
    'Fluffy intros that don\'t promise value',
    'Too short (thin content)',
    'No visuals or formatting variety',
    'Missing call-to-action',
    'Keyword stuffing for SEO',
    'No internal linking strategy',
    'Conclusion without next steps'
  ],
  
  aiGenerationPrompt: `You are writing a comprehensive blog post that ranks in search AND provides genuine value.

CRITICAL RULES:
1. Start with compelling headline using primary keyword
2. Hook intro must: address pain, promise value, establish credibility
3. Use H2/H3 headers every 200-300 words for structure
4. Include bullet points and numbered lists for scanability
5. Write 1200-2500 words of substantive content
6. End with actionable conclusion and clear CTA
7. Be specific with examples, numbers, and steps
8. Write for skimmers first, then readers

STRUCTURE:
# [SEO-Optimized Headline]

[Hook paragraph: Pain point → Promise → Credibility]

[What you'll learn in this post - bullet list]

## [First Main Section H2]
[Content with examples and specifics]

## [Second Main Section H2]
[Content with examples and specifics]

[... more H2 sections ...]

## Conclusion: [Action-Oriented Wrap-Up]
[Summary + specific next steps + CTA]`
};

// ============================================
// YOUTUBE STRATEGY
// ============================================
export const YOUTUBE_STRATEGY: PlatformStrategyConfig = {
  platform: 'youtube',
  displayName: 'YouTube',
  description: 'Video platform for long-form education, entertainment, and building deep audience connection',
  contentType: 'video_script',
  
  audienceBehavior: {
    whyTheyreHere: 'Learn, be entertained, solve problems. They chose to click on YOUR video over millions of others.',
    scrollingMindset: 'Browsing thumbnails and titles, deciding in 1-2 seconds whether to click.',
    engagementTriggers: [
      'Intriguing thumbnails with clear value',
      'Titles that promise specific outcomes',
      'Early delivery on video promise',
      'Personality and authenticity',
      'Entertainment value even in educational content'
    ],
    whatMakesThemStop: [
      'Thumbnail that creates curiosity',
      'Title that promises specific value',
      'First 10 seconds that hook and promise',
      'Pattern interrupts that maintain attention',
      'Clear topic/outcome clarity'
    ]
  },
  
  formatRules: {
    optimalLength: { min: 200, max: 600, unit: 'words' },
    structure: [
      'Hook (first 10 seconds determines watch-through)',
      'Intro/credibility (10-30 seconds)',
      'Content with pattern interrupts every 30-60 seconds',
      'CTA placement at 80% mark',
      'End screen CTA'
    ],
    hookRequirements: [
      'First 10 seconds must hook OR lose 50%+ viewers',
      'Create curiosity gap or immediate promise',
      'Match the thumbnail and title promise',
      'Don\'t start with "Hey guys what\'s up"'
    ],
    visualNotes: [
      'Talking head with occasional B-roll',
      'Text overlays for key points',
      'Graphics and visualizations for complex ideas',
      'Pattern interrupts (angle changes, zooms)',
      'Timestamps for long-form content'
    ],
    formattingTips: [
      'Write for spoken word',
      'Build in B-roll and visual cues',
      'Note pattern interrupt moments',
      'Include timestamp suggestions'
    ]
  },
  
  conversionMechanics: {
    primaryGoal: 'WATCH TIME - YouTube\'s algorithm prioritizes videos that keep people watching',
    secondaryGoals: [
      'Subscribers (long-term audience building)',
      'Comments (engagement signals)',
      'Likes (positive signals)',
      'Click-through to other videos'
    ],
    ctaStrategy: 'Place subscribe CTA after providing value (not in first 30 seconds). Use end screens. Ask for specific engagement ("comment your biggest takeaway").',
    engagementBoosters: [
      'Pattern interrupts every 30-60 seconds',
      'Open loops (tease what\'s coming)',
      'Specific comment prompts',
      'End screen to related video',
      'Chapter timestamps'
    ],
    avoidAtAllCosts: [
      'Slow, boring intros',
      'Asking to subscribe before providing value',
      'Long rambling without clear structure',
      'Not matching thumbnail/title promise',
      'Monotone delivery',
      'No pattern interrupts'
    ]
  },
  
  psychologicalHooks: [
    'What if I told you [unexpected claim]?',
    'I spent [time/money] learning [thing] so you don\'t have to.',
    'The [topic] trick that [experts/companies] don\'t want you to know',
    '[Number] [topic] mistakes that are costing you [result]',
    'How I went from [bad state] to [good state] in [timeframe]',
    'Stop doing [common thing] – do this instead',
    'I tested [thing] for [timeframe]. Here\'s what happened.',
    'The REAL reason your [thing] isn\'t [desired outcome]',
    'Everything you know about [topic] is wrong',
    'Watch this before you [common action]'
  ],
  
  bestPerformingFormats: [
    'Tutorial/How-to videos',
    'Mistake-focused content',
    'Challenge/experiment videos',
    'Before/after transformations',
    'Expert interviews',
    'Reaction/commentary videos',
    'Day in the life with insights',
    'Tool/resource reviews'
  ],
  
  goldStandardExamples: {
    hooks: [
      'In the next 10 minutes, I\'m going to show you exactly how [specific outcome] – even if [common objection].',
      'Stop. If you\'re about to [common mistake], watch this first.',
      'I spent $10,000 testing [thing]. Here\'s what actually works.',
      'This one change doubled my [metric]. And it\'ll take you 5 minutes.',
      'I\'m about to share something that took me 5 years to figure out.'
    ],
    fullPostExample: `[TITLE]: How to Write Emails That Actually Get Opened (50%+ Open Rates)
[THUMBNAIL]: "50% OPEN RATE?" with shocked face

---

[HOOK - 0-10 seconds]
"Your emails are being ignored. And it's not because your content is bad – it's because no one's even seeing it. In the next 8 minutes, I'm going to show you the exact subject line system I used to go from 15% to 52% open rates."

[TEXT: "15% → 52% open rates"]

[INTRO - 10-30 seconds]  
"I've sent over 2 million emails in my career. And for years, I made every mistake in the book. But after testing hundreds of subject lines, I finally cracked the code. Let me show you exactly what works."

[CONTENT - Main teaching]

[30 sec] "First mistake people make: being too clever. Here's what I mean..."
[PATTERN INTERRUPT: B-roll of email inbox]

[1 min] "The second thing is curiosity gaps. Not clickbait – actual curiosity..."
[TEXT OVERLAY: "Curiosity > Clickbait"]
[PATTERN INTERRUPT: Zoom in]

[... continues with teaching points, pattern interrupts every 30-60 seconds ...]

[80% MARK - CTA]
"If this is helpful, hit subscribe because I share tactics like this every week."

[CONCLUSION]
"So to recap: [3 key points]. Your action step: write 5 subject lines using formula #2 and test them this week."

[END SCREEN]
"Now watch this video on email copywriting to complete the system."`,
    whyItWorks: [
      'Hook immediately promises specific outcome',
      'Credibility established early',
      'Pattern interrupts maintain attention',
      'Clear structure with visual cues',
      'Subscribe CTA after providing value',
      'Ends with specific action step',
      'Leads to next video (session time)'
    ]
  },
  
  platformSpecificMistakes: [
    'Long, boring intros',
    'Asking to subscribe in first 30 seconds',
    'No pattern interrupts (losing viewers)',
    'Not matching thumbnail/title promise',
    'Monotone or low-energy delivery',
    'No clear structure',
    'Missing end screen strategy',
    'Not using chapters/timestamps'
  ],
  
  aiGenerationPrompt: `You are writing a YouTube video script that maximizes watch time and engagement.

CRITICAL RULES:
1. HOOK in first 10 seconds - promise specific value immediately
2. Include pattern interrupt notes every 30-60 seconds
3. Write for SPOKEN WORD (natural, conversational)
4. Include [B-ROLL], [TEXT OVERLAY], and [PATTERN INTERRUPT] cues
5. Place subscribe CTA after providing value (around 80% mark)
6. End with specific action step + next video suggestion
7. Keep scripts 200-600 words (5-15 minute videos)

SCRIPT FORMAT:
[TITLE]: [Engaging, specific title]
[THUMBNAIL CONCEPT]: [Description of thumbnail]

---

[HOOK - 0-10 seconds]
"Compelling opening that promises specific outcome"
[TEXT: Key stat or hook]

[INTRO - 10-30 seconds]
"Establish credibility and preview what they'll learn"

[CONTENT - Teaching sections]
[Timestamp] "[Section 1 topic]"
[Content with specific examples]
[PATTERN INTERRUPT: B-roll/zoom/angle change]

[Timestamp] "[Section 2 topic]"
[Content with specific examples]
[TEXT OVERLAY: Key point]

[... more sections ...]

[80% MARK - CTA]
"Subscribe prompt after delivering value"

[CONCLUSION]
"Recap + specific action step"

[END SCREEN]
"Related video suggestion"`
};

// ============================================
// EMAIL NEWSLETTER STRATEGY
// ============================================
export const EMAIL_NEWSLETTER_STRATEGY: PlatformStrategyConfig = {
  platform: 'email',
  displayName: 'Email Newsletter',
  description: 'Direct-to-inbox content for nurturing relationships and driving action',
  contentType: 'written',
  
  audienceBehavior: {
    whyTheyreHere: 'They opted in – they WANT to hear from you. Warmer than any social platform.',
    scrollingMindset: 'Quick scan of inbox, deciding in 1-2 seconds whether to open based on subject line.',
    engagementTriggers: [
      'Subject lines that create curiosity or urgency',
      'Personal, conversational tone',
      'Valuable insights they can\'t get elsewhere',
      'Consistency and reliability',
      'Feeling of exclusive access'
    ],
    whatMakesThemStop: [
      'Subject line that stands out in crowded inbox',
      'From name they recognize and trust',
      'Preview text that adds context',
      'Sense of personal communication',
      'Clear value proposition'
    ]
  },
  
  formatRules: {
    optimalLength: { min: 300, max: 600, unit: 'words' },
    structure: [
      'Subject line (most important element)',
      'Preview text that complements subject',
      'Personal greeting/hook opening',
      'One main teaching or insight',
      'Clear, single CTA',
      'Consistent sign-off'
    ],
    hookRequirements: [
      'Subject line: 6-10 words, specific + curious',
      'Preview text: extend the subject line, don\'t repeat',
      'First line: hook that rewards the open',
      'Avoid "In this email" or "Today I\'m going to"'
    ],
    visualNotes: [
      'Plain text often outperforms HTML',
      'If using design, keep it simple',
      'One clear CTA button if selling',
      'Mobile-optimized (60%+ open on mobile)'
    ],
    formattingTips: [
      'Short paragraphs (1-3 sentences)',
      'Write like you\'re emailing one friend',
      'One idea per email',
      'PS lines still get read'
    ]
  },
  
  conversionMechanics: {
    primaryGoal: 'REPLIES - replies build relationship and tell algorithms you\'re not spam',
    secondaryGoals: [
      'Click-throughs (to offers, content)',
      'Forwards (organic list growth)',
      'Opens on next email (habit building)'
    ],
    ctaStrategy: 'One clear CTA per email. Soft CTAs (reply to this) for nurture, specific CTAs (click here) for action. Never multiple competing CTAs.',
    engagementBoosters: [
      'Ask questions that invite replies',
      'Share vulnerable moments',
      'Give exclusive insights',
      'Tease next week\'s email',
      'PS with personal touch or secondary offer'
    ],
    avoidAtAllCosts: [
      'Selling in every email',
      'Multiple CTAs competing for attention',
      'Impersonal, corporate tone',
      'Inconsistent sending',
      'Subject lines that feel like spam',
      'Too long (respect their time)'
    ]
  },
  
  psychologicalHooks: [
    '[Specific result] in [timeframe] (here\'s how)',
    'The [topic] mistake I made (so you don\'t have to)',
    'What [authority figure] taught me about [topic]',
    'I wasn\'t going to share this, but...',
    'The [adjective] truth about [topic]',
    'Quick question about [topic]',
    '3 things I learned [doing X] this week',
    '[Number]% of [people] get this wrong',
    'The email I wish I received when [situation]',
    'Stop [common action] (do this instead)'
  ],
  
  bestPerformingFormats: [
    'One big idea emails',
    'Story + lesson format',
    'Quick tips or insights',
    'Behind-the-scenes shares',
    'Curated resources',
    'Q&A from reader questions',
    'Personal reflections',
    'How-to micro-tutorials'
  ],
  
  goldStandardExamples: {
    hooks: [
      'Subject: The $50k lesson I learned the hard way\nPreview: (and how to avoid my mistake)',
      'Subject: Quick question about your goals\nPreview: Only takes 30 seconds to answer',
      'Subject: I almost didn\'t send this...\nPreview: But I think you need to hear it',
      'Subject: 3 things that worked this week\nPreview: Stealing from my own playbook',
      'Subject: The weird trick that doubled my [metric]\nPreview: Takes 5 minutes to implement'
    ],
    fullPostExample: `Subject: The email that changed my business
Preview: It was 47 words long.

Hey [Name],

Three years ago, I got an email that changed everything.

It was from a mentor I'd been trying to connect with for months.

47 words. That's all it was.

But in those 47 words, she said something I'll never forget:

"Stop trying to be everywhere. Pick one thing, do it better than anyone else, and let people come to you."

At the time, I was doing:
- Daily Instagram
- Weekly YouTube
- Two podcasts
- A blog
- AND trying to write a book

I was exhausted. And none of it was working.

So I took her advice.

I picked ONE thing (my newsletter).
I committed to making it the best in my niche.
I let everything else go.

Two years later? This email list is now my entire business.

Here's my question for you:

What's the ONE thing you'd pick if you could only do one?

Hit reply and let me know – I read every response.

Talk soon,
[Name]

PS - If you're feeling stretched too thin, you're not alone. Reply with "FOCUS" and I'll share the exact framework I used to simplify.`,
    whyItWorks: [
      'Subject line creates curiosity with specificity',
      'Preview text extends without repeating',
      'Opens with story hook',
      'Short paragraphs for easy reading',
      'Clear, valuable teaching',
      'Personal and vulnerable tone',
      'Single CTA (reply)',
      'PS adds secondary engagement option'
    ]
  },
  
  platformSpecificMistakes: [
    'Treating email like a blog post (too long)',
    'Multiple CTAs competing for attention',
    'Impersonal, corporate tone',
    'Selling in every email',
    'Clickbait subject lines that don\'t deliver',
    'No clear value or takeaway',
    'Inconsistent sending schedule',
    'Ignoring mobile readers'
  ],
  
  aiGenerationPrompt: `You are writing a personal email newsletter that builds relationship and provides value.

CRITICAL RULES:
1. Subject line: 6-10 words, specific + creates curiosity
2. Preview text: Extends subject, doesn't repeat it
3. Write like you're emailing ONE friend
4. One main teaching or insight per email
5. Keep length to 300-600 words
6. Single, clear CTA (usually reply or click)
7. Short paragraphs (1-3 sentences)
8. PS line for personality or secondary offer

FORMAT:
Subject: [Specific, curiosity-inducing subject line]
Preview: [Text that extends the subject]

---

Hey [Name],

[Hook: Story, question, or personal moment]

[The main teaching or insight - 2-3 short paragraphs]

[What this means for them / how to apply it]

[Single CTA - question to prompt reply or specific link]

Talk soon,
[Your name]

PS - [Personal touch or secondary offer]`
};

// ============================================
// EXPORT ALL STRATEGIES
// ============================================
export const PLATFORM_STRATEGIES: Record<string, PlatformStrategyConfig> = {
  instagram: INSTAGRAM_STRATEGY,
  linkedin: LINKEDIN_STRATEGY,
  twitter: TWITTER_STRATEGY,
  tiktok: TIKTOK_STRATEGY,
  facebook: FACEBOOK_STRATEGY,
  blog: BLOG_STRATEGY,
  youtube: YOUTUBE_STRATEGY,
  email: EMAIL_NEWSLETTER_STRATEGY,
};

export function getPlatformStrategy(platform: string): PlatformStrategyConfig | undefined {
  return PLATFORM_STRATEGIES[platform.toLowerCase()];
}

export function getAllPlatformNames(): string[] {
  return Object.keys(PLATFORM_STRATEGIES);
}

/**
 * Get a summarized version of the strategy for AI prompt injection
 */
export function getStrategyPromptSummary(platform: string): string {
  const strategy = getPlatformStrategy(platform);
  if (!strategy) return '';
  
  return `
Platform: ${strategy.displayName}
Content Type: ${strategy.contentType}
Optimal Length: ${strategy.formatRules.optimalLength.min}-${strategy.formatRules.optimalLength.max} ${strategy.formatRules.optimalLength.unit}

KEY RULES:
${strategy.formatRules.structure.map(s => `- ${s}`).join('\n')}

HOOKS THAT WORK:
${strategy.psychologicalHooks.slice(0, 5).map(h => `- "${h}"`).join('\n')}

AVOID:
${strategy.conversionMechanics.avoidAtAllCosts.map(a => `- ${a}`).join('\n')}

${strategy.aiGenerationPrompt}
`;
}
