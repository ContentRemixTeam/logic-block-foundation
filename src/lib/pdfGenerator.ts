/**
 * Bulletproof PDF Generator using jsPDF
 * Works on ALL devices: mobile, tablet, desktop
 * Works in ALL browsers: Safari, Chrome, Firefox, Edge
 * No popups required - direct file download
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { CycleExportData } from './cycleExport';

// Colors in RGB format
const COLORS = {
  primary: [99, 102, 241] as [number, number, number],
  primaryLight: [240, 244, 255] as [number, number, number],
  purple: [139, 92, 246] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [26, 26, 26] as [number, number, number],
  gray: [71, 85, 105] as [number, number, number],
  lightGray: [241, 245, 249] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
};

export interface PDFGenerationResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}

/**
 * Generate a PDF from cycle data using jsPDF
 * This works on ALL devices and browsers without popups
 */
export async function generatePDFBlob(data: CycleExportData): Promise<PDFGenerationResult> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Helper: Check page break and add new page if needed
    const checkPageBreak = (neededHeight: number): boolean => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    };

    // Helper: Add wrapped text
    const addText = (text: string, fontSize: number, color: [number, number, number] = COLORS.black, isBold = false) => {
      if (!text) return;
      doc.setFontSize(fontSize);
      doc.setTextColor(...color);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, contentWidth);
      const lineHeight = fontSize * 0.4;
      lines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        doc.text(line, margin, y);
        y += lineHeight;
      });
    };

    // Helper: Add section header with colored background
    const addSectionHeader = (title: string) => {
      checkPageBreak(15);
      y += 3;
      doc.setFillColor(...COLORS.primary);
      doc.roundedRect(margin, y - 4, contentWidth, 10, 2, 2, 'F');
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 4, y + 3);
      y += 12;
      doc.setTextColor(...COLORS.black);
    };

    // Helper: Add field with label
    const addField = (label: string, value: string | number | null | undefined) => {
      if (!value && value !== 0) return;
      checkPageBreak(12);
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.primary);
      doc.setFont('helvetica', 'bold');
      doc.text(label.toUpperCase(), margin, y);
      y += 4;
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.black);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(String(value), contentWidth);
      lines.forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, margin, y);
        y += 5;
      });
      y += 2;
    };

    // ============================================================
    // HEADER with save instructions
    // ============================================================
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 60, 'F');

    // Yellow instruction banner at very top
    doc.setFillColor(255, 251, 235); // Light yellow
    doc.setDrawColor(251, 191, 36); // Yellow border
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, 4, contentWidth, 22, 2, 2, 'FD');

    // Instructions title with icon
    doc.setFontSize(10);
    doc.setTextColor(146, 64, 14); // Dark orange
    doc.setFont('helvetica', 'bold');
    doc.text('📥 HOW TO SAVE THIS PDF:', margin + 3, 10);

    // Instructions content
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 53, 15); // Brown
    doc.text('Desktop: Press Ctrl+S (Win) or Cmd+S (Mac), or click File → Save As / Print → Save as PDF', margin + 3, 15);
    doc.text('Mobile: Tap Share icon → Save to Files (iOS) or Download (Android)  |  Print: Ctrl+P / Cmd+P', margin + 3, 20);
    doc.text('✓ Your plan is also saved in your account - re-download anytime from Cycle Management!', margin + 3, 25);

    // Main title
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const goalText = data.goal || '90-Day Business Plan';
    const goalLines = doc.splitTextToSize(goalText, contentWidth - 10);
    doc.text(goalLines, pageWidth / 2, 38, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const startFormatted = format(new Date(data.startDate), 'MMMM d, yyyy');
    const endFormatted = format(new Date(data.endDate), 'MMMM d, yyyy');
    doc.text(`${startFormatted} - ${endFormatted}`, pageWidth / 2, 52, { align: 'center' });

    y = 68;

    // ============================================================
    // 1. IDENTITY & MOTIVATION
    // ============================================================
    if (data.identity || data.why || data.feeling) {
      addSectionHeader('1. Identity & Motivation');
      if (data.identity) {
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'italic');
        checkPageBreak(8);
        doc.text(`"I am becoming ${data.identity}"`, margin, y);
        y += 8;
      }
      addField('Because', data.why);
      addField('I want to feel', data.feeling);
      y += 3;
    }

    // ============================================================
    // 2. BUSINESS DIAGNOSTIC
    // ============================================================
    if (data.discoverScore || data.nurtureScore || data.convertScore) {
      addSectionHeader('2. Business Diagnostic');
      checkPageBreak(25);

      // Score boxes
      const boxWidth = (contentWidth - 10) / 3;
      const scores = [
        { label: 'Discover', value: data.discoverScore },
        { label: 'Nurture', value: data.nurtureScore },
        { label: 'Convert', value: data.convertScore },
      ].filter(s => s.value);

      scores.forEach((score, i) => {
        const boxX = margin + i * (boxWidth + 5);
        doc.setFillColor(...COLORS.lightGray);
        doc.roundedRect(boxX, y, boxWidth, 18, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.muted);
        doc.text(score.label, boxX + boxWidth / 2, y + 6, { align: 'center' });
        doc.setFontSize(16);
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.text(`${score.value}/10`, boxX + boxWidth / 2, y + 14, { align: 'center' });
        doc.setFont('helvetica', 'normal');
      });
      y += 23;

      addField('Biggest Bottleneck', data.biggestBottleneck);
      y += 3;
    }

    // ============================================================
    // 3. AUDIENCE & MESSAGE
    // ============================================================
    if (data.audienceTarget || data.signatureMessage) {
      addSectionHeader('3. Audience & Message');
      addField('Target Audience', data.audienceTarget);
      addField('Their Frustration', data.audienceFrustration);
      if (data.signatureMessage) {
        checkPageBreak(12);
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'italic');
        doc.text(`"${data.signatureMessage}"`, margin, y);
        y += 8;
      }
      y += 3;
    }

    // ============================================================
    // 4. LEAD GEN STRATEGY
    // ============================================================
    if (data.leadPlatform) {
      addSectionHeader('4. Lead Generation Strategy');
      addField('Platform', data.leadPlatform);
      addField('Content Type', data.leadContentType?.replace(/-/g, ' '));
      addField('Frequency', data.leadFrequency);
      if (data.postingDays.length > 0) {
        addField('Posting Days', data.postingDays.join(', '));
      }
      if (data.batchDay) {
        addField('Batching', `${data.batchDay} (${data.batchFrequency || 'weekly'})`);
      }
      addField('Content to Reuse', data.leadGenContentAudit);
      y += 3;
    }

    // ============================================================
    // 5. NURTURE STRATEGY
    // ============================================================
    if (data.nurtureMethod) {
      addSectionHeader('5. Nurture Strategy');
      addField('Method', data.nurtureMethod);
      addField('Frequency', data.nurtureFrequency);
      if (data.nurturePostingDays.length > 0) {
        addField('Posting Days', data.nurturePostingDays.join(', '));
      }
      addField('Free Transformation', data.freeTransformation);
      if (data.proofMethods.length > 0) {
        addField('Proof Methods', data.proofMethods.join(', '));
      }
      if (data.nurtureBatchDay) {
        addField('Batching', `${data.nurtureBatchDay} (${data.nurtureBatchFrequency || 'weekly'})`);
      }
      y += 3;
    }

    // ============================================================
    // 6. YOUR OFFERS
    // ============================================================
    const validOffers = data.offers.filter(o => o.name);
    if (validOffers.length > 0) {
      addSectionHeader('6. Your Offers');
      validOffers.forEach(offer => {
        checkPageBreak(15);
        doc.setFillColor(...COLORS.lightGray);
        doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.black);
        doc.setFont('helvetica', 'bold');
        doc.text(`${offer.name}${offer.isPrimary ? ' ⭐' : ''}`, margin + 3, y + 5);
        if (offer.price) {
          doc.setTextColor(...COLORS.primary);
          doc.text(`$${offer.price.toLocaleString()}`, pageWidth - margin - 3, y + 5, { align: 'right' });
        }
        if (offer.transformation) {
          doc.setFontSize(9);
          doc.setTextColor(...COLORS.muted);
          doc.setFont('helvetica', 'normal');
          doc.text(offer.transformation, margin + 3, y + 10);
        }
        y += 15;
      });
      y += 3;
    }

    // ============================================================
    // 7. REVENUE GOAL
    // ============================================================
    if (data.revenueGoal) {
      addSectionHeader('7. Revenue Goal');
      checkPageBreak(25);
      doc.setFillColor(...COLORS.primaryLight);
      doc.roundedRect(margin, y, contentWidth, 20, 3, 3, 'F');
      doc.setFontSize(24);
      doc.setTextColor(...COLORS.primary);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${data.revenueGoal.toLocaleString()}`, pageWidth / 2, y + 12, { align: 'center' });
      y += 24;
      if (data.pricePerSale) {
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.muted);
        doc.setFont('helvetica', 'normal');
        doc.text(`Average Sale: $${data.pricePerSale.toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
        y += 6;
      }
      y += 3;
    }

    // ============================================================
    // 8. SUCCESS METRICS
    // ============================================================
    if (data.metric1Name || data.metric2Name || data.metric3Name) {
      addSectionHeader('8. Success Metrics');
      checkPageBreak(25);

      const boxWidth = (contentWidth - 10) / 3;
      const metrics = [
        { name: data.metric1Name, value: data.metric1Start },
        { name: data.metric2Name, value: data.metric2Start },
        { name: data.metric3Name, value: data.metric3Start },
      ].filter(m => m.name);

      metrics.forEach((metric, i) => {
        const boxX = margin + i * (boxWidth + 5);
        doc.setFillColor(...COLORS.lightGray);
        doc.roundedRect(boxX, y, boxWidth, 18, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.gray);
        doc.text(String(metric.name), boxX + boxWidth / 2, y + 5, { align: 'center' });
        doc.setFontSize(14);
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.text(String(metric.value ?? 0), boxX + boxWidth / 2, y + 12, { align: 'center' });
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.muted);
        doc.setFont('helvetica', 'normal');
        doc.text('Starting', boxX + boxWidth / 2, y + 16, { align: 'center' });
      });
      y += 23;
    }

    // ============================================================
    // 9. WEEKLY ROUTINES
    // ============================================================
    if (data.weeklyPlanningDay || data.weeklyDebriefDay || data.officeHoursStart) {
      addSectionHeader('9. Weekly Routines');
      if (data.weeklyPlanningDay) addField('Weekly Planning', data.weeklyPlanningDay);
      if (data.weeklyDebriefDay) addField('Weekly Debrief', data.weeklyDebriefDay);
      if (data.officeHoursStart && data.officeHoursEnd) {
        addField('Office Hours', `${data.officeHoursStart} - ${data.officeHoursEnd}`);
      }
      if (data.officeHoursDays.length > 0) {
        addField('Working Days', data.officeHoursDays.join(', '));
      }
      y += 3;
    }

    // ============================================================
    // 10. KEY REMINDERS
    // ============================================================
    const validReminders = data.thingsToRemember.filter(r => r);
    if (validReminders.length > 0) {
      addSectionHeader('10. Key Reminders');
      validReminders.forEach(reminder => {
        checkPageBreak(7);
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.black);
        doc.text(`• ${reminder}`, margin + 2, y);
        y += 6;
      });
      y += 3;
    }

    // ============================================================
    // 10.5. RECURRING TASKS (if any exist in the data)
    // ============================================================
    // Note: This section will be populated when recurring tasks are passed via CycleExportData
    // The recurring tasks are generated as actual tasks, so we show a summary if there are any
    // recurring-category tasks in the generatedTasks array
    const recurringTasks = data.generatedTasks?.filter(t => 
      t.title?.toLowerCase().includes('recurring') || 
      t.priority === 'recurring' ||
      (t as any).category?.startsWith('recurring-')
    ) || [];
    
    if (recurringTasks.length > 0) {
      addSectionHeader('Recurring Tasks Summary');
      checkPageBreak(15);
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.muted);
      doc.text(`${recurringTasks.length} recurring tasks have been created for your 90-day cycle.`, margin, y);
      y += 6;
      doc.text('View them in your "🔁 Recurring Tasks" project in the Tasks page.', margin, y);
      y += 10;
    }

    // ============================================================
    // 11. FIRST 3 DAYS ACTION PLAN
    // ============================================================
    const hasDays = data.day1Top3.some(t => t) || data.day2Top3.some(t => t) || data.day3Top3.some(t => t);
    if (data.biggestFear || hasDays) {
      addSectionHeader('11. First 3 Days Action Plan');

      if (data.biggestFear) addField('Biggest Fear', data.biggestFear);
      if (data.fearResponse) addField('When fear shows up, I will...', data.fearResponse);
      if (data.commitmentStatement) {
        checkPageBreak(10);
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'italic');
        doc.text(`"I commit to showing up for the next 3 days by ${data.commitmentStatement}"`, margin, y);
        y += 8;
      }
      if (data.accountabilityPerson) addField('Accountability Partner', data.accountabilityPerson);

      // Day cards
      const days = [
        { num: 1, tasks: data.day1Top3, why: data.day1Why, color: COLORS.primary },
        { num: 2, tasks: data.day2Top3, why: data.day2Why, color: COLORS.blue },
        { num: 3, tasks: data.day3Top3, why: data.day3Why, color: COLORS.green },
      ].filter(d => d.tasks.some(t => t));

      days.forEach(day => {
        checkPageBreak(35);
        const validTasks = day.tasks.filter(t => t);
        const cardHeight = 15 + validTasks.length * 6 + (day.why ? 10 : 0);

        // Card background
        doc.setFillColor(day.color[0], day.color[1], day.color[2]);
        doc.roundedRect(margin, y, 25, 8, 2, 2, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Day ${day.num}`, margin + 12.5, y + 5.5, { align: 'center' });

        y += 10;
        validTasks.forEach((task, i) => {
          checkPageBreak(6);
          doc.setFontSize(10);
          doc.setTextColor(...COLORS.black);
          doc.setFont('helvetica', 'normal');
          doc.text(`${i + 1}. ${task}`, margin + 5, y);
          y += 6;
        });

        if (day.why) {
          checkPageBreak(8);
          doc.setFontSize(9);
          doc.setTextColor(...COLORS.muted);
          doc.setFont('helvetica', 'italic');
          const whyLines = doc.splitTextToSize(day.why, contentWidth - 10);
          whyLines.forEach((line: string) => {
            doc.text(line, margin + 5, y);
            y += 4;
          });
        }
        y += 5;
      });
    }

    // ============================================================
    // FOOTER
    // ============================================================
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text('Created with Becoming Boss Mastermind Business Planner', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Generated on ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth / 2, footerY + 4, { align: 'center' });

    // Generate blob
    const blob = doc.output('blob');
    return { success: true, blob };
  } catch (error) {
    console.error('PDF generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating PDF',
    };
  }
}

/**
 * Download PDF directly (works on all devices)
 */
export function downloadPDF(blob: Blob, filename: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

    return true;
  } catch (error) {
    console.error('Download error:', error);
    return false;
  }
}

/**
 * Generate and download PDF in one step
 */
export async function generateAndDownloadPDF(data: CycleExportData): Promise<{ success: boolean; error?: string }> {
  const result = await generatePDFBlob(data);

  if (!result.success || !result.blob) {
    return { success: false, error: result.error || 'Failed to generate PDF' };
  }

  const filename = `90-Day-Plan-${format(new Date(data.startDate), 'yyyy-MM-dd')}.pdf`;
  const downloaded = downloadPDF(result.blob, filename);

  if (!downloaded) {
    return { success: false, error: 'Failed to download PDF. Please try again.' };
  }

  return { success: true };
}
