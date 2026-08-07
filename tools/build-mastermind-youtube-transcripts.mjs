import fs from 'node:fs';
import path from 'node:path';

const captionsDir = process.argv[2] ?? '/private/tmp/mastermind-youtube-transcripts';
const outputPath = path.resolve(process.cwd(), 'src/data/mastermindVideoLibrary.ts');

const videos = [
  {
    id: 'low-capacity-business-plan',
    title: 'How to Plan Your Business in a Low-Capacity Season (Without Burning Out)',
    duration: '18:11',
    stage: 'Leverage',
    videoId: 'TFake8oGWXQ',
    summary: 'Use this to test search around planning, capacity, burnout prevention, and making the next business move smaller.',
    keywords: ['low capacity', 'burnout', 'planning', 'weekly plan', 'capacity', 'simplify'],
  },
  {
    id: 'annual-goals',
    title: 'Your Annual Goals Are Setting You Up to Fail - Do This Instead',
    duration: '6:10',
    stage: 'Offer',
    videoId: 'Wfp68hGGDic',
    summary: 'A planning reset for members who need a shorter goal cycle and a clearer 90-day result.',
    keywords: ['annual goals', '90-day plan', 'quarterly planning', 'focus', 'goals'],
  },
  {
    id: 'business-unstuck',
    title: 'How to get unstuck in business (coaching call replay)',
    duration: '1:16:45',
    stage: 'Offer',
    videoId: 'p7fwlN9aGnk',
    summary: 'A coaching replay for diagnosing the stuck point before piling on more tactics.',
    keywords: ['stuck', 'coaching', 'bottleneck', 'offer clarity', 'decision'],
  },
  {
    id: 'bundle-email-list',
    title: 'How I Grew My Email List 10,000 Subscribers WITHOUT Running Ads (Bundle Strategy)',
    duration: '18:39',
    stage: 'Find',
    videoId: '3u19cOVnsAg',
    summary: 'A discovery and list-growth training for members who need more qualified people entering their world.',
    keywords: ['email list', 'bundle', 'no ads', 'lead generation', 'subscribers', 'audience growth'],
  },
  {
    id: 'offers-visibility-confidence',
    title: 'Online Business Coaching Replay: Offers, Visibility, and Confidence Blocks',
    duration: '1:07:01',
    stage: 'Sell',
    videoId: 'Bj4vRCmKH7Q',
    summary: 'A replay for members whose sales problem is tangled with offer clarity, visibility, or confidence.',
    keywords: ['offers', 'visibility', 'confidence', 'sales', 'marketing', 'coaching'],
  },
  {
    id: 'free-sales-page',
    title: 'How to Make a Sales Page for Free (Step-by-Step Canva Tutorial)',
    duration: '19:49',
    stage: 'Sell',
    videoId: 'V5LWEgl70rw',
    summary: 'A practical sales page tutorial for turning an offer into a clear buying page without extra software spend.',
    keywords: ['sales page', 'Canva', 'landing page', 'offer copy', 'conversion'],
  },
  {
    id: 'business-without-hustle',
    title: 'Online Business Success Without the Hustle: How We Broke the Rules and Still Made Money',
    duration: '1:15:44',
    stage: 'Leverage',
    videoId: 'eVJJU2H3pl8',
    summary: 'A low-burnout business conversation for members who need permission to simplify what actually works.',
    keywords: ['without hustle', 'made money', 'sustainable business', 'capacity', 'simplify'],
  },
  {
    id: 'motivation-business',
    title: "How to Stay Motivated in Business (When You'd Rather Set It on Fire)",
    duration: '9:28',
    stage: 'Nurture',
    videoId: 'KOuM_gqn7JU',
    summary: 'A mindset and follow-through video for the messy middle of business implementation.',
    keywords: ['motivation', 'mindset', 'follow through', 'messy middle', 'frustration'],
  },
  {
    id: 'business-organization-tana',
    title: 'Stop Losing Ideas! My Simple System for 6-Figure Business Organization (Tana Tutorial)',
    duration: '20:28',
    stage: 'Leverage',
    videoId: 'nIICwqvCfrE',
    summary: 'A systems video for keeping ideas, tasks, and business context from scattering across tools.',
    keywords: ['business organization', 'Tana', 'ideas', 'task capture', 'operations', 'systems'],
  },
  {
    id: 'implementation-gap',
    title: 'Implementation Gap',
    duration: '10:08',
    stage: 'Deliver',
    videoId: 'mzRA_eU9vtE',
    summary: 'A short implementation-focused training for identifying why knowing is not becoming doing.',
    keywords: ['implementation', 'execution', 'taking action', 'follow through', 'momentum'],
  },
  {
    id: 'ai-brand-strategy',
    title: 'How to Create a Complete Brand Strategy for FREE Using AI | Save $10K+ on Brand Development',
    duration: '17:16',
    stage: 'Leverage',
    videoId: 'LYhwpxReUes',
    summary: 'A public AI training that lets us test search for AI implementation, brand strategy, and leverage topics.',
    keywords: ['AI', 'brand strategy', 'prompts', 'positioning', 'messaging', 'leverage'],
  },
  {
    id: 'email-list-fast',
    title: 'How to Grow Your Email List FAST (without ads or social media)',
    duration: '22:13',
    stage: 'Find',
    videoId: '47o7iO6O9ag',
    summary: 'A list-growth training for finding subscribers without depending on paid ads or constant social posting.',
    keywords: ['email list', 'without ads', 'without social media', 'list building', 'leads'],
  },
];

