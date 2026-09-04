import { Navigate, Route, Routes } from 'react-router-dom';
import { ScorecardShell } from '@/components/scorecard-product/ScorecardShell';
import { ScorecardToday } from '@/components/scorecard-product/ScorecardToday';
import { ScorecardWeek } from '@/components/scorecard-product/ScorecardWeek';
import { ScorecardActionSetup } from '@/components/scorecard-product/ScorecardActionSetup';
import { ScorecardToolkit } from '@/components/scorecard-product/ScorecardToolkit';

export default function ScorecardApp() {
  return (
    <ScorecardShell>
      <Routes>
        <Route index element={<Navigate to="today" replace />} />
        <Route path="today" element={<ScorecardToday />} />
        <Route path="week" element={<ScorecardWeek />} />
        <Route path="toolkit" element={<ScorecardToolkit />} />
        <Route path="setup" element={<ScorecardActionSetup />} />
        <Route path="*" element={<Navigate to="today" replace />} />
      </Routes>
    </ScorecardShell>
  );
}
