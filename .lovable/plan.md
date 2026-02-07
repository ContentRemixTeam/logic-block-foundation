

# OpenAI API Key Instructions & Cost Information Implementation

## Overview

This implementation adds comprehensive instructions about connecting an OpenAI API key and expected costs/fees across multiple touchpoints in the application.

---

## Part 1: Enhance API Key Settings Page

### File: `src/components/ai-copywriting/APIKeySettings.tsx`

**Changes:**

1. **Expand "Why your own key?" section** with detailed cost breakdown:
   - Specific cost per email generation (~$0.02-0.08)
   - Monthly estimates for different usage levels
   - Comparison to ChatGPT Plus and other copywriting tools

2. **Enhance "How to Get a Key" dialog** with comprehensive step-by-step:
   - Step 1: Go to platform.openai.com and sign up
   - Step 2: Add a payment method (required for API access)
   - Step 3: Set a spending limit (recommend $10-20/month)
   - Step 4: Create new secret key, name it "90 Day Planner"
   - Step 5: Copy immediately (it won't show again!)
   - Include link directly to OpenAI API keys page

3. **Add new collapsible section: "What will it cost?"** with:
   - Token pricing explanation (GPT-4o: ~$0.0025/1K input, $0.01/1K output)
   - Real-world examples:
     - 1 welcome email: $0.02-0.05
     - Full 5-email sequence: $0.15-0.25
     - Social media post: $0.01-0.03
   - Monthly estimates by usage level:
     - Light (10 generations): $0.50-1.00
     - Regular (30 generations): $1.50-3.00
     - Heavy (100+ generations): $5.00-15.00
   - Spending limit recommendation

---

## Part 2: Add AI Copywriting FAQ Category

### File: `src/components/support/FAQSection.tsx`

**Add 7 new FAQ entries in a new "AI Copywriting" category:**

| Question | Answer Summary |
|----------|---------------|
| What is AI Copywriting and who can use it? | Mastermind-tier feature, uses your own OpenAI API key |
| Why do I need my own OpenAI API key? | Pay-as-you-go, no markup, you control spending |
| How do I get an OpenAI API key? | Step-by-step instructions with link |
| How much does AI copywriting cost? | Cost breakdown per generation, monthly estimates |
| Is my API key secure? | Encryption explanation, never logged/shared |
| What if my API key runs out of credits? | Error handling, how to add credits |
| How do I set a spending limit in OpenAI? | Navigate to Usage → Limits, recommend $10-20 |

**Also update the categories array** to include 'AI Copywriting'.

---

## Part 3: Add AI Copywriting Feature Guide

### File: `src/components/support/FeaturesGuide.tsx`

**Add 2 new feature entries:**

**Entry 1: AI Copywriting Overview**
```typescript
{
  id: 'ai-copywriting',
  category: 'AI Copywriting',
  title: 'AI Copywriting Overview',
  icon: Sparkles,
  description: 'Generate high-converting emails, social posts, and sales copy...',
  details: [
    'Complete Brand Wizard to teach AI your voice',
    'Generate 5-email welcome sequences',
    'Multi-pass generation: Draft → Critique → Refine',
    'AI Detection scoring ensures human-sounding output',
    'Rate generations to improve future results',
    'Save to Vault or add to Editorial Calendar'
  ],
  tips: [
    'Provide 2-3 writing samples of at least 50 characters',
    'More diverse samples = better voice matching',
    'Rate every generation to help AI learn',
    'Use specific context for each generation'
  ]
}
```

**Entry 2: API Key Setup & Costs**
```typescript
{
  id: 'ai-copywriting-api',
  category: 'AI Copywriting',
  title: 'API Key Setup & Costs',
  icon: Key,
  description: 'Connect your OpenAI API key to power AI copywriting...',
  details: [
    'Create account at platform.openai.com (free to sign up)',
    'Add payment method in Billing (required for API access)',
    'Set a spending limit: Usage → Limits → $10-20 recommended',
    'Generate API key: Settings → API Keys → Create new secret key',
    'Key starts with "sk-" – copy immediately, won\'t show again',
    'Paste key in AI Copywriting → Settings'
  ],
  tips: [
    'Each email generation costs ~$0.02-0.08',
    'Heavy users (50+ generations/month) might spend $5-15',
    'Much cheaper than ChatGPT Plus ($20/month fixed)',
    'Set a budget cap in OpenAI to avoid surprises'
  ]
}
```

**Update categories array** to include 'AI Copywriting'.

---

## Part 4: Add Intro Card to Brand Wizard

### File: `src/components/ai-copywriting/wizard-steps/StepBusinessBasics.tsx`

**Add intro card at the top of the component before the form fields:**

- **Title**: "Setting Up AI Copywriting"
- **Content**:
  - What the wizard does (teaches AI your unique voice)
  - What you'll need (~10 minutes, business info, writing samples)
  - API key requirement with link to Settings if not configured
- **API Key Status Check**: 
  - Import `useAPIKey` hook
  - If no valid API key, show warning alert with link to Settings tab
  - Allow users to continue but warn they'll need the key for voice analysis

---

## Part 5: Add HelpButton to Dashboard Cost Card

### File: `src/components/ai-copywriting/AIDashboard.tsx`

**Add HelpButton next to "Est. Cost" stat card:**

```typescript
<HelpButton
  title="Estimated Cost"
  description="This estimate is based on your token usage this month."
  tips={[
    'Each generation uses ~3,000-8,000 tokens',
    'Actual costs depend on content length',
    'GPT-4o pricing: ~$0.0025/1K input, $0.01/1K output',
    'Set spending limits in your OpenAI dashboard'
  ]}
  side="bottom"
/>
```

---

## Files Summary

| File | Changes |
|------|---------|
| `src/components/ai-copywriting/APIKeySettings.tsx` | Enhanced cost info, better step-by-step instructions, new "What will it cost?" section |
| `src/components/support/FAQSection.tsx` | Add AI Copywriting category with 7 new questions |
| `src/components/support/FeaturesGuide.tsx` | Add AI Copywriting category with 2 feature sections |
| `src/components/ai-copywriting/wizard-steps/StepBusinessBasics.tsx` | Add intro card with API key check |
| `src/components/ai-copywriting/AIDashboard.tsx` | Add HelpButton to Est. Cost card |

---

## Content Details

### Detailed Cost Information to Include

**Token Pricing (GPT-4o)**
- Input: ~$0.0025 per 1,000 tokens
- Output: ~$0.01 per 1,000 tokens

**Real-World Cost Examples**
- Single welcome email: $0.02-0.05
- Full 5-email sequence: $0.15-0.25
- Voice analysis: $0.01-0.02
- Social media post: $0.01-0.03

**Monthly Estimates**
- Light use (10 generations): $0.50-1.00/month
- Regular use (30 generations): $1.50-3.00/month
- Heavy use (100+ generations): $5.00-15.00/month

**Comparison to Alternatives**
- ChatGPT Plus: $20/month (fixed)
- Jasper AI: $49/month (fixed)
- Your API usage: $2-10/month (pay for what you use)

### Step-by-Step API Key Instructions

1. **Create an OpenAI Account**
   - Go to [platform.openai.com](https://platform.openai.com)
   - Sign up with email or Google (free)

2. **Add a Payment Method**
   - Click your profile icon → Billing
   - Add a credit card (required for API access)
   - Start with $10-20 credit

3. **Set a Spending Limit (Recommended)**
   - Go to Usage → Limits in the sidebar
   - Set a monthly budget ($10-20 to start)
   - This prevents unexpected charges

4. **Create Your API Key**
   - Go to API Keys in the sidebar
   - Click "Create new secret key"
   - Name it "90 Day Planner" for easy identification
   - **Copy the key immediately** – it only shows once!

5. **Add Key to Your Account**
   - Go to AI Copywriting → Settings
   - Paste your key and click Save

---

## Success Criteria

- Users understand why they need their own API key before starting
- Step-by-step instructions are clear and comprehensive
- Cost expectations are set accurately with real examples
- Information is available in multiple locations (Settings, FAQ, Features Guide, Wizard)
- API key security is clearly communicated
- Cost comparison demonstrates value vs. alternatives
- Wizard shows warning if API key is missing

