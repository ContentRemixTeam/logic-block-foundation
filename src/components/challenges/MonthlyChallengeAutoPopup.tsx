/**
 * Monthly Challenge Auto Popup
 * Shows automatically when a user logs in during a new month
 * and hasn't enrolled in the current month's challenge yet.
 * Dismissal is stored in localStorage so it only shows once per month.
 */

import { useState, useEffect } from 'react';
import { useMonthlyChallenge } from '@/hooks/useMonthlyChallenge';
import { ChallengeEnrollmentModal } from './ChallengeEnrollmentModal';

const DISMISSED_KEY = 'monthly-challenge-dismissed';

function getDismissedMonth(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

function setDismissedMonth(monthKey: string) {
  try {
    localStorage.setItem(DISMISSED_KEY, monthKey);
  } catch {}
}

export function MonthlyChallengeAutoPopup() {
  const {
    featureEnabled,
    featureLoading,
    currentTemplate,
    hasActiveChallenge,
    isLoading,
    userChallenge,
  } = useMonthlyChallenge();

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Wait for data to load
    if (featureLoading || isLoading) return;
    if (!featureEnabled || !currentTemplate) return;

    // Don't show if already enrolled or completed
    if (hasActiveChallenge || userChallenge?.status === 'completed') return;

    // Check if already dismissed this month
    const monthKey = currentTemplate.month_start;
    if (getDismissedMonth() === monthKey) return;

    // Show popup after a short delay for better UX
    const timer = setTimeout(() => setShowModal(true), 1500);
    return () => clearTimeout(timer);
  }, [featureLoading, featureEnabled, currentTemplate, hasActiveChallenge, isLoading, userChallenge]);

  const handleOpenChange = (open: boolean) => {
    setShowModal(open);
    if (!open && currentTemplate) {
      // Mark as dismissed for this month
      setDismissedMonth(currentTemplate.month_start);
    }
  };

  return <ChallengeEnrollmentModal open={showModal} onOpenChange={handleOpenChange} />;
}
