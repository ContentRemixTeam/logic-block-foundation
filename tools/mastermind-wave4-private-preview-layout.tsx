import React from 'react';

export function Layout({ children }: { children: React.ReactNode }) {
  return <>
    <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-950" role="note">
      PRIVATE SAMPLE PREVIEW · Fake lesson and fake business data · Nothing here affects members or your real Planner
    </div>
    {children}
  </>;
}
