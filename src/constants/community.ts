// Community URLs for sharing weekly reflections
export const COMMUNITY_URLS = {
  FACEBOOK_GROUP: 'https://www.facebook.com/groups/faithmariah',
  COMMUNITY_HOME: 'https://portal.faithmariah.com/communities/groups/mastermind/home',
  ASK_FAITH: 'https://portal.faithmariah.com/communities/groups/mastermind/discussions',
} as const;

export const COMMUNITY_OPTIONS = [
  { key: 'COMMUNITY_HOME', label: 'Community Home', url: COMMUNITY_URLS.COMMUNITY_HOME },
  { key: 'FACEBOOK_GROUP', label: 'Facebook Group', url: COMMUNITY_URLS.FACEBOOK_GROUP },
  { key: 'ASK_FAITH', label: 'Ask Faith Thread', url: COMMUNITY_URLS.ASK_FAITH },
] as const;

export const DEFAULT_SHARE_URL = COMMUNITY_URLS.COMMUNITY_HOME;
