// Bundle Product Recommendation Data — Free gifts, VIP gifts, and sponsor info

export interface BundleProduct {
  name: string;
  giftName: string;
  url: string;
  category: string;
  description: string;
  value: string;
  isSponsor: boolean;
  sponsorLevel?: 'gold' | 'silver';
  isVip: boolean;
  tags: string[];
}

// Sponsor names for matching
const SPONSORS: Record<string, 'gold' | 'silver'> = {
  'Suzanne Castle': 'gold',
  'Alison Reeves': 'gold',
  'Elizabeth Goddard': 'gold',
  'Germaine Foley': 'gold',
  'Gabe Cox': 'gold',
  'Wendy White': 'gold',
  'Sherry Smothermon-Short': 'gold',
  'Julia Schuerer': 'gold',
  'Monica Froese': 'gold',
  'Michelle Mazur': 'gold',
  'Heather Ritchie': 'silver',
  'Tammy Mack': 'silver',
  'Heather Marie Pottier': 'silver',
};

function isSponsor(name: string): boolean {
  return name in SPONSORS;
}

function getSponsorLevel(name: string): 'gold' | 'silver' | undefined {
  return SPONSORS[name];
}

// Tag assignment helper based on category + keywords in description
function assignTags(category: string, description: string, giftName: string): string[] {
  const tags: string[] = [];
  const text = `${category} ${description} ${giftName}`.toLowerCase();

  // Platform tags
  if (text.includes('instagram') || text.includes('reels') || text.includes('carousel')) tags.push('instagram');
  if (text.includes('pinterest') || text.includes('pin')) tags.push('pinterest');
  if (text.includes('youtube') || text.includes('video')) tags.push('youtube');
  if (text.includes('linkedin')) tags.push('linkedin');
  if (text.includes('blog') || text.includes('seo') || text.includes('search engine')) tags.push('blog-seo');
  if (text.includes('podcast') || text.includes('podcasting')) tags.push('podcast');
  if (text.includes('facebook') || text.includes('fb ')) tags.push('facebook');
  if (text.includes('tiktok')) tags.push('tiktok');
  if (text.includes('social media') || text.includes('social')) tags.push('social-media');

  // Nurture tags
  if (text.includes('email') || text.includes('newsletter') || text.includes('inbox') || text.includes('sequence') || text.includes('broadcast')) tags.push('email');
  if (text.includes('community') || text.includes('membership') || text.includes('group')) tags.push('community');
  if (text.includes('lead magnet') || text.includes('opt-in') || text.includes('freebie') || text.includes('lead gen')) tags.push('lead-magnet');
  if (text.includes('nurture') || text.includes('engagement') || text.includes('connect')) tags.push('nurture');

  // Convert tags
  if (text.includes('sales page') || text.includes('sales copy') || text.includes('conversion') || text.includes('convert')) tags.push('sales-page');
  if (text.includes('webinar') || text.includes('masterclass') || text.includes('workshop')) tags.push('webinar');
  if (text.includes('dm ') || text.includes('dm-') || text.includes('direct message') || text.includes('conversation')) tags.push('dm-selling');
  if (text.includes('launch') || text.includes('funnel')) tags.push('email-launch');
  if (text.includes('checkout') || text.includes('pricing') || text.includes('price')) tags.push('checkout-link');
  if (text.includes('call') || text.includes('discovery') || text.includes('speaking')) tags.push('calls');

  // General tags
  if (text.includes('ai') || text.includes('chatgpt') || text.includes('gpt') || text.includes('automation')) tags.push('ai-tools');
  if (text.includes('productivity') || text.includes('system') || text.includes('planning') || text.includes('planner') || text.includes('organize')) tags.push('productivity');
  if (text.includes('copywriting') || text.includes('copy') || text.includes('messaging') || text.includes('headline')) tags.push('copywriting');
  if (text.includes('brand') || text.includes('branding') || text.includes('identity') || text.includes('positioning')) tags.push('branding');
  if (text.includes('course') || text.includes('digital product') || text.includes('product creation')) tags.push('course-creation');
  if (text.includes('bundle') || text.includes('summit') || text.includes('collab')) tags.push('collaborations');
  if (text.includes('content') || text.includes('batch') || text.includes('repurpose')) tags.push('content-planning');
  if (text.includes('mindset') || text.includes('confidence') || text.includes('overwhelm') || text.includes('burnout') || text.includes('imposter')) tags.push('mindset');
  if (text.includes('template') || text.includes('canva') || text.includes('design')) tags.push('templates');
  if (text.includes('strategy') || text.includes('business')) tags.push('business-strategy');
  if (text.includes('money') || text.includes('revenue') || text.includes('profit') || text.includes('income') || text.includes('bookkeeping') || text.includes('financial')) tags.push('revenue');

  return [...new Set(tags)];
}

