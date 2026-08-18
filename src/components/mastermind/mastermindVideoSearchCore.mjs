const STOP_WORDS = new Set(['a','an','and','are','as','at','be','but','by','for','from','how','i','in','is','it','my','of','on','or','our','the','this','to','we','what','when','with','you','your']);

export function normalizeVideoSearchText(value) {
  return String(value ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

function searchableVideoText(video, includeTranscript = true) {
  return [video.title, video.stage, video.summary, video.keywords.join(' '), includeTranscript ? video.transcript : ''].join(' ');
}

function containsSearchTerm(haystack, term) {
  if (term.length > 3) return haystack.includes(term);
  return (` ${haystack} `).includes(` ${term} `);
}

function indexOfSearchTerm(text, term) {
  if (!term) return -1;
  if (term.length > 3) return text.indexOf(term);
  return text.search(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));
}

export function filterPilotVideos(videos, rawQuery, stage = 'All') {
  const query = normalizeVideoSearchText(rawQuery).slice(0, 160);
  const tokens = query.split(' ').filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  return videos.filter((video) => {
    if (stage !== 'All' && normalizeVideoSearchText(video.stage) !== normalizeVideoSearchText(stage)) return false;
    if (!query) return true;
    const haystack = normalizeVideoSearchText(searchableVideoText(video));
    return containsSearchTerm(haystack, query) || (tokens.length > 0 && tokens.every((token) => containsSearchTerm(haystack, token)));
  });
}

export function pilotTranscriptSnippet(video, rawQuery, radius = 150) {
  const transcript = String(video.transcript || video.transcriptPreview || '').replace(/\s+/g, ' ').trim();
  if (!transcript) return '';
  const raw = normalizeVideoSearchText(rawQuery);
  const terms = raw.split(' ').filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  const lower = transcript.toLowerCase();
  let index = indexOfSearchTerm(lower, raw);
  if (index < 0) {
    for (const term of terms) {
      index = indexOfSearchTerm(lower, term);
      if (index >= 0) break;
    }
  }
  if (index < 0) return String(video.transcriptPreview || transcript.slice(0, radius * 2)).trim();
  const start = Math.max(0, index - radius);
  const end = Math.min(transcript.length, index + Math.max(raw.length, 20) + radius);
  return `${start > 0 ? '…' : ''}${transcript.slice(start, end).trim()}${end < transcript.length ? '…' : ''}`;
}

export function rankPilotRecommendation(videos, context) {
  if (!Array.isArray(videos) || videos.length === 0) return null;
  const stage = normalizeVideoSearchText(context?.stageId);
  const capacity = normalizeVideoSearchText(context?.capacityMode);
  const plannerText = normalizeVideoSearchText([
    context?.milestoneTitle,
    context?.goal,
    context?.focusArea,
    context?.bottleneck,
    context?.lowEnergyVersion,
  ].filter(Boolean).join(' '));
  const tokens = plannerText.split(' ').filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  return videos.map((video, index) => {
    const stageMatch = normalizeVideoSearchText(video.stage) === stage;
    const searchable = normalizeVideoSearchText(searchableVideoText(video, false));
    const overlap = tokens.filter((token) => containsSearchTerm(searchable, token)).length;
    const capacityMatch = capacity === 'minimum' && /capacity|burnout|simplif|minimum/.test(searchable);
    return { video, index, stageMatch, capacityMatch, overlap, score: (stageMatch ? 100 : 0) + (capacityMatch ? 135 : 0) + Math.min(overlap, 8) * 4 };
  }).sort((a, b) => b.score - a.score || a.index - b.index)[0];
}

export function pilotRecommendationReason(context, result) {
  if (!result) return '';
  const stage = String(context?.stageLabel || context?.stageId || '').trim();
  const milestone = String(context?.milestoneTitle || '').trim();
  if (result.capacityMatch) return 'Recommended for your reduced-capacity plan and current Success Path focus.';
  if (result.stageMatch && milestone) return `Recommended for your ${stage} stage while you work on “${milestone}.”`;
  if (result.stageMatch) return `Recommended for your current ${stage} Success Path stage.`;
  return 'Recommended from the current goal and focus saved in your Planner.';
}
