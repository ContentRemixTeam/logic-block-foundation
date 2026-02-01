
# Deepen Launch Planner V2 - Comprehensive Launch Decision Planning

## Current Gaps Identified

After reviewing the Launch Planner V2, the following critical planning elements are missing or too shallow:

### 1. Pricing Structure (Step 3: Offer Details)
**Current state:**
- Single price point input
- Simple yes/no payment plan toggle
- Single text field for payment plan details

**Missing:**
- Full price (pay-in-full)
- Multiple payment plan options (e.g., 2-pay, 3-pay, 6-pay)
- Payment plan pricing for each option
- Waitlist/early bird pricing option
- VIP/premium tier pricing
- Price anchoring (original value vs. price)

### 2. Live Event Deep Planning (Step 2 + Step 5)
**Current state:**
- Basic free event toggle with type, date, time
- "Are you doing a live component?" (yes/no/considering)

**Missing:**
- Event NAME (what are you calling this webinar/challenge?)
- Event TOPIC/HOOK (what are you teaching?)
- Event SPECIAL OFFER (attendee-only bonus or pricing?)
- Event OFFER DEADLINE (when does the special offer expire?)
- Registration goal (how many signups?)
- Show-up strategy (reminder emails?)
- For challenges: daily topics, duration, Facebook group, daily emails

### 3. Offer Stack / Sales Strategy
**Current state:**
- Bonuses captured with status
- Limitations captured

**Missing:**
- Order bumps (what, price)
- Upsells (what, price)
- Downsells for non-buyers
- Bundle options
- Guarantee details (what type, duration)

---

## Proposed Changes

### File: `src/types/launchV2.ts`

#### A. Enhanced Pricing Structure
```typescript
// NEW Types
export interface PaymentPlanOption {
  id: string;
  installments: number;      // e.g., 2, 3, 4, 6, 12
  installmentAmount: number; // e.g., 349
  totalAmount?: number;      // Auto-calculated
}

export interface OfferPricing {
  fullPrice: number | null;           // Pay-in-full price
  originalValue: number | null;       // "Value" for anchoring
  hasEarlyBirdPrice: boolean;
  earlyBirdPrice: number | null;
  earlyBirdDeadline: string;          // When early bird expires
  hasWaitlistPrice: boolean;
  waitlistPrice: number | null;       // Special price for waitlist
  paymentPlans: PaymentPlanOption[];  // Multiple payment plans
  hasVipTier: boolean;
  vipPrice: number | null;
  vipIncludes: string;                // What's included in VIP
}
```

#### B. Enhanced Live Event (Free Event)
```typescript
export interface FreeEventDetails {
  // Basic info (existing)
  type: FreeEventType;
  date: string;
  time: string;
  phase: FreeEventPhase | '';
  
  // NEW: Deep planning
  name: string;                        // "The 5-Day Content Challenge"
  hook: string;                        // "Learn to create a month of content in 5 days"
  teachingTopics: string[];            // What you're teaching (for webinar: 3 points, for challenge: daily topics)
  
  // NEW: Registration & Show-up
  registrationGoal: number | null;     // How many signups?
  sendReminders: boolean;              // Will you send reminder emails?
  
  // NEW: Special Offer
  hasEventOnlyOffer: boolean;          // Special deal for attendees?
  eventOfferDescription: string;       // What's the offer?
  eventOfferDeadline: string;          // When does it expire? (e.g., "24 hours after")
  eventOfferDiscount: string;          // e.g., "$200 off", "Bonus XYZ"
  
  // NEW: Challenge-specific
  challengeDuration?: number;          // 3, 5, 7 days
  hasFacebookGroup?: boolean;
  dailyEmails?: boolean;
}
```

#### C. Offer Stack
```typescript
export interface OrderBump {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface Upsell {
  id: string;
  name: string;
  price: number;
  showWhen: 'checkout' | 'post-purchase' | 'both';
}

export type GuaranteeType = 'money-back' | 'results' | 'satisfaction' | 'none' | 'other';

export interface OfferStack {
  orderBumps: OrderBump[];
  upsells: Upsell[];
  hasDownsell: boolean;
  downsellDetails: string;
  guaranteeType: GuaranteeType;
  guaranteeDuration: string;           // "30 days", "60 days", "Lifetime"
  guaranteeDetails: string;
}
```

#### D. Update LaunchWizardV2Data
```typescript
// Replace/enhance existing fields in LaunchWizardV2Data:

// Step 3: Offer Details - ENHANCED
offerPricing: OfferPricing;          // NEW - replaces simple pricePoint
offerStack: OfferStack;              // NEW - order bumps, upsells, guarantee

// Step 2: Free Event - ENHANCED  
freeEventDetails: FreeEventDetails;  // NEW - replaces shallow fields
```

---

### File: `src/components/wizards/launch-v2/steps/StepOfferDetails.tsx`

#### Restructure into sections:

**Section 1: Core Pricing**
- Full price (pay-in-full)
- Original value (optional - for anchoring)
- "Show price comparison?" toggle

