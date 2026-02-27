

# Fix Sidebar Scrollbar Styling

## Problem
The sidebar's `SidebarContent` component uses native CSS `overflow-auto`, which renders the browser's default scrollbar -- an ugly gray track that looks broken and out of place with the rest of the UI.

## Solution
Replace the native `overflow-auto` scrollbar in the `SidebarContent` with custom CSS to style it to be minimal and subtle, matching the rest of the app's aesthetic. This avoids swapping the entire scroll mechanism and keeps the fix minimal.

## Changes

### File: `src/components/ui/sidebar.tsx`

Update the `SidebarContent` class to hide the default scrollbar and apply thin, styled scrollbar using Tailwind-compatible CSS utilities:

- Add `scrollbar-thin` styling via inline Tailwind classes that make the scrollbar track transparent and the thumb a subtle muted color
- Use the widely supported `scrollbar-width: thin` (Firefox) and `::-webkit-scrollbar` pseudo-elements (Chrome/Safari) approach
- The scrollbar thumb will only appear on hover, keeping the sidebar clean

Specifically, on the `SidebarContent` div (line 334), append custom scrollbar classes and add a small `<style>` block scoped to `[data-sidebar="content"]` for cross-browser scrollbar styling:
- Track: transparent
- Thumb: `hsl(var(--muted-foreground) / 0.2)`, rounded, 4px wide
- On hover: thumb becomes slightly more visible

This is a one-file, CSS-only change with zero logic impact.

