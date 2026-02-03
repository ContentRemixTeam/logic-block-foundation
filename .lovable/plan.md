

# Money Momentum Wizard UX Improvements

## Problem Statement
The current wizard design assumes all users have the same business context. Several sections force interaction (expense cuts, past customers, warm leads) without providing clear "not applicable" options. This creates friction for business owners whose situations don't match the assumptions.

## Analysis of Current Issues

### Step 2: Reality Check - Expense Audit
**Current**: Shows checkboxes for expense types + savings input. No way to indicate "I've already optimized my expenses" or "Not applicable to my business."

**Business cases not covered**:
- Solo consultants with minimal overhead
- Businesses that already run lean
- New businesses with no subscriptions yet
- Those who genuinely can't cut anything

### Step 3: What You Already Have
**Current**: Requires at least 1 offer + either past customers OR warm leads.

**Business cases not covered**:
- Brand new businesses with no past customers
- Service providers who do all custom work (no "offers")
- Those pivoting to a new niche (old customers irrelevant)
- B2B with long sales cycles and few customers

### Step 4: Revenue Actions
**Current**: Brainstorm sections assume specific business models (bundles, VIP tiers, payment plans, flash sales).

**Business cases not covered**:
- Service businesses that sell time, not products
- B2B consultants (no "flash sales")
- Those with only one offer (can't bundle)
- New businesses without past flash sale data

---

## Proposed Changes

### 1. Step 2: Add "Nothing to Cut" Option

**Add before expense checkboxes:**
```
"Can you cut expenses this month?"

○ Yes - let me look
○ No - I've already optimized / Not applicable
```

If "No" selected:
- Skip the checkboxes entirely
- Show supportive message: "Good - you're already running lean. Let's focus on revenue instead."
- Set `canCutExpenses: false` in data
- Still allow them to see/check options if they change their mind via "Actually, let me look" link

**Type addition:**
```typescript
canCutExpenses: boolean | null;  // null = not answered yet
```

### 2. Step 3: Make Sections More Flexible

**Past Customers Section:**
Add at start:
```
○ I have past customers I could reach out to
○ I'm too new / My past customers aren't relevant for this
```

If "too new" selected:
- Collapse the past customer fields
- Show: "No problem - we'll focus on other revenue sources."

**Warm Leads Section:**
Add option:
```
○ I don't have warm leads right now
```

If selected:
- Skip warm leads count
- Show: "That's okay - we'll build your lead sources through actions."

**Current Offers Section:**
Add before offer input:
```
"How do you sell?"

○ I have defined offers/packages (show offer input)
○ I sell custom/project-based work (show different input)
○ I'm still figuring out my offers
```

For custom/project-based:
- Ask: "What's your typical project price range? $____ to $____"
- Ask: "How many projects can you take on this month?"

For "still figuring out":
- Show encouragement: "That's okay! This sprint can help you test."
- Ask: "What could you offer THIS WEEK even if imperfect?"

**Remove strict validation**: Allow proceeding without offers if they selected "still figuring out"

### 3. Step 4: Smarter Brainstorm Sections

**Show/hide sections based on context:**
- "All-Access Pass" - only if they have 2+ offers
- "VIP Tier" - only if they have at least 1 offer
- "Payment Plans" - only if they have offers $500+
- "Flash Sale Replay" - ask "Have you run a sale before?" before showing

**Always show:**
- Quick Intensives (selling time works for everyone)
- Past Client Bonuses (only if they said they have past customers)
- Custom Idea (always available)

**Add new universal sections:**
- "Sell Your Time This Week" (consulting, coaching, audits)
- "Quick Win Package" (what could you create fast?)
- "Reach Out Directly" (DMs, calls, emails to specific people)

### 4. Global: Add "Not Sure / Skip" Options Thoughtfully

Where appropriate, add:
- "I'm not sure yet" as a valid option (saved for later reflection)
- "Skip this section" with brief explanation

**But NOT everywhere** - some things matter:
- Revenue goal: Required (they need a target)
- At least one action: Required (otherwise no sprint)
- Survival mode check: Required (safety check)

---

## Data Model Updates

```typescript
// Add to MoneyMomentumData:

// Step 2 additions
canCutExpenses: boolean | null;  // true = will check, false = already lean, null = unanswered

// Step 3 additions
hasPastCustomers: boolean | null;  // true = has relevant ones, false = new/pivoting
hasWarmLeads: boolean | null;  // true = has some, false = none right now
offerType: 'defined' | 'custom-project' | 'figuring-out' | null;
projectPriceMin: number | null;  // for custom-project type
projectPriceMax: number | null;
projectCapacity: number | null;  // how many projects this month
quickOfferIdea: string;  // for figuring-out type
```

---

## Updated Default Data

```typescript
// Add to DEFAULT_MONEY_MOMENTUM_DATA:
canCutExpenses: null,
hasPastCustomers: null,
hasWarmLeads: null,
offerType: null,
projectPriceMin: null,
projectPriceMax: null,
projectCapacity: null,
quickOfferIdea: '',
```

---

## Implementation Sequence

1. **Update Types** (`src/types/moneyMomentum.ts`)
   - Add new fields to interface and defaults

2. **Update Step 2** (`StepRealityCheck.tsx`)
   - Add "Can you cut expenses?" gate question
   - Conditionally show expense checkboxes
   - Add supportive messaging for "No" selection

3. **Update Step 3** (`StepWhatYouHave.tsx`)
   - Add offer type question with 3 options
   - Handle custom-project and figuring-out flows
   - Add past customers gate question
   - Add warm leads gate question
   - Relax validation requirements

4. **Update Step 4** (`StepRevenueActions.tsx`)
   - Conditionally show brainstorm sections based on context
   - Add universal sections that work for all business types
   - Improve section visibility logic

5. **Test with edge cases**
   - New business owner (no customers, no offers)
   - Lean business (can't cut expenses)
   - Service provider (custom work, not products)
   - Pivoting entrepreneur (old customers irrelevant)

---

## Technical Notes

### Conditional Rendering Logic (Step 4)

```typescript
// Show All-Access Pass only if 2+ offers
const showAllAccessPass = data.currentOffers.length >= 2;

// Show VIP Tier only if has offers
const showVipTier = data.currentOffers.length >= 1 || data.offerType === 'custom-project';

// Show Payment Plans only if has $500+ offer
const showPaymentPlans = data.currentOffers.some(o => o.price >= 500) || 
  (data.projectPriceMax && data.projectPriceMax >= 500);

// Show Past Client Bonuses only if they said they have past customers
const showPastClientBonuses = data.hasPastCustomers === true && data.pastCustomersComfortable > 0;

// Show Flash Sale only after asking if they've done one
const showFlashSale = data.hasRunFlashSale === true;

// Always show these:
// - Quick Intensives
// - Custom Idea
// - Direct Outreach (new)
```

### Validation Changes

**Current (too strict):**
- Must have 1+ offers
- Must have past customers OR warm leads

**Proposed (flexible):**
- If `offerType === 'figuring-out'`, allow proceeding without offers
- If `hasPastCustomers === false && hasWarmLeads === false`, show guidance but allow proceeding
- Focus validation on: "Do you have at least 3 actions selected?"

---

## Summary

This update makes the wizard more inclusive by:

1. Adding clear "not applicable" paths for each section
2. Supporting different business models (products vs services vs custom work)
3. Removing assumptions that don't apply to all entrepreneurs
4. Keeping required elements that matter (goal, actions, commitment)
5. Using conditional logic to show relevant brainstorm prompts

The result is a wizard that works for:
- Brand new entrepreneurs
- Lean operations
- Service providers
- Product creators
- Coaches and consultants
- B2B and B2C businesses

