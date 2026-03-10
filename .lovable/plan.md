

## Make Workshop Replay Easy to Find

The video embed already exists at the top of the page but has no heading or label — it's just a silent iframe. I'll add a prominent replay banner above the video to make it unmissable.

### Changes to `src/pages/WorkshopWelcomePage.tsx`

**Update the video SectionCard (lines 162-195)** to include:
- A bold heading: "🎬 Watch the Workshop Replay"
- A short subtitle: "Missed the live session? Watch the full replay below!"
- A highlighted banner-style treatment (gradient background, primary border) so it stands out as the first thing visitors see
- Keep the existing embed, Watch on YouTube button, and Subscribe button

This is a single-file, small change — just adding a heading and subtitle inside the existing `SectionCard`, plus upgrading its styling to use the gradient border treatment already used on other prominent cards.

