
# Add Consistent Content Topic Planning

## The Problem

Currently, only Podcast has topic planning inputs while Video and Blog do not. This is inconsistent since all three are "pillar content" formats that require upfront planning of specific topics.

## Solution

Add topic planning inputs for Video and Blog when selected, matching the Podcast pattern. Keep Email and Social without topic inputs since:
- **Email subjects** are derived from the suggested topics already shown
- **Social posts** are typically ongoing, daily content repurposed from pillar content

---

## Changes

### File: `src/types/launch.ts`

Add new fields for video and blog topics:

```typescript
// In LaunchWizardData
videoTopics: string[];   // Add alongside podcastTopics
blogTopics: string[];    // Add alongside podcastTopics
```

### File: `src/components/wizards/launch/LaunchContentPlan.tsx`

**1. Add state handlers for video and blog topics:**

```typescript
const videoTopics = data.videoTopics || ['', '', '', ''];
const blogTopics = data.blogTopics || ['', '', ''];

const updateVideoTopic = (index: number, value: string) => {
  const newTopics = [...videoTopics];
  newTopics[index] = value;
  onChange({ videoTopics: newTopics });
};

const updateBlogTopic = (index: number, value: string) => {
  const newTopics = [...blogTopics];
  newTopics[index] = value;
  onChange({ blogTopics: newTopics });
};
```

**2. Add topic inputs under Video section (after the stats callout):**

```text
Video Topics section:
┌────────────────────────────────────────────────┐
│ Video episode topics:                          │
│ [Video 1: Problem awareness            ]       │
│ [Video 2: Solution introduction        ]       │
│ [Video 3: Objection handling           ]       │
│ [Video 4: Social proof                 ]       │
└────────────────────────────────────────────────┘
```

**3. Add topic inputs under Blog section:**

```text
Blog Topics section:
┌────────────────────────────────────────────────┐
│ Blog post topics:                              │
│ [Post 1: Deep dive on the problem      ]       │
│ [Post 2: How the solution works        ]       │
│ [Post 3: Case study / success story    ]       │
└────────────────────────────────────────────────┘
```

**4. Update suggestions to be format-aware:**

The "Suggested Content Topics" section could optionally show how these topics translate to each selected format, but that may be overkill. The simpler approach is to just add the inputs.

---

## Why This Logic

| Format | Topic Planning | Reasoning |
|--------|---------------|-----------|
| Email | No | Topics come from the "Suggested Topics" section - each email addresses one suggested topic |
| Video | Yes (4) | Episodic pillar content - each video needs a clear topic |
| Podcast | Yes (4) | Episodic pillar content - each episode needs a clear topic |
| Blog | Yes (3) | Pillar content pieces - each post needs planning (fewer than video/podcast since blog takes longer) |
| Social | No | Daily/ongoing content that repurposes other content - too granular to plan here |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/launch.ts` | Add `videoTopics: string[]` and `blogTopics: string[]` to `LaunchWizardData` |
| `src/components/wizards/launch/LaunchContentPlan.tsx` | Add topic input sections for Video and Blog, matching Podcast pattern |

---

## Implementation Time

- Types update: ~5 minutes
- LaunchContentPlan updates: ~15 minutes
- Testing: ~10 minutes

**Total: ~30 minutes**
