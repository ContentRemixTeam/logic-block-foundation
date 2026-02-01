
# Flexibility Audit & Fix: Launch Planner V2

## The Problem

The Launch Planner V2 needs to work for businesses at various levels - from first-time launchers with no testimonials to established businesses with complex offer stacks. Currently, several sections force assumptions that don't fit all business models.

---

## Flexibility Issues Identified

### 1. Testimonials Section (Step 4: Pre-Launch Strategy)
**Current options:**
- "I have enough testimonials"
- "I need to collect more"
- "I don't have any yet"

**Missing option:**
- "I don't have any AND I don't want to collect any this time"

**Why it matters:** Some users are launching for the first time, testing an offer, or have an audience that doesn't respond to testimonials. Forcing them to set a "testimonial goal" creates unnecessary friction.

---

### 2. Revenue Goal (Step 2: Goal & Timeline)
**Current state:** Good options exist including "testing mode" and "first sale"

**Missing:**
- "I don't have a specific revenue goal"
- "I'm focused on something other than revenue (feedback, list-building, etc.)"

---

### 3. Email List Status (Step 1: Launch Context)
**Current state:** Options exist but could be clearer

**Missing:**
- "I'm not using email for this launch" (some launches are purely social or DM-based)

---

### 4. Offer Pricing (Step 3: Offer Details)
**Current state:** Requires a price to be entered

**Missing:**
- "I haven't decided on pricing yet"
- "This is a free offer / lead magnet launch"
- "Pay what you want / sliding scale"

---

### 5. Email Sequences (Step 4: Pre-Launch Strategy)
**Current state:** Shows checkboxes for warm-up, launch, cart close, post-purchase sequences

**Missing:**
- "I'm not using email sequences for this launch"
- Clear skip option for users who don't do email marketing

---

### 6. Bonuses (Step 3: Offer Details)
**Current state:** Allows adding bonuses

**Missing:**
- Explicit "No bonuses" option (currently users just leave it empty, but that feels incomplete)

---

### 7. Order Bumps & Upsells (Step 3: Offer Details)
**Current state:** Collapsible section for adding them

**Missing:**
- Clearer "Not offering any" indicator

---

### 8. Live Component (Step 5: Launch Week)
**Current state:** Has options including "No live element" and "Other"

**Status:** Good - already flexible

---

### 9. Follow-Up Strategy (Step 6: Post-Launch)
**Current state:** Has options including "Simple" and "Unsure"

**Missing:**
- "No follow-up planned" (some launches are one-and-done)

---

### 10. Free Event (Step 2: Goal & Timeline / FreeEventConfig)
**Current state:** Has yes/no toggle

**Status:** Good - already flexible

---

## Proposed Changes

### File: `src/types/launchV2.ts`

#### A. Add new type values
```typescript
// Update TestimonialStatus
export type TestimonialStatus = 'have-enough' | 'need-more' | 'none' | 'skip-this-launch';

// Update EmailListStatus  
export type EmailListStatus = 'comfortable' | 'small-nervous' | 'starting-zero' | 'building' | 'not-using-email';

// Update RevenueGoalTier
export type RevenueGoalTier = 'first-sale' | '500-1000' | '1000-2500' | '2500-plus' | 'testing' | 'custom' | 'no-goal';

// Update FollowUpWillingness
export type FollowUpWillingness = 'one-email' | 'multiple-emails' | 'personal-outreach' | 'simple' | 'unsure' | 'none-planned' | 'other';

// Add pricing flexibility
export type PricingStatus = 'set' | 'undecided' | 'free' | 'pay-what-you-want';
```

#### B. Add new option arrays
```typescript
export const TESTIMONIAL_STATUS_OPTIONS = [
  { value: 'have-enough', label: 'I have enough testimonials' },
  { value: 'need-more', label: 'I need to collect more' },
  { value: 'none', label: "I don't have any yet (but want to collect)" },
  { value: 'skip-this-launch', label: "I don't have any and don't plan to collect for this launch" },
] as const;
```

---

### File: `src/components/wizards/launch-v2/steps/StepPreLaunchStrategy.tsx`

#### Update Testimonials Section (~lines 365-427)

**Before:**
```
Radio options: have-enough, need-more, none
If need-more or none → show goal + deadline
```

**After:**
```
Radio options: have-enough, need-more, none, skip-this-launch
If need-more → show goal + deadline  
If none → show goal + deadline
If skip-this-launch → show reassurance message
If have-enough → show "ready" message
```

#### Add "Skip Email Sequences" Option (~lines 429+)

