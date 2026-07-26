## Audit: /offer sales page

Reviewed live at 1280px and 375px. Structurally sound, no overflow, copy is strong. But it reads like a well-typeset **essay**, not a SaaS sales page. Below is the honest critique, then what I'd change.

### What's working
- Message hierarchy and copy voice are genuinely good — the problem section earns the offer.
- One consistent card style, one shadow level, clean serif/sans pairing.
- Section rhythm is predictable and readable; no layout bugs at either width.
- FAQ placed after the offer (correct — it handles objections at the decision point).

### What's not working (ranked by conversion impact)

**1. Zero product visuals. This is the single biggest problem.**
Every SaaS page that converts cold traffic shows the product within the first screen. Right now a stranger reads ~120 words of prose before any evidence the app exists. Features are described ("Low Battery Day mode", "Bare Minimum Plan") but never *shown*, so they read as claims. Needs: a hero device shot of the dashboard, and 2–3 real UI crops beside the battery-system and 90-day sections.

**2. The hero is a wall of centred text with four stacked messages.**
Eyebrow → headline → bold context line → muted paragraph. Two subheads doing the same job. On mobile the battery icon detaches and floats to the left of a wrapped two-line headline, which looks broken rather than deliberate. Cut to: eyebrow, headline, ONE sub-line, CTA, product image.

**3. No brand frame.** No logo bar, no nav. Cold traffic lands with no signal of who this is or that it's a real product. A minimal top bar with the wordmark (and a quiet "Sign in") raises legitimacy cheaply.

**4. The palette isn't showing.** Rose and gold are defined in the design system, but the rendered page is cream + near-black. The CTA is a generic black pill. Nothing on the page is *the brand colour*, so it looks like a template, not a product.

**5. Trust and risk reversal are missing.**
- No guarantee. At $27 cold, a 14/30-day refund line typically moves conversion more than any copy edit.
- Testimonials are unattributed revenue claims ("$7K/month") about the Mastermind, not the planner. Cold traffic reads big income numbers with no photo/context as *less* credible, and it's a compliance risk. Needs faces, roles, and at least one quote about using the tool.
- No payment/security reassurance near the button.

**6. No price anchoring.** "$27" appears with nothing to compare it against. The "four 90-day cycles for one quiet weekend" line is poetic but not an anchor. Show a struck-through or stated value, or a per-month breakdown ($2.25/month).

**7. Flat visual crescendo.** Every section is `py-16`, same label→h2→body pattern, alternating two backgrounds. Nothing escalates toward the offer. The offer card should be visibly the loudest moment on the page; currently it's the same weight as the FAQ.

**8. Jittery left edge.** Container widths vary 2xl / 4xl / 5xl / 3xl section to section, so the text column shifts horizontally as you scroll. Pick one content width and one wide width.

**9. Mobile has no persistent CTA.** The page is ~7 screens on a phone; after the hero the buy button disappears until the offer section. A sticky bottom bar (price + button) is standard and materially lifts mobile conversion.

**10. Weak sections.** "Also included" is a bare icon-text list — the least designed block on the page. And there's no "what happens after you pay" step block, which cold buyers want before entering a card.

### Proposed changes (design/presentation only, `src/pages/Offer.tsx`)

1. **Add product imagery** — capture real dashboard / daily / 90-day cycle screenshots from the running app, frame them in a subtle device mock, place one in the hero and two inline beside feature sections.
2. **Rebuild the hero** — slim brand bar with wordmark; eyebrow, headline with inline battery icon (icon locked to the first line so it can't detach on mobile), one sub-line, CTA + microcopy, product shot below. Move the Full/Half/Low/Empty chips out of the hero into the battery-system section where they have context.
3. **Brand the CTA** — primary button uses the rose accent with gold hover/focus detail; single consistent CTA component everywhere.
4. **Trust layer** — guarantee line under every CTA, a refund/guarantee badge in the offer card, secure-payment microcopy, and testimonials reworked with avatars + role and one product-specific quote (I'll need a real quote or I'll leave a clearly-marked placeholder rather than invent one).
5. **Offer card as the visual peak** — price anchor ($27 one-time vs. $2.25/mo), stronger border/shadow/scale than any other card, checklist, guarantee, CTA.
6. **Rhythm and grid** — one content width (max-w-2xl) and one wide width (max-w-5xl); vary section padding so the offer gets more air; upgrade "Also included" into a proper card grid.
7. **Sticky mobile CTA bar** — appears after the hero scrolls out, hides at the offer section, respects safe-area inset.
8. **Add an "After you buy" 3-step strip** before the FAQ.
9. **SEO/meta** — real head tags plus JSON-LD Product/Offer, single H1 retained.

### Technical notes
Screenshots captured via Playwright against localhost, cropped, stored in `src/assets/` and imported as ES6 assets. No backend or business-logic changes. All colours through existing semantic tokens — no hardcoded hex. Verify at 375px and 1280px after, typecheck must pass.

### Open question
The testimonials: I can keep the existing three, but they're Mastermind income claims. If you have even one line from someone who used the *app*, that will outperform all three with cold traffic.
