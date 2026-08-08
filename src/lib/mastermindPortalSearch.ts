import type {
  MastermindPortalAccess,
  MastermindPortalResource,
  MastermindTranscriptStatus,
} from '@/data/mastermindPortalResources';
import type { MastermindStageId } from '@/lib/mastermindSuccessPath';

export interface MastermindPortalSearchOptions {
  stageId?: MastermindStageId;
  access?: MastermindPortalAccess;
  transcriptReadyOnly?: boolean;
}

const TRANSCRIPT_READY_STATUSES: MastermindTranscriptStatus[] = [
  'transcript_ready',
  'description_indexed',
];

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function getSearchFields(resource: MastermindPortalResource) {
  return {
    title: normalizeSearchText(resource.title),
    body: normalizeSearchText(
      [
        resource.description,
        resource.memberJob,
        resource.accessLabel,
        resource.type,
        resource.portalPath,
        resource.transcriptLabel,
        resource.sourceStatus,
        resource.stages.join(' '),
      ].join(' ')
    ),
  };
}

function scoreResource(resource: MastermindPortalResource, terms: string[]) {
  if (terms.length === 0) return 0;

  const fields = getSearchFields(resource);
  return terms.reduce((score, term) => {
    if (fields.title === term) return score + 80;
    if (fields.title.includes(term)) return score + 40;
    if (fields.body.includes(term)) return score + 18;
    return score;
  }, 0);
}

export function searchMastermindPortalResources(
  resources: MastermindPortalResource[],
  rawQuery: string,
  options: MastermindPortalSearchOptions = {}
) {
  const terms = normalizeSearchText(rawQuery).split(' ').filter(Boolean);

  return resources
    .filter((resource) => {
      if (options.stageId && !resource.stages.includes(options.stageId)) return false;
      if (options.access && resource.access !== options.access) return false;
      if (options.transcriptReadyOnly && !TRANSCRIPT_READY_STATUSES.includes(resource.transcriptStatus)) return false;
      if (terms.length === 0) return true;
      return scoreResource(resource, terms) > 0;
    })
    .map((resource, index) => ({
      resource,
      score: scoreResource(resource, terms),
      originalIndex: index,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.originalIndex - b.originalIndex;
    })
    .map((item) => item.resource);
}
