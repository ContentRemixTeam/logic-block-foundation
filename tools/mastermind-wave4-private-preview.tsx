import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MastermindSuccessPath from '@/pages/MastermindSuccessPath';
import { FILMING_GROUPS, filmingManifestSummary, mastermindVideoFilmingManifest } from './mastermind-video-filming-manifest';

const cycle = '11111111-1111-4111-8111-111111111111';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MemoryRouter initialEntries={[`/mastermind/success-path/${cycle}`]}>
      <aside className="border-b-4 border-amber-600 bg-amber-100 p-4 text-center font-bold text-amber-950">FAKE / PRIVATE / OFFLINE / NOT LIVE — no production connection, playback disabled</aside>
      <section className="mx-auto grid max-w-3xl gap-2 px-4 pt-4 text-sm sm:grid-cols-2" aria-label="Offline engagement scenarios">
        <p className="rounded border p-3"><strong>Assigned / not opened:</strong> Your lesson is ready when you are.</p>
        <p className="rounded border p-3"><strong>Watched / no action:</strong> Choose one useful action when it fits.</p>
        <p className="rounded border p-3"><strong>Stalled:</strong> You are not behind. Reduce the step or ask for support.</p>
        <p className="rounded border p-3"><strong>Returned:</strong> Welcome back. Continue with one current step.</p>
      </section>
      <section className="mx-auto max-w-3xl px-4 pt-4" aria-labelledby="orientation-placeholder-title">
        <div className="rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 p-4 text-violet-950">
          <span className="inline-flex rounded-full bg-violet-200 px-3 py-1 text-xs font-bold">RECORD THIS</span>
          <h2 id="orientation-placeholder-title" className="mt-3 text-lg font-semibold">Start Here: You Are the Boss of Your Success Path</h2>
          <p className="mt-2 text-sm">You are the boss of your business. This Success Path is a suggestion based on what you shared. You can edit it, replace it, reschedule it, choose a different path, or ask for support.</p>
          <button type="button" disabled className="mt-3 min-h-11 w-full cursor-not-allowed rounded-md border bg-white px-4 text-sm opacity-70 sm:w-auto">Video coming before the private pilot</button>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-4" aria-label="Faith-only video production planning">
        <aside style={{ backgroundColor: '#881337', color: '#ffffff' }} className="rounded-t-lg px-4 py-3 text-center text-sm font-bold">PRIVATE PRODUCTION PLANNING — MEMBERS WILL NOT SEE THIS</aside>
        <details className="rounded-b-lg border border-t-0 bg-white">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 py-3 font-semibold">Faith's video production placeholders</summary>
          <div className="space-y-5 border-t p-4">
            <p className="rounded-md bg-slate-100 p-3 text-sm font-semibold">{filmingManifestSummary}</p>
            {FILMING_GROUPS.map(group => (
              <div key={group} className="space-y-3" data-filming-group={group}>
                {mastermindVideoFilmingManifest.filter(item => item.group === group).map(item => (
                  <article key={item.id} className="min-w-0 rounded-lg border p-4" data-filming-item={item.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">{item.statusLabel}</span>
                      {'slot' in item && <span className="text-xs font-semibold text-slate-600">{item.slot}</span>}
                    </div>
                    <h3 className="mt-3 break-words font-semibold">{item.title}</h3>
                    {'internalStatus' in item && <p className="mt-2 text-xs font-bold text-amber-800">{item.internalStatus}</p>}
                    <dl className="mt-3 space-y-2 text-sm">
                      <div><dt className="font-semibold">Target length / treatment</dt><dd>{item.target}</dd></div>
                      <div><dt className="font-semibold">Purpose</dt><dd>{item.purpose}</dd></div>
                      <div><dt className="font-semibold">Next production action</dt><dd>{item.nextAction}</dd></div>
                    </dl>
                    <button type="button" disabled className="mt-3 min-h-11 w-full cursor-not-allowed rounded-md border px-4 text-sm opacity-60 sm:w-auto">Production placeholder only</button>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </details>
      </section>
      <Routes>
        <Route path="/mastermind/success-path/:cycleId" element={<MastermindSuccessPath />} />
        <Route path="/support" element={<main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-semibold">Sample support route</h1><p className="mt-3">In the real version, this returns the member to the approved Mastermind support path.</p></main>} />
        <Route path="/cycle-setup" element={<main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-semibold">Sample cycle setup</h1></main>} />
      </Routes>
    </MemoryRouter>
  </React.StrictMode>,
);
