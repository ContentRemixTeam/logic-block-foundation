export type AIProvider = 'openai' | 'anthropic';

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: 'OpenAI (GPT-4o)',
  anthropic: 'Claude (Sonnet)',
};

export const AI_PROVIDER_KEY_PREFIX: Record<AIProvider, string> = {
  openai: 'sk-',
  anthropic: 'sk-ant-',
};

export const AI_PROVIDER_INSTRUCTIONS: Record<AIProvider, {
  name: string;
  url: string;
  keysUrl: string;
  steps: string[];
}> = {
  openai: {
    name: 'OpenAI',
    url: 'https://platform.openai.com',
    keysUrl: 'https://platform.openai.com/api-keys',
    steps: [
      'Create an OpenAI Account at platform.openai.com (free)',
      'Add a Payment Method: Profile → Billing → Add credit card. Start with $10-20.',
      'Set a Spending Limit (Recommended): Usage → Limits, $10-20/month.',
      'Create Your API Key: API Keys → "Create new secret key"',
      'Copy & paste the key (starts with "sk-")',
    ],
  },
  anthropic: {
    name: 'Anthropic',
    url: 'https://console.anthropic.com',
    keysUrl: 'https://console.anthropic.com/settings/keys',
    steps: [
      'Create an Anthropic Account at console.anthropic.com (free)',
      'Add a Payment Method: Settings → Billing → Add credit card. Start with $10-20.',
      'Set a Spending Limit (Recommended): Settings → Limits.',
      'Create Your API Key: Settings → API Keys → "Create Key"',
      'Copy & paste the key (starts with "sk-ant-")',
    ],
  },
};
