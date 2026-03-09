

# Bundle Product Recommendations — Build Plan

## Data Understanding

**Free Bundle** (~170 gifts): Fields needed — Name, Gift Name, Landing Page URL, Category, Description, Value, Sponsorship status (column 5 links to sponsor name)
**VIP Gifts** (17 products): Name, Product Name, URL, Category, Description, Regular Price
**Sponsors** (13 sponsors): Name, Sponsorship Level (Gold $197 / Silver $97)

**Categories found in data:**
- Business Strategy
- Apps/AI/Software
- Email Marketing
- Branding and Copywriting
- Course and Product Creation
- Productivity & Business Systems
- Collaborations/Bundles/Summits
- Pinterest & Social Media
- Blogging and SEO
- Mindset / Wellness / Self-Care
- Video / YouTube / Podcasting

## Recommendation Mapping Logic

Each product gets tagged with which engine builder selections it matches:

| Engine Step | User Selection | Matching Categories/Keywords |
|---|---|---|
| Discover (Platform) | Instagram, YouTube, Pinterest, LinkedIn, Blog/SEO, Podcast, Facebook | Match by category + description keywords |
| Nurture (Method) | Newsletter, Sequence, Broadcast + secondary (podcast, YouTube, blog, community, DM) | Email Marketing, community tools, content planning |
| Convert (Offer Type) | Sales page, webinar, DM selling, calls, email launch, checkout link | Business Strategy, course creation, copywriting |
| General | Always relevant | Productivity & Business Systems, AI tools |

## Display Rules (Per User's Request)
1. **VIP products at top** — labeled "BOSS MODE RECOMMENDATIONS" with upgrade link to `https://faithmariah.com/bundle-offer`
2. **Sponsor gifts prioritized** within free recommendations (sorted to top) but NOT labeled as sponsors
3. **Free gifts** sorted by relevance score, sponsors silently first
4. **Direct links** to each gift's landing page

## What Gets Built

### New Files
- `src/components/workshop/BundleRecommendationData.ts` — Hardcoded product arrays (free gifts, VIP gifts) with tags for matching. Each product: `{ name, contributorName, url, category, description, value, isSponsor, tags: string[] }`
- `src/components/workshop/BundleRecommendations.tsx` — Recommendation engine component that takes `EngineBuilderData` and renders matched products in sections: Boss Mode (VIP) → Free Gifts (sponsors silently first)

### Modified Files
- `src/components/workshop/steps/StepResults.tsx` — Add `<BundleRecommendations data={data} />` section below the engine blueprint summary

### Tagging Strategy
Each product gets an array of tags like `['instagram', 'email', 'sales-page', 'course-creation', 'content-planning']` based on its category + description keywords. The recommendation engine scores products by how many tags match the user's selections across all 5 steps, then sorts by score (sponsors get a +1 boost to float up without being labeled).

### UI Design
- **Boss Mode section**: Gold/amber accent border, crown emoji, "Upgrade to Boss Mode" link → `faithmariah.com/bundle-offer`
- **Free recommendations**: Clean card grid with gift name, contributor, value badge, description snippet, and "Get It Free →" button linking to landing page
- Race car theme: "Your Pit Crew Picks" header, "Tools to supercharge your engine" subheading
- Show top 8-12 most relevant free gifts + all matching VIP gifts