// =====================
// VIP PRODUCTS
// =====================
export const VIP_PRODUCTS: BundleProduct[] = [
  {
    name: 'Anna Crosby',
    giftName: 'Messaging Interviewer GPT',
    url: 'https://learn.genicollective.com/messaging-gpt-bbb-mar2026/',
    category: 'Apps/AI/Software',
    description: 'The Messaging Interviewer GPT helps you see your offer the way a customer does—so your emails are easier to write and easier to understand.',
    value: '$97',
    isSponsor: false,
    isVip: true,
    tags: ['email', 'ai-tools', 'copywriting', 'nurture'],
  },
  {
    name: 'Heather Ritchie',
    giftName: 'The Video Visibility Engine',
    url: 'https://writerslifeforyou.com/tvve-bbb26',
    category: 'Apps/AI/Software',
    description: 'Show up, get seen, and drive more traffic—without spending hours scripting. Plug-and-play video scripts, optimized titles and descriptions, and AI-powered support.',
    value: '$177',
    isSponsor: true,
    sponsorLevel: 'silver',
    isVip: true,
    tags: ['youtube', 'ai-tools', 'content-planning', 'social-media'],
  },
  {
    name: 'Wendy White',
    giftName: 'Instant Impact',
    url: 'https://wendywhite.com/iim-bundle/',
    category: 'Branding and Copywriting',
    description: 'Create the introduction that positions you as a thought leader—on social, your site, and every stage.',
    value: '$147',
    isSponsor: true,
    sponsorLevel: 'gold',
    isVip: true,
    tags: ['branding', 'copywriting', 'calls', 'business-strategy'],
  },
  {
    name: 'Asmita Jason',
    giftName: 'Seamless Start',
    url: 'https://www.asmitajason.com/f/seamless-start',
    category: 'Business Strategy',
    description: 'Streamlined, Automated, and High-Touch Client Onboarding for Coaches, Course Creators Ready to Scale.',
    value: '$197',
    isSponsor: false,
    isVip: true,
    tags: ['productivity', 'business-strategy', 'course-creation'],
  },
  {
    name: 'Cousett Hoover',
    giftName: 'The Boss Blueprint Bundle',
    url: 'https://collab.techie.mom/becomingbossvip',
    category: 'Business Strategy',
    description: 'Your complete system to build a profitable business from idea to growing audience. Six action-packed resources.',
    value: '$147',
    isSponsor: false,
    isVip: true,
    tags: ['business-strategy', 'lead-magnet', 'revenue', 'content-planning'],
  },
  {
    name: 'Gabe Cox',
    giftName: 'Finish Line Goals',
    url: 'https://redhotmindset.com/flg-boss/',
    category: 'Business Strategy',
    description: 'Create a personalized game plan that works for the seasons you\'re in and the capacity you have.',
    value: '$149',
    isSponsor: true,
    sponsorLevel: 'gold',
    isVip: true,
    tags: ['productivity', 'business-strategy', 'mindset'],
  },
  {
    name: 'Rebecca Brockman',
    giftName: 'Engage Your Audience Super Bundle',
    url: 'https://keb.thrivecart.com/engage-your-audience-bundle/?coupon=FAITHVIP26',
    category: 'Business Strategy',
    description: 'Designed to help you connect meaningfully with your audience, combining stunning design with strategic intent.',
    value: '$115',
    isSponsor: false,
    isVip: true,
    tags: ['social-media', 'nurture', 'templates', 'content-planning'],
  },
  {
    name: 'Suzanne Castle',
    giftName: 'Speaking to Sell with Style',
    url: 'https://sparklefactor.thrivecart.com/stage-to-sells-bonus/',
    category: 'Business Strategy',
    description: 'Clearly communicate your value so the right people quickly understand what you do, why it matters, and what to do next.',
    value: '$297',
    isSponsor: true,
    sponsorLevel: 'gold',
    isVip: true,
    tags: ['calls', 'branding', 'copywriting', 'sales-page', 'business-strategy'],
  },
  {
    name: 'Christina Rava',
    giftName: 'ChatGPT for Course Creators',
    url: 'https://www.christinarava.com/chatgpt-for-course-creators-becoming-boss',
    category: 'Course/Product Creation',
    description: 'Learn how to use AI to turn your expertise into a profitable online course! Strategy and ChatGPT prompts to plan your course.',
    value: '$97',
    isSponsor: false,
    isVip: true,
    tags: ['ai-tools', 'course-creation', 'business-strategy'],
  },
  {
    name: 'Faith Lee',
    giftName: 'The Ultimate Product Ideas & Funnels Library',
    url: 'https://faithsbizacademy.thrivecart.com/ultimate-product-ideas-bbb/?coupon=FAITHVIP26',
    category: 'Course/Product Creation',
    description: '1,500 product ideas and 300 ready-to-customize funnels across 30 profitable niches.',
    value: '$97',
    isSponsor: false,
    isVip: true,
    tags: ['course-creation', 'email-launch', 'revenue', 'business-strategy'],
  },
  {
    name: 'Sandra De Freitas',
    giftName: 'Structure and Style: Membership Blueprint',
    url: 'https://engagedgroups.com/membershipcourse/?coupon=FAITHVIP26',
    category: 'Course/Product Creation',
    description: 'Get the Exact Blueprint for structuring your membership offer that will get your clients a complete transformation.',
    value: '$397',
    isSponsor: false,
    isVip: true,
    tags: ['course-creation', 'community', 'business-strategy', 'revenue'],
  },
  {
    name: 'Dr. Christiane Schroeter',
    giftName: 'The 15-Minute Habit System',
    url: 'https://hellohappynest.thrivecart.com/the-15-minute-habit-faith/?coupon=FAITHVIP26',
    category: 'Productivity & Business Systems',
    description: 'Turn good intentions into consistent execution using a repeatable 15-minute daily system.',
    value: '$149',
    isSponsor: false,
    isVip: true,
    tags: ['productivity', 'mindset', 'business-strategy'],
  },
  {
    name: 'Kim Galloway',
    giftName: 'Seek a Celeb',
    url: 'https://newfrontierbooks.lpages.co/seek-a-celeb-bundle-becoming-boss-vip/',
    category: 'Productivity & Business Systems',
    description: 'A 3-step process to identify the right famous person to write a book blurb for you.',
    value: '$97',
    isSponsor: false,
    isVip: true,
    tags: ['business-strategy', 'branding', 'collaborations'],
  },
  {
    name: 'Sage Grayson',
    giftName: 'Startup In 60',
    url: 'https://sagegrayson.mykajabi.com/startupin60-freebie-boss',
    category: 'Productivity & Business Systems',
    description: 'A time management course for busy women who are ready to start their own businesses.',
    value: '$147',
    isSponsor: false,
    isVip: true,
    tags: ['productivity', 'business-strategy', 'revenue'],
  },
  {
    name: 'Stephanie Breckbill',
    giftName: 'The Clarity Lounge Premium 6-month Membership',
    url: 'https://slbdesign.co/clarityloungefaith26',
    category: 'Productivity & Business Systems',
    description: 'A cozy, low-pressure membership for overwhelmed, idea-rich entrepreneurs who are tired of spinning.',
    value: '$102',
    isSponsor: false,
    isVip: true,
    tags: ['productivity', 'community', 'mindset', 'business-strategy'],
  },
];