**Section 2: Payment Plans**
- "Offer payment plans?" toggle
- If yes: Add multiple payment plan options
  - Each has: # of installments, amount per installment
  - Auto-calculate total and compare to full price
  - Show savings for pay-in-full

**Section 3: Special Pricing (Collapsible)**
- Early bird pricing (with deadline)
- Waitlist-only pricing
- VIP tier (with what's included)

**Section 4: Offer Stack (Collapsible)**
- Order bumps (add multiple)
- Upsells (add multiple)
- Downsell for non-buyers
- Guarantee type and duration

---

### File: `src/components/wizards/launch-v2/timeline/FreeEventConfig.tsx`

#### Enhanced to include:

**Section 1: Event Basics** (existing, enhanced)
- Event type (webinar, challenge, workshop, masterclass)
- Event NAME (new input)
- Event HOOK/TOPIC (new input)
- Date & Time

**Section 2: What You're Teaching** (NEW)
- For webinar: "3 key points you'll cover"
- For challenge: "Daily topics" (dynamic based on duration)
- For workshop: "Main outcome + exercises"

**Section 3: Registration & Attendance** (NEW)
- Registration goal
- Will you send reminder emails?
- Show-up optimization tips

**Section 4: Event-Only Offer** (NEW)
- "Special offer for attendees?" toggle
- If yes:
  - What's the offer? (e.g., "Bonus coaching call")
  - Discount amount (e.g., "$200 off for 48 hours")
  - When does the offer expire?

**Section 5: Challenge-Specific** (conditional, NEW)
- Duration (3, 5, 7 days)
- Facebook group?
- Daily emails?
- Daily prize/incentive?

---

### UI/UX Approach

To avoid overwhelming users, use progressive disclosure:

1. **Collapsible sections** - Advanced options hidden by default
2. **Smart defaults** - Pre-fill common patterns
3. **Contextual tips** - Show guidance based on choices
4. **Visual summary** - Show "Your offer at a glance" card updated in real-time

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/types/launchV2.ts` | Modify | Add new interfaces for pricing, events, offer stack |
| `src/components/wizards/launch-v2/steps/StepOfferDetails.tsx` | Major rewrite | Add pricing sections, payment plans, offer stack |
| `src/components/wizards/launch-v2/timeline/FreeEventConfig.tsx` | Major rewrite | Add event name, teaching topics, special offers |
| `src/components/wizards/launch-v2/shared/PaymentPlanBuilder.tsx` | Create | Reusable component for adding payment plans |
| `src/components/wizards/launch-v2/shared/OrderBumpCard.tsx` | Create | Reusable component for order bump entry |
| `src/components/wizards/launch-v2/shared/UpsellCard.tsx` | Create | Reusable component for upsell entry |
| `src/lib/launchV2Validation.ts` | Modify | Add validation for new fields |

---

## Implementation Phases

### Phase 1: Enhanced Pricing (Priority)
- Multiple payment plans
- Early bird / waitlist pricing
- Price anchoring

### Phase 2: Enhanced Free Events
- Event name and hook
- Teaching topics
- Special attendee offers
- Challenge-specific fields

### Phase 3: Offer Stack
- Order bumps
- Upsells
- Downsells
- Guarantees

---

## Example: Enhanced Pricing UI

```
Pricing Structure
-----------------
Full Price (Pay-in-Full): $________

Payment Plans
[+] Add Payment Plan
  ┌──────────────────────────────────────┐
  │ 2 payments of $549  (Total: $1,098)  │ [Remove]
  └──────────────────────────────────────┘
  ┌──────────────────────────────────────┐
  │ 3 payments of $397  (Total: $1,191)  │ [Remove]
  └──────────────────────────────────────┘

Early Bird Pricing (optional)
[ ] Offer early bird pricing
    Price: $______  Expires: [date picker]

Waitlist Pricing (optional)  
[ ] Special price for waitlist
    Price: $______
```

---

## Example: Enhanced Free Event UI

```
Free Event Details
------------------
Event Type: [Webinar ▼]

Event Name: [The Content Creator Accelerator Masterclass]

What's the hook? (What will they learn?)
[How to create 30 days of content in just 2 hours per week]

What are you teaching? (3 key points)
1. [The Content Batching System]
2. [Repurposing Framework]  
3. [The 30-Day Content Calendar]

Registration Goal: [500] signups

Special Offer for Attendees
[✓] Yes, I'm offering something special
    What's the offer? [Free 1:1 Strategy Call for first 20 buyers]
    Discount: [$200 off + bonus coaching package]
    Offer expires: [24 hours after webinar]
```

---

## Summary

This enhancement transforms the Launch Planner V2 from a "what dates" tool into a comprehensive "plan every decision" tool. Users will:

1. **Define complete pricing** - full price, payment plans, early bird, VIP
2. **Plan live events deeply** - name, hook, teaching points, special offers
3. **Build their offer stack** - order bumps, upsells, guarantees
4. **See everything at a glance** - visual summary cards

The implementation uses collapsible sections to maintain simplicity while enabling depth for those who need it.