Add a toggle or option for "I'm not using email for this launch" that collapses the email sequences section.

---

### File: `src/components/wizards/launch-v2/steps/StepLaunchContext.tsx`

#### Update Email List Status Options (~lines 175-213)

Add "not-using-email" option:
```typescript
{ value: 'not-using-email', label: "I'm not using email for this launch", color: 'gray' }
```

Show contextual guidance when selected.

---

### File: `src/components/wizards/launch-v2/steps/StepGoalTimeline.tsx`

#### Update Revenue Goal Options (~lines 268-358)

Add "no-goal" option:
```typescript
{ value: 'no-goal', label: "I don't have a specific revenue goal for this launch", color: 'gray' }
```

---

### File: `src/components/wizards/launch-v2/steps/StepOfferDetails.tsx`

#### Add Pricing Status Toggle (~lines 196-275)

Before the Full Price input, add:
```
Do you have pricing set?
[ ] Yes, I know my price
[ ] Not decided yet
[ ] This is free (lead magnet, etc.)
[ ] Pay what you want / sliding scale
```

If "Not decided yet" or "Free" → collapse/hide pricing inputs.

#### Add "No Bonuses" Indicator (~line 451+)

Add a clearer "I'm not offering bonuses" option instead of just leaving the section empty.

---

### File: `src/components/wizards/launch-v2/steps/StepPostLaunch.tsx`

#### Add "No Follow-Up" Option (~lines 127-195)

Add to FOLLOW_UP_WILLINGNESS_OPTIONS:
```typescript
{ value: 'none-planned', label: "No follow-up planned for this launch" }
```

---

## Implementation Summary

| File | Changes |
|------|---------|
| `src/types/launchV2.ts` | Add `skip-this-launch` to TestimonialStatus, `not-using-email` to EmailListStatus, `no-goal` to RevenueGoalTier, `none-planned` to FollowUpWillingness, add `PricingStatus` type |
| `src/components/wizards/launch-v2/steps/StepPreLaunchStrategy.tsx` | Add "skip this launch" testimonial option with guidance, add email skip option |
| `src/components/wizards/launch-v2/steps/StepLaunchContext.tsx` | Add "not using email" option |
| `src/components/wizards/launch-v2/steps/StepGoalTimeline.tsx` | Add "no specific goal" option |
| `src/components/wizards/launch-v2/steps/StepOfferDetails.tsx` | Add pricing status toggle, add "no bonuses" indicator |
| `src/components/wizards/launch-v2/steps/StepPostLaunch.tsx` | Add "no follow-up" option |

---

## UI/UX Approach

1. **Non-judgmental language** - Options should not make users feel like they're doing something wrong
2. **Contextual guidance** - When users select "skip" options, show supportive messaging explaining that's okay
3. **Clean conditionals** - Hide irrelevant follow-up fields when skip options are selected
4. **Visual consistency** - Skip options should look like valid choices, not afterthoughts

---

## Example: Testimonials Section (After)

```
Testimonials
------------
Social proof dramatically increases conversions.

( ) I have enough testimonials  ✓ Testimonials ready
( ) I need to collect more      → [Goal: __] [Deadline: ____]  
( ) I don't have any yet        → [Goal: __] [Deadline: ____]
(•) Skip testimonials this time → That's okay! First launches often don't have 
                                   testimonials. Focus on getting results 
                                   you can share later.
```

---

## Files to Modify

| File | Lines to Update |
|------|-----------------|
| `src/types/launchV2.ts` | Lines 20, 25-30, 29, 109-111 + new option arrays |
| `src/components/wizards/launch-v2/steps/StepPreLaunchStrategy.tsx` | Lines 365-427 (testimonials), 429+ (email skip) |
| `src/components/wizards/launch-v2/steps/StepLaunchContext.tsx` | Lines 175-213 (email list options) |
| `src/components/wizards/launch-v2/steps/StepGoalTimeline.tsx` | Lines 268-358 (revenue goal options) |
| `src/components/wizards/launch-v2/steps/StepOfferDetails.tsx` | Lines 196-275 (pricing status) |
| `src/components/wizards/launch-v2/steps/StepPostLaunch.tsx` | Lines 127-161 (follow-up options) |

---

## Priority Order

1. **Testimonials** (user's specific request) - highest priority
2. **Email Skip** - affects workflow significantly
3. **Revenue Goal** - helps first-time launchers
4. **Pricing Status** - helps undecided users
5. **Follow-Up** - lower impact
6. **Bonuses indicator** - cosmetic improvement
