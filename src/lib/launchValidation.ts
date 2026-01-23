import { z } from 'zod';

// Step 1: Launch Basics
export const LaunchBasicsSchema = z.object({
  name: z
    .string()
    .min(3, 'Launch name must be at least 3 characters')
    .max(100, 'Launch name must be less than 100 characters'),
  cartOpens: z.string().min(1, 'Cart open date is required'),
  cartCloses: z.string().min(1, 'Cart close date is required'),
  launchDuration: z.enum(['3_days', '5_days', '7_days', '14_days', 'evergreen']),
  revenueGoal: z.number().positive('Revenue goal must be positive').nullable(),
  pricePerSale: z.number().positive('Price must be positive').nullable(),
  salesNeeded: z.number().min(0),
});

// Step 2: Content Reuse (optional step - no validation required)
export const LaunchContentReuseSchema = z.object({
  selectedContentIds: z.array(z.string()),
});

// Step 3: Pre-Launch
export const LaunchPreLaunchSchema = z.object({
  hasWaitlist: z.boolean(),
  waitlistOpens: z.string().optional(),
  waitlistIncentive: z.string().max(200, 'Incentive must be less than 200 characters').optional(),
  hasLeadMagnet: z.union([z.boolean(), z.literal('skip')]),
  leadMagnetTopic: z.string().max(200).optional(),
  leadMagnetDueDate: z.string().optional(),
  emailSequences: z.array(z.string()),
});

// Step 4: Launch Activities
export const LaunchActivitiesSchema = z.object({
  liveEvents: z.array(z.object({
    type: z.enum(['webinar', 'qa', 'workshop', 'challenge', 'masterclass']),
    date: z.string(),
    time: z.string().optional(),
    topic: z.string().max(200),
  })),
  hasAds: z.union([z.boolean(), z.literal('maybe')]),
  adsBudget: z.number().positive().nullable(),
  adsPlatform: z.array(z.string()),
  socialPostsPerDay: z.number().min(0).max(20, 'Max 20 posts per day'),
  socialStrategy: z.array(z.string()),
});

// Step 5: Making Offers
export const LaunchOffersSchema = z.object({
  offerGoal: z.number().min(1, 'Offer goal must be at least 1').max(10000, 'Offer goal too high'),
  offerBreakdown: z.object({
    emails: z.number().min(0),
    socialPosts: z.number().min(0),
    stories: z.number().min(0),
    dms: z.number().min(0),
    salesCalls: z.number().min(0),
    liveEvents: z.number().min(0),
  }),
});

// Step 6: Thought Work
export const LaunchThoughtWorkSchema = z.object({
  belief: z.string().max(300, 'Belief must be less than 300 characters'),
  limitingThought: z.string().max(300, 'Limiting thought must be less than 300 characters'),
  usefulThought: z.string().max(300, 'Useful thought must be less than 300 characters'),
  postPurchaseFlow: z.array(z.string()),
  nonBuyerFollowup: z.string(),
  debriefDate: z.string(),
});

// Full wizard validation
export const LaunchWizardDataSchema = z.object({
  ...LaunchBasicsSchema.shape,
  ...LaunchContentReuseSchema.shape,
  ...LaunchPreLaunchSchema.shape,
  ...LaunchActivitiesSchema.shape,
  ...LaunchOffersSchema.shape,
  ...LaunchThoughtWorkSchema.shape,
});

// Step validators - returns true if step data is valid enough to proceed
export function validateLaunchStep(step: number, data: Record<string, unknown>): boolean {
  switch (step) {
    case 1: {
      // Name and dates required
      const name = data.name as string;
      const cartOpens = data.cartOpens as string;
      const cartCloses = data.cartCloses as string;
      
      if (!name || name.trim().length < 3) return false;
      if (!cartOpens || !cartCloses) return false;
      
      // Cart close must be after cart open
      if (cartOpens && cartCloses && new Date(cartCloses) <= new Date(cartOpens)) {
        return false;
      }
      return true;
    }
    case 2:
      // Content reuse is optional
      return true;
    case 3:
      // Pre-launch is optional, but if waitlist is on, date is required
      if (data.hasWaitlist && !data.waitlistOpens) return false;
      return true;
    case 4:
      // Activities - at least one strategy or accept default
      return true;
    case 5: {
      // Offers - goal must be set
      const offerGoal = data.offerGoal as number;
      return offerGoal >= 1;
    }
    case 6:
      // Thought work - all optional
      return true;
    case 7:
      // Review - always valid
      return true;
    default:
      return true;
  }
}

// Field-level validation with error messages
export function validateField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { valid: boolean; error?: string } {
  const result = schema.safeParse(value);
  if (result.success) {
    return { valid: true };
  }
  return {
    valid: false,
    error: result.error.errors[0]?.message || 'Invalid value',
  };
}
