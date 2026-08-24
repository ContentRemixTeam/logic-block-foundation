import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MastermindSuccessPath from '@/pages/MastermindSuccessPath';

const cycle = '11111111-1111-4111-8111-111111111111';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MemoryRouter initialEntries={[`/mastermind/success-path/${cycle}`]}>
      <Routes>
        <Route path="/mastermind/success-path/:cycleId" element={<MastermindSuccessPath />} />
        <Route path="/support" element={<main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-semibold">Sample support route</h1><p className="mt-3">In the real version, this returns the member to the approved Mastermind support path.</p></main>} />
        <Route path="/cycle-setup" element={<main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-semibold">Sample cycle setup</h1></main>} />
      </Routes>
    </MemoryRouter>
  </React.StrictMode>,
);