function toAscii(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x00-\x7F]/g, '');
}

function cleanVtt(videoId) {
  const vttPath = [
    path.join(captionsDir, `${videoId}.en-orig.vtt`),
    path.join(captionsDir, `${videoId}.en.vtt`),
  ].find((candidate) => fs.existsSync(candidate));

  if (!vttPath) {
    return '';
  }

  const raw = fs.readFileSync(vttPath, 'utf8');
  const cues = raw.split(/\n\s*\n/g);
  const parts = [];
  let previous = '';

  for (const cue of cues) {
    const lines = [];

    for (const rawLine of cue.split(/\r?\n/g)) {
      let line = rawLine.trim();
      if (!line || line === 'WEBVTT' || line.startsWith('Kind:') || line.startsWith('Language:') || line.startsWith('NOTE')) {
        continue;
      }
      if (line.includes('-->')) {
        continue;
      }

      line = line
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

      if (line) {
        lines.push(toAscii(line));
      }
    }

    const part = lines.at(-1);
    if (part && part !== previous) {
      parts.push(part);
      previous = part;
    }
  }

  return toAscii(parts.join(' ').replace(/\s+/g, ' ').trim());
}

function makePreview(transcript) {
  if (!transcript) {
    return 'No YouTube auto-caption transcript was available for this video when the test library was generated.';
  }
  return `${transcript.slice(0, 320).replace(/\s+\S*$/, '')}...`;
}

const hydrated = videos.map((video) => {
  const transcript = cleanVtt(video.videoId);
  return {
    ...video,
    url: `https://www.youtube.com/watch?v=${video.videoId}`,
    transcriptSource: transcript ? 'YouTube auto-captions' : 'No YouTube caption available',
    transcriptWordCount: transcript ? transcript.split(/\s+/g).length : 0,
    transcriptPreview: makePreview(transcript),
    transcript,
  };
});

const generated = `export interface MastermindVideo {
  id: string;
  title: string;
  duration: string;
  stage: string;
  videoId: string;
  url: string;
  summary: string;
  transcriptPreview: string;
  transcriptSource: string;
  transcriptWordCount: number;
  keywords: string[];
  transcript: string;
}

export const VIDEO_SEARCH_TERMS = ['sales page', 'email list', 'low capacity', 'AI', 'implementation', 'confidence'];

export const YOUTUBE_TEST_VIDEOS: MastermindVideo[] = ${JSON.stringify(hydrated, null, 2)};
`;

fs.writeFileSync(outputPath, generated, 'utf8');

const totalWords = hydrated.reduce((sum, video) => sum + video.transcriptWordCount, 0);
console.log(`Wrote ${hydrated.length} videos and ${totalWords.toLocaleString()} transcript words to ${outputPath}`);
