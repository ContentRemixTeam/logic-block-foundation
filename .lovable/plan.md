## Design audit — `/offer` (Low Battery Business Planner sales page)

Reviewed the rendered page at 1280px and 375px. Copy and typesetting are good. As a *SaaS sales page* it under-performs, because it reads like a well-set essay rather than a product page.

### What's working
- Strong message hierarchy — the problem section genuinely earns the offer.
- One card style, one shadow level, clean serif/sans pairing.
- FAQ correctly placed *after* the offer, handling objections at the decision point.
- No horizontal overflow at either width; mobile is structurally clean.

### What's not working (ranked by conversion impact)

**1. Zero product visuals — the biggest problem.** Every SaaS page that converts cold traffic shows the product above the fold. A stranger currently reads ~120 words before any evidence the app exists. "Low Battery Day mode" and "Bare Minimum Plan" are *described*, never *shown*, so they read as claims.

**2. The brand palette isn't rendering.** Confirmed in the browser: the page inherits `data-theme="bw"`, so `--primary` computes to `0 0% 9%` — near-black. Your rose (`347 70% 70%`) and gold never appear. The CTA is a generic black pill. That single bug is why the page looks like a template.

**3. Hero is four stacked messages, all centred.** Eyebrow → headline → bold context line → muted paragraph — two subheads doing one job. On mobile the battery icon detaches and floats left of a wrapped two-line headline, which reads as broken rather than deliberate.

**4. No brand frame.** No logo bar. Cold traffic lands with no signal of who this is or that it's a real product.

**5. No risk reversal, weak proof.** No guarantee. Testimonials are unattributed income claims about the Mastermind, not the planner — for cold traffic, big revenue numbers with no face or context read as *less* credible, and carry compliance risk.

**6. No price anchoring.** "$27" sits alone with nothing to compare against.

**7. Flat crescendo.** Every section is `py-16` with the same label→h2→body pattern. The offer card carries the same visual weight as the FAQ; it should be the loudest moment on the page.

**8. Jittery left edge.** Container widths swing 2xl / 4xl / 5xl / 3xl between sections, so the text column shifts sideways as you scroll.

**9. No persistent mobile CTA.** ~7 screens on a phone with the buy button only in two places.

**10. Weakest block:** "Also included" is a bare icon-text list. And there's no "what happens after you pay" reassurance before the card form.

---

## Implementation plan

### A. Add your required copy (verbatim, no rewrites)
New **"What's included"** block placed directly above the offer card, and the offer card rebuilt to carry the pricing copy:

- Section H2: `12-Month Access — 90-Day Low Battery Business Planner`
- Intro: `A special price, just for claiming Plan Like a Boss through Lizzy's Summer Party. A calm planning system built for the days your energy doesn't show up on schedule. Your 25% still counts.`
- Checklist "What's included:" — Guided 90-day planning / Weekly planning and daily system / Daily planning wizards / Support guides / Planner tools
- `12 months of access. One-time payment of $27.`
- Exclusion line, styled quiet and honest (muted, smaller, own row — not hidden, not shouted): `Does not include Becoming Boss Mastermind access, live coaching, or community.`
- Large `$27` price display
- Caption under it: `This price is available exclusively to Lizzy's Summer Party bundle claimants.`

The existing generic bullets ("Every feature on this page…", "New features added during your year") get replaced by your list so there's one authoritative inclusions block, not two competing ones.

### B. Fix the palette bug
`/offer` clears the inherited `bw` theme on mount and restores it on unmount, so the public page renders in the real brand palette — rose primary CTA, gold accent detail. Presentation-only, no effect on the signed-in app.

### C. Rebuild the hero
Slim brand bar (logo mark + wordmark, quiet "Sign in" link). Then: eyebrow → headline with the battery icon locked inline to the first line so it can't detach on mobile → **one** sub-line → CTA + microcopy → product visual. The Full/Half/Low/Empty chips move out of the hero into the battery-system section, where they have context.

### D. Product visuals
I attempted real screenshots of the live app with the injected session and hit the membership paywall ("We can't find active access for this email"), so I can't capture authenticated screens without writing access records to your database — which I won't do unprompted. Instead I'll build faithful in-page UI reproductions (real components, brand tokens, browser/phone chrome) of the dashboard battery check-in, Bare Minimum list, and 90-day cycle bar. They mirror the actual interface rather than inventing features. If you'd rather use genuine screenshots, send me a few and I'll swap them in — or say the word and I'll grant your account access so I can capture them directly.

### E. Trust, rhythm, structure
- Consistent branded CTA component everywhere; one primary action per view.
- Testimonials get initials avatars and an accurate attribution line ("Becoming Boss Mastermind member") so the income claims have context.
- Price anchor near the price: "$27 once — about $2.25 a month."
- Offer card becomes the visual peak: stronger border, deeper shadow, more surrounding air than any other section.
- Grid discipline: one content width (`max-w-2xl`) and one wide width (`max-w-5xl`), nothing else.
- "Also included" upgraded from a bare list into a proper card grid.
- Sticky mobile CTA bar (price + button) appearing after the hero, hidden over the offer section, respecting safe-area inset.
- "After you buy" 3-step reassurance strip before the FAQ.
- Real head tags plus Product/Offer JSON-LD; single H1 retained.

### Two things I'd flag
1. **Guarantee.** The page has no risk reversal, which at $27 usually matters more than any copy edit — but I won't invent a refund policy. Tell me the terms and I'll add it; otherwise I'll ship without one.
2. **Audience conflict.** You asked to optimise for cold traffic, but the new copy scopes the price to "Lizzy's Summer Party bundle claimants." I'll build it exactly as written, but be aware that line caps the page's usefulness for cold ads. If you later want a cold version, it's a one-line swap.

### Technical
Changes confined to `src/pages/Offer.tsx` plus small presentational subcomponents. All colours via semantic tokens, no hardcoded hex. Verified at 375px and 1280px with screenshots; typecheck must pass.
