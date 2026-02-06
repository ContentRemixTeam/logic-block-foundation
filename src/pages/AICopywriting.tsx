import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { MastermindGate } from '@/components/membership/MastermindGate';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAICopywritingSetupStatus } from '@/hooks/useAICopywriting';
import { LoadingState } from '@/components/system/LoadingState';

// Sub-pages
import { AIDashboard } from '@/components/ai-copywriting/AIDashboard';
import { BrandWizard } from '@/components/ai-copywriting/BrandWizard';
import { ContentGenerator } from '@/components/ai-copywriting/ContentGenerator';
import { CopyLibrary } from '@/components/ai-copywriting/CopyLibrary';
import { APIKeySettings } from '@/components/ai-copywriting/APIKeySettings';

const TABS = [
  { value: 'dashboard', label: 'Dashboard', path: '' },
  { value: 'generate', label: 'Generate', path: '/generate' },
  { value: 'library', label: 'Library', path: '/library' },
  { value: 'settings', label: 'Settings', path: '/settings' },
];

export default function AICopywriting() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, isSetupComplete, hasAPIKey, hasBrandProfile } = useAICopywritingSetupStatus();

  // Determine current tab from URL
  const currentPath = location.pathname.replace('/ai-copywriting', '');
  const currentTab = TABS.find(t => t.path === currentPath)?.value || 'dashboard';

  const handleTabChange = (value: string) => {
    const tab = TABS.find(t => t.value === value);
    if (tab) {
      navigate(`/ai-copywriting${tab.path}`);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <LoadingState message="Loading AI Copywriting..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <MastermindGate>
        <div className="space-y-6">
          {/* Header with Tabs */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold">AI Copywriting</h1>
              <p className="text-muted-foreground">Generate elite copy that sounds like you</p>
            </div>
            
            {isSetupComplete && (
              <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-4">
                  {TABS.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
          </div>

          {/* Routes */}
          <Routes>
            <Route 
              path="/" 
              element={
                isSetupComplete ? (
                  <AIDashboard />
                ) : !hasAPIKey ? (
                  <APIKeySettings showSetupPrompt />
                ) : !hasBrandProfile ? (
                  <Navigate to="/ai-copywriting/setup" replace />
                ) : (
                  <AIDashboard />
                )
              } 
            />
            <Route path="/setup" element={<BrandWizard />} />
            <Route path="/generate" element={<ContentGenerator />} />
            <Route path="/library" element={<CopyLibrary />} />
            <Route path="/settings" element={<APIKeySettings />} />
          </Routes>
        </div>
      </MastermindGate>
    </Layout>
  );
}
