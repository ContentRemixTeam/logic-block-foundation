

# Fix Invisible Cursor in SmartScratchPad

## Problem
When clicking into the scratch pad (or after clicking a tag button like #task), the text cursor (caret) is invisible. This happens because the textarea uses `text-transparent` and `WebkitTextFillColor: 'transparent'` to hide the actual text (so the highlight overlay shows through), but this can also hide the caret in some browsers.

## Solution
A small, targeted fix in one file: `src/components/SmartScratchPad.tsx`.

### Changes to `src/components/SmartScratchPad.tsx`

1. **Replace the inline `caretColor` style** with a more robust approach:
   - Remove `caret-foreground` from the Tailwind classes (line 371) since it's not a real Tailwind utility
   - Keep `text-transparent` (needed for the overlay trick)
   - Set `caretColor` to a solid, explicit color value like `'black'` (with dark mode consideration) or use `'auto'` which tells the browser to pick a visible color automatically
   - The simplest cross-browser fix: use `caret-color: auto` which forces the browser to render a visible caret regardless of text color

2. **Specific line changes** (lines 367-377):
   - In the className: remove `caret-foreground`, keep `text-transparent`
   - In the style prop: change `caretColor` from `'hsl(var(--foreground))'` to `'auto'`
   - Keep `WebkitTextFillColor: 'transparent'` as-is (needed for the overlay)

This is a 2-line change in a single file. No logic, data, or mutation changes.