// =====================
// FREE BUNDLE PRODUCTS
// =====================
export const FREE_PRODUCTS: BundleProduct[] = [
  { name: 'Amanda Rose', giftName: 'Optimize and Monetize Masterclass', url: 'https://amanda-rose.mykajabi.com/offers/FckdmPyG?coupon_code=1009MO', category: 'Business Strategy', description: 'How-to create an Irresistible Opt-in OR Offer that Converts like Crazy for Events, Summits, Bundles, and ANY time you Promote!', value: '$111', isSponsor: false, isVip: false, tags: [] },
  { name: 'Elizabeth Goddard', giftName: 'The Tripwire Toolkit', url: 'https://elizabethgoddard.co.uk/tripwire-bbb26/', category: 'Business Strategy', description: 'A practical toolkit for business owners who want their thank-you pages to do more than say thanks—with ready-to-use copy, checklists, and step-by-step walkthroughs so new subscribers buy.', value: '$47', isSponsor: true, sponsorLevel: 'gold', isVip: false, tags: [] },
  { name: 'Monica Froese', giftName: 'Email Engagement Elixir GPT', url: 'https://empoweredbusiness.co/boss-email/', category: 'Apps/AI/Software', description: 'Turn everyday emails into conversation-starters using a proven Connect → Converse → Convert framework.', value: '$29', isSponsor: true, sponsorLevel: 'gold', isVip: false, tags: [] },
  { name: 'Melody Wigdahl & Sharon Kinnier', giftName: 'The Workshop Wizard', url: 'https://gptsandbotsunleashed.com/workshop-wizard-lp-faith/', category: 'Apps/AI/Software', description: 'Transform your ideas into profitable Workshops with The Workshop Wizard! Guides you through every step, from ideation to execution.', value: '$67', isSponsor: false, isVip: false, tags: [] },
  { name: 'Kate Kordsmeier', giftName: 'AI Your Inbox: Get to Inbox Zero Every Day', url: 'https://successwithsoul.co/bossAI', category: 'Apps/AI/Software', description: 'Get to Inbox Zero every single day using AI tools that triage, draft, and respond for you.', value: '$97', isSponsor: false, isVip: false, tags: [] },
  { name: 'Erin Kelly', giftName: 'Launch Your Low Lift Summit', url: 'https://www.mvlearn.co/lowliftsummit', category: 'Collaborations/Bundles/Summits', description: 'This mini-course shows you how to host a summit that grows your list without burning out.', value: '$39', isSponsor: false, isVip: false, tags: [] },
  { name: 'Faith Lee', giftName: 'Pricing Strategies: Courses', url: 'https://faithsbizacademy.thrivecart.com/pricing-strategies-courses-bbb/?coupon=FAITH26', category: 'Business Strategy', description: 'Learn the exact pricing strategies for coaching and courses—from $9 workshops to $997 programs.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Sage Grayson', giftName: 'Evergreen Email Sequences For Endless Sales', url: 'https://sagegrayson.mykajabi.com/evergreen-bbb-free-access', category: 'Email Marketing', description: 'Set up a value-packed evergreen email sequence that gets your customers results while skyrocketing your sales.', value: '$47', isSponsor: false, isVip: false, tags: [] },
  { name: 'Elle Drouin', giftName: 'Marketing Template Toolkit', url: 'https://go.styledstocksociety.com/marketing-template-toolkit-bundle/?coupon=FAITH26', category: 'Pinterest & Social Media', description: '365 total templates for marketing graphics for virtually every day of the year.', value: '$49', isSponsor: false, isVip: false, tags: [] },
  { name: 'Sandra De Freitas', giftName: 'The 12-Week Burnout-Free Membership Planner', url: 'https://go.engagedgroups.com/12weekplannercollab/?coupon=FAITH26', category: 'Course and Product Creation', description: 'Map content, engagement, launches, and boundaries in a single, realistic 90-day plan.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Kim Galloway', giftName: 'Brilliant Book Blurbs', url: 'https://newfrontierbooks.lpages.co/brilliant-book-blurbs-bundle-becoming-boss/', category: 'Business Strategy', description: 'No need to lose hours staring at the blank page wondering how to write your book\'s blurb.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Gabe Cox', giftName: 'Simplified Business Systems', url: 'https://redhotmindset.com/sbs-boss/', category: 'Productivity & Business Systems', description: 'Creating one central hub for everything in your life and business, building a year-at-a-glance strategy board.', value: '$75', isSponsor: true, sponsorLevel: 'gold', isVip: false, tags: [] },
  { name: 'Heather Ritchie', giftName: 'The Perfect Pitch GPT', url: 'https://writerslifeforyou.com/tppg-bbb26', category: 'Apps/AI/Software', description: 'Write your next summit, bundle, or podcast pitch in minutes—and finally hit submit with confidence.', value: '$47', isSponsor: true, sponsorLevel: 'silver', isVip: false, tags: [] },
  { name: 'Emily Brook', giftName: 'The Complete AI Marketing Toolkit', url: 'https://sellablebydesign.com/the-complete-ai-marketing-bundle-bcoming-boss/', category: 'Business Strategy', description: '1,000+ strategic ChatGPT prompts + plug-and-play marketing strategies for digital entrepreneurs.', value: '$35', isSponsor: false, isVip: false, tags: [] },
  { name: 'Cousett Hoover', giftName: 'Startup Success Workbook', url: 'https://collab.techie.mom/becomingbossfree', category: 'Business Strategy', description: 'Step-by-step action plan to go from business idea to first sale.', value: '$37', isSponsor: false, isVip: false, tags: [] },
  { name: 'Megan Elliott', giftName: 'Headline Generator Tool', url: 'https://copytemplateshop.com/bbb2026', category: 'Branding and Copywriting', description: 'Effortlessly brew 40 catchy, compelling, and conversion-focused headlines for your sales page or website.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Alison Reeves', giftName: 'Aligned Client-Getting Strategies', url: 'https://alisonreeves.co/aligned-client-getting-strategies-bbb', category: 'Business Strategy', description: 'Attract clients in a way that feels good to your nervous system and supports sustainable income.', value: '$97', isSponsor: true, sponsorLevel: 'gold', isVip: false, tags: [] },
  { name: 'Micki Kosman', giftName: 'Steal Back an Hour a Day with ChatGPT!', url: 'https://adaptlab.eo.page/rrwbw', category: 'Apps/AI/Software', description: 'Let ChatGPT handle the little tasks that eat up your time.', value: '$47', isSponsor: false, isVip: false, tags: [] },
  { name: 'Sherry Smothermon-Short', giftName: 'Canva Bulk Create Toolkit', url: 'https://sales.printablesandmoreclub.com/canva-bulk-create-toolkit-bbb26/?coupon=FAITH26', category: 'Productivity & Business Systems', description: 'Turn one Canva template and a simple spreadsheet into 30+ pages of content in under an hour.', value: '$47', isSponsor: true, sponsorLevel: 'gold', isVip: false, tags: [] },
  { name: 'Andrea Caprio', giftName: 'The Calm Scale Lab', url: 'https://wellnessmethods.com/calm-scale-lab-bbbfeb2026/', category: 'Business Strategy', description: 'The Decision and Execution Container for Coaches Done Trying Everything.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Julia Schuerer', giftName: 'The Email First Growth Solution', url: 'https://www.thecopycademy.com/opt-in-becoming-boss-bundle-2026', category: 'Email Marketing', description: 'Stop fighting the algorithm and start owning your audience. AI-powered email marketing command center.', value: '$37', isSponsor: true, sponsorLevel: 'gold', isVip: false, tags: [] },
  { name: 'Christina Rava', giftName: 'The Content Multiplier GPT', url: 'https://www.christinarava.com/content-multiplier-gpt-becoming-boss', category: 'Productivity & Business Systems', description: 'Turn your long-form content into a week\'s worth of strategic, scroll-stopping posts in minutes.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Rebecca Brockman', giftName: '2026 Calendar Kit', url: 'https://keb.thrivecart.com/calendar-kit/?coupon=FAITH26', category: 'Course and Product Creation', description: 'A clean, flexible planner kit with 4 full calendar sets, extended use rights, and a minimalist design.', value: '$47', isSponsor: false, isVip: false, tags: [] },
  { name: 'Sreedevi V', giftName: 'Tidy Devices - eBook & Workbook', url: 'https://cart.snazzydesignsforever.com/tidy-devices-ebook-workbook-bbb/?coupon=FAITH26', category: 'PLR', description: 'Guide your customers with digital decluttering. Perfect lead magnet template for coaches in the tech and wellness space.', value: '$37', isSponsor: false, isVip: false, tags: [] },
  { name: 'Michelle Mazur', giftName: 'Market Like an Expert', url: 'https://drmichellemazur.com/boss', category: 'Business Strategy', description: 'A free 7-day email course that helps you ditch the marketing "shoulds" and build a strategy that actually fits.', value: '$27', isSponsor: true, sponsorLevel: 'gold', isVip: false, tags: [] },
  { name: 'Kaycee N', giftName: 'Brain Dump & Planning Spreadsheet', url: 'https://kayceedigitaldesign.kit.com/a4cf799af9', category: 'Productivity & Business Systems', description: 'Helps business owners stop spinning, get everything out of their head, and turn chaos into a clear, doable plan.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Kristen Robinson', giftName: 'The Freebie Swipe Copy Template', url: 'https://kristenrobinson.lpages.co/freebie-swipe-copy-template-becoming-boss-bundle/', category: 'Collaborations/Bundles/Summits', description: 'Two ready-to-use email templates you can send directly to a collaboration partner to promote your free gift.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Bettina Wiesen', giftName: 'FROM BUNDLE BROWSER TO CONTRIBUTOR', url: 'https://www.bettinawiesen.com/bbb-from-bundle-browser-to-contributor', category: 'Email Marketing', description: 'A quick-fill workbook shows you how to go from browser to contributor in bundles—even with no list, no product.', value: '$115', isSponsor: false, isVip: false, tags: [] },
  { name: 'Mary Struzinsky', giftName: 'The Success Capacity Reflection', url: 'https://www.rewiredforwomen.com/bossbundle', category: 'Business Strategy', description: 'Discover your unique Leadership & Identity Blueprint—revealing the subconscious patterns driving burnout.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Amy Harrop', giftName: 'EasyGPT & Prompts Bundle', url: 'https://succeedwithcontent.com/bundles/boss-2026/', category: 'Course and Product Creation', description: 'Practical strategies, video training and money-making ideas and prompts to harness AI for unique content.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Asmita Jason', giftName: 'The Ultimate Client Attraction Workshop', url: 'https://www.asmitajason.com/f/the-ultimate-client-attraction-workshop', category: 'Business Strategy', description: 'Build Your Authority and Get Paid Daily by Attracting Dream Clients into Your World Effortlessly.', value: '$47', isSponsor: false, isVip: false, tags: [] },
  { name: 'Kalii Roller', giftName: 'The Online Income Launchpad', url: 'https://kaliisueaffiliate.com/online-income-launchpad/', category: 'Business Strategy', description: 'The Simple, Step-by-Step System to Launch Your Online Income—Even If You\'re Starting from Scratch.', value: '$47', isSponsor: false, isVip: false, tags: [] },
  { name: 'Wendy White', giftName: 'The Obvious Choice Club', url: 'https://wendywhite.com/occ-bundle/', category: 'Branding and Copywriting', description: 'Get messaging that instantly makes you the one they want. Live weekly workshops for positioning and differentiation.', value: '$98', isSponsor: true, sponsorLevel: 'gold', isVip: false, tags: [] },
  { name: 'Heather Pottier', giftName: 'The Lead Magnet Opt-In Power Trio', url: 'https://go.hmariecreativeco.com/bbbpowertrio', category: 'Email Marketing', description: 'Three Systeme.io Opt-In Templates, a 60-Page Canva Lead Magnet Creator Pack, and bonus Instagram Templates!', value: '$67', isSponsor: true, sponsorLevel: 'silver', isVip: false, tags: [] },
  { name: 'Janay Trevillion', giftName: 'Inbox Empire Email Marketing Kit', url: 'https://inboxempire.lovable.app', category: 'Email Marketing', description: 'Day-by-day plan with plug-and-play email templates for the first six days of a sales sequence.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Bansari Panchal', giftName: '10,000+ AI Websites & Tools Mega List', url: 'https://www.getpaidtobeyou.online/optin-5512ef54', category: 'Apps/AI/Software', description: 'Unlock instant access to 10,000+ AI websites and tools to create faster, work smarter, and scale.', value: '$97', isSponsor: false, isVip: false, tags: [] },
  { name: 'Jeffrey Samorano', giftName: 'Content Pressure Point Insight + The Content Companion', url: 'https://thecontentloop.co/get-your-content-pressure-point-insight-report/?coupon_code=faith26', category: 'Productivity & Business Systems', description: 'A personalized insight into what\'s quietly weighing you down with social media content.', value: '$49', isSponsor: false, isVip: false, tags: [] },
  { name: 'Dr. Christiane Schroeter', giftName: 'Do It Anyway Challenge', url: 'https://hellohappynest.thrivecart.com/do-it-anyway-challenge-faith/?coupon=FAITH26', category: 'Business Strategy', description: 'A 5-day challenge to help you stop overthinking and take decisive action.', value: '$47', isSponsor: false, isVip: false, tags: [] },
  { name: 'Wendy Wallace', giftName: 'The Bookkeeping Readiness Kit', url: 'https://blessedbalanced.com/brk-summit', category: 'Productivity & Business Systems', description: 'A gentle guide to understanding your business finances—without overwhelm.', value: '$29', isSponsor: false, isVip: false, tags: [] },
  { name: 'LaKenya Kopf', giftName: 'The Anti-Burnout Playbook', url: 'https://kopfconsulting.gumroad.com/l/playbook/FAITH26', category: 'Business Strategy', description: 'A systems-focused guide to step out of reaction mode and identify where burnout is coming from.', value: '$29', isSponsor: false, isVip: false, tags: [] },
  { name: 'Jonas Goldt', giftName: '15-Minute Priority Clarity Kit', url: 'https://join.jonasgoldt.com/priority-clarity-kit-bbb202603', category: 'Productivity & Business Systems', description: '3-step task decision framework that identifies your highest-impact priority in 15 minutes.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Esther Muniu', giftName: 'The Art of Persuasion in Copywriting', url: 'https://www.esteradigital.com/sbb-persuade', category: 'Branding and Copywriting', description: 'Master the art of persuasive copywriting that engages, persuades, and converts.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Ida Delos Reyes', giftName: 'SuperMom 1-Minute Printable Business Toolkit', url: 'https://mymommyjourneyoffers.com/bundle-supermom-minute-printable-business-toolkit-plr-becoming-boss-2026/', category: 'PLR', description: 'PLR template designed to help busy moms make quick progress in their printables business.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Katie Harp', giftName: 'Successful Pin Toolkit', url: 'https://katieharpcreative.com/becoming-boss-bundle/', category: 'Pinterest & Social Media', description: 'Get the keywords, templates, and resources to get more traffic and leads from Pinterest.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Shannon Belcher', giftName: 'Overcoming Imposter Syndrome and Self-Doubt', url: 'https://digitallyyours.thrivecart.com/overcome-imposter-syndrome/?coupon=FAITH26', category: 'PLR', description: 'Customizable guided journal template to challenge limiting beliefs and build real confidence.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Shannon Williams', giftName: 'The 6 Pillars of a STRONG Etsy Shop', url: 'https://www.earningwithetsy.com/six-pillars-guide-v2', category: 'Business Strategy', description: 'Get instant clarity on what matters most in your Etsy shop.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Janie Jaramillo', giftName: 'The Energetic Content Planner', url: 'https://sacredcollabs.com/energetic-content-planner', category: 'Course and Product Creation', description: 'Create content that flows with your natural energy so you can market with more ease and authenticity.', value: '$33', isSponsor: false, isVip: false, tags: [] },
  { name: 'Tammy Mack', giftName: 'Cosmic Cashflow', url: 'https://www.soulprismcollective.com/cosmic-cashflow-bundle', category: 'Business Strategy', description: 'A business-forward astrology session that translates your birth chart into clear decisions around money and leadership.', value: '$97', isSponsor: true, sponsorLevel: 'silver', isVip: false, tags: [] },
  { name: 'Leslie J Bouldin', giftName: 'The Marketing Playbook for Smart Entrepreneurs', url: 'https://www.bibeconsulting.com/bbb-feb26', category: 'Business Strategy', description: '25+ high-impact marketing tactics ranked by time and ROI.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Tony Babcock', giftName: 'Own Your Spotlight Online Course', url: 'https://spotlightconfidence.com/ownyourspotlight?coupon_code=FAITH26', category: 'Productivity & Business Systems', description: 'Get visible and infuse new life into your mission, biz and creative projects today!', value: '$197', isSponsor: false, isVip: false, tags: [] },
  { name: 'Lexi Roark', giftName: 'Funnel Fix Starter', url: 'https://systemeio.tweakyourgeek.net/funnel-fix-starter', category: 'Productivity & Business Systems', description: 'The framework to read your funnel numbers and know the next move when something\'s broken.', value: '$47', isSponsor: false, isVip: false, tags: [] },
  { name: 'Lauren Diana', giftName: 'The Whole Business Brand Book', url: 'https://go.laurendiana.me/whole-brand-bb?utm_source=bundle&utm_medium=becoming-boss-26&utm_campaign=offer-page', category: 'Branding and Copywriting', description: 'Organize your ideal client, niche, offers, brand voice, and signature method into one clear, AI-ready playbook.', value: '$147', isSponsor: false, isVip: false, tags: [] },
  { name: 'Suzanne Castle', giftName: 'The Speaker Visibility Starter Bundle', url: 'https://suzannecastle.com/bossbundle/', category: 'Business Strategy', description: 'Clearly communicate your value and turn everyday conversations into opportunities.', value: '$47', isSponsor: true, sponsorLevel: 'gold', isVip: false, tags: [] },
  { name: 'Britt Spradlin', giftName: '3 Steps to Unlock Unlimited Traffic & Leads Without Paid Ads', url: 'https://growingyourtraffic.com/unlimited-traffic-becoming-boss-bundle/', category: 'Blogging and SEO', description: 'Learn how to create unlimited traffic and leads using a proven system that works on autopilot.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Nicole Elliott', giftName: 'The Rapid Website Copy Refresh', url: 'https://nicoleelliottcopywriter.thrivecart.com/the-rapid-website-copy-refresh-bbb26/', category: 'Branding and Copywriting', description: '5 strategic tweaks to optimize your website copy today.', value: '$67', isSponsor: false, isVip: false, tags: [] },
  { name: 'Yael Keon', giftName: 'List Revival', url: 'https://yaelkeon.thrivecart.com/revival-bundle/', category: 'Email Marketing', description: 'Break the guilt spiral and get your dormant email list opening, clicking, and buying again.', value: '$30', isSponsor: false, isVip: false, tags: [] },
  { name: 'Leva Duell', giftName: 'Ready to Use Email Sequences', url: 'https://profitablewebstrategies.thrivecart.com/ready-to-use-email-sequences-2/?coupon=FAITH26', category: 'Email Marketing', description: 'How to Create High-Converting Email Sequences with Ready-To-Use Templates.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Isabel Monte', giftName: 'EmpowerHer Digital Bundle', url: 'https://www.yourtechieisabel.com/empowerher-bbb2026', category: 'Course and Product Creation', description: 'Simple guides and planners to help you design in Canva, use ChatGPT prompts, choose a digital product idea.', value: '$47', isSponsor: false, isVip: false, tags: [] },
  { name: 'Rebecca Florence', giftName: 'What to Say Before You Sell - Mini-Course', url: 'https://rebeccaflorence.thrivecart.com/what-to-say-before-you-sell-mini-course/?coupon=FAITH26', category: 'Branding and Copywriting', description: 'Shows you what\'s blocking sales and gives you fill-in-the-blank message starters, email templates, and a self-assessment.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Betsy Muncey', giftName: 'Bundle & Summit Spreadsheet', url: 'https://www.popsugarcafe.com/the-bundle-summit-spreadsheet', category: 'Collaborations/Bundles/Summits', description: 'Plan & track your next bundle or virtual summit with ease.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Ysaline Rozier', giftName: 'Unlock Your Profitable Genius™', url: 'https://rozierysaline.systeme.io/profitablegeniuspage', category: 'Business Strategy', description: 'Find the exact skill people would happily pay you for in just 15 minutes.', value: '$37', isSponsor: false, isVip: false, tags: [] },
  { name: 'Jacqui Money', giftName: 'Unlock Airtable AI', url: 'https://jacquimoney.com/unlock-airtable-ai-replay', category: 'Apps/AI/Software', description: 'Learn how to use Airtable\'s newest AI tools to build a real Client Relationship System.', value: '$37', isSponsor: false, isVip: false, tags: [] },
  { name: 'Anna Crosby', giftName: 'Inbox Glow-Up GPT', url: 'https://learn.genicollective.com/inbox-glow-up-gpt-bbbmar26/', category: 'Email Marketing', description: 'No-pressure strategist-in-a-box. Get a custom-made engagement strategy for your email list.', value: '$47', isSponsor: false, isVip: false, tags: [] },
  { name: 'Nakimuli Francis', giftName: 'Email With Purpose By Building A Connection', url: 'https://www.nakimulispeaks.com/fmbundle', category: 'Email Marketing', description: 'Grow your email list by communicating with clarity, consistency, and peace.', value: '$97', isSponsor: false, isVip: false, tags: [] },
  { name: 'Yahaira Rivera-Harris', giftName: 'Guided Gratitude Journal PLR', url: 'https://subscribepage.io/X00oqb', category: 'PLR', description: 'A 35-page journal for self-care, wellness, and mindset work—for yourself or your business.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Germaine Foley', giftName: 'How to Make Inconsistent Income Feel Consistent', url: 'https://www.germainefoley.com/becoming-boss-bundle', category: 'Productivity & Business Systems', description: 'Create a sense of predictability and calm, even when income fluctuates.', value: '$27', isSponsor: true, sponsorLevel: 'gold', isVip: false, tags: [] },
  { name: 'Alison Grass', giftName: 'Soul-to-Sales Method', url: 'https://checkout.mailerlite.com/checkout/12403', category: 'Branding and Copywriting', description: 'Turn your spiritual experiences and beliefs into a category-of-one brand that sells everything it drops.', value: '$33', isSponsor: false, isVip: false, tags: [] },
  { name: 'Chris Milham', giftName: 'Email Adrenaline', url: 'https://milham.me/becoming-boss-bundle-2026-gift', category: 'Email Marketing', description: '15 tactics for giving your sales emails an ADRENALINE HIT so subscribers look forward to reading them.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Sarah Grace Vogler', giftName: 'Abduella Magazine Lead Magnet Ebook Template', url: 'https://sarahgracevogler.thrivecart.com/abduella-magazine-becoming-boss-bundle/?coupon=FAITH26', category: 'Course and Product Creation', description: 'A stunning, editable Canva lead magnet template your audience will love.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Cornelia Constantinescu', giftName: 'Stop the Overwhelm From Killing Your Business', url: 'https://corneliascoaching.com/shop/stop-the-overwhelm-from-killing-your-business-bbb/', category: 'Productivity & Business Systems', description: 'Checkout: Click "Sign Me Up" then enter coupon FAITH26.', value: '$47', isSponsor: false, isVip: false, tags: [] },
  { name: 'Jenny Elinora', giftName: 'Activate Your JOY for Resilience and Productivity', url: 'https://activateboss.growyourwholevoice.com', category: 'Productivity & Business Systems', description: 'Bypass procrastination and build momentum through ALL the Ups and Downs.', value: '$33', isSponsor: false, isVip: false, tags: [] },
  { name: 'Emilie Nutley', giftName: 'Confident Pricing Toolkit', url: 'https://emilienutley.co.uk/becoming-boss', category: 'Business Strategy', description: 'Figure out what you need to earn, set profitable prices, and feel confident charging them.', value: '$97', isSponsor: false, isVip: false, tags: [] },
  { name: 'Debra Banks', giftName: 'PROFIT$ Blueprint Course', url: 'https://stan.store/BizGrowthAcademy/p/profit-blueprint-course-for-strong-biz-foundation', category: 'Business Strategy', description: 'Build a solid foundation with actionable steps to reach your PROFIT$ goal.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Hello Uniques', giftName: 'Systeme.io Landing Page Template', url: 'https://hellouniques.com/bbb2026', category: 'Productivity & Business Systems', description: 'A ready-to-use landing page template designed to capture leads effortlessly.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Ruth Rieckehoff', giftName: 'The Resonant Storyteller', url: 'https://blooming-kingdom.kit.com/a452397bcc', category: 'Pinterest & Social Media', description: 'Turn real moments into short-form content that sounds like you and connects deeply. Includes custom GPT.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Mindy Iannelli', giftName: '12-Week Success Planner', url: 'https://entrepreneursgrow.com/12-week-planner-bbb/', category: 'Productivity & Business Systems', description: 'Focus on what matters most and stop chasing shiny objects with this 12-week planning system.', value: '$29', isSponsor: false, isVip: false, tags: [] },
  { name: 'Stephanie Breckbill', giftName: 'Clarity in Action', url: 'https://slbdesign.co/clarityinactionfaith26', category: 'Productivity & Business Systems', description: 'Cut through overwhelm and move forward with confidence without creating a massive plan.', value: '$27', isSponsor: false, isVip: false, tags: [] },
  { name: 'Susana Baker', giftName: 'So, You Need a Website. Now What?', url: 'https://untanglingideas.thrivecart.com/you-need-a-website/?coupon=FAITH26', category: 'Branding and Copywriting', description: 'The crucial steps to take before you start building or revamping your website.', value: '$67', isSponsor: false, isVip: false, tags: [] },
  { name: 'Mayuri Kashyap', giftName: 'The Lifestyle B-Roll Video Vault', url: 'https://www.elementsdigitalmedia.com/lifestyle-b-roll-video-vault-offer/', category: 'PLR', description: '40 high-quality short-form video clips for content creators. Use code FAITH26.', value: '$29', isSponsor: false, isVip: false, tags: [] },
  { name: 'Andrea Richardson', giftName: 'The Copywriting Architect', url: 'https://creatorlaunchstudios.systeme.io/copywriting', category: 'Apps/AI/Software', description: 'Write clear, structured sales copy for videos, pages, and emails—without guessing.', value: '$47', isSponsor: false, isVip: false, tags: [] },
];

// Auto-assign tags to all products
[...FREE_PRODUCTS, ...VIP_PRODUCTS].forEach(p => {
  if (p.tags.length === 0) {
    p.tags = assignTags(p.category, p.description, p.giftName);
  }
});
