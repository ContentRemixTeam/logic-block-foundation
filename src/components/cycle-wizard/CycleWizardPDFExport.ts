/**
 * PDF Export for the 90-Day Cycle Wizard
 * Generates a clean, one-page summary PDF
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { CycleWizardFormData } from './CycleWizardTypes';

// Colors in RGB format
const COLORS = {
  primary: [99, 102, 241] as [number, number, number],
  primaryLight: [240, 244, 255] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [26, 26, 26] as [number, number, number],
  gray: [71, 85, 105] as [number, number, number],
  lightGray: [241, 245, 249] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  amberLight: [254, 243, 199] as [number, number, number],
};

export interface PDFGenerationResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}

export async function generateCycleWizardPDF(data: CycleWizardFormData): Promise<PDFGenerationResult> {
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

    // Helper: Check page break
    const checkPageBreak = (neededHeight: number): boolean => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    };

    // Helper: Add section header
    const addSectionHeader = (title: string) => {
      checkPageBreak(12);
      y += 2;
      doc.setFillColor(...COLORS.primary);
      doc.roundedRect(margin, y - 3, contentWidth, 8, 1, 1, 'F');
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 3, y + 2);
      y += 10;
      doc.setTextColor(...COLORS.black);
    };

    // Helper: Add field
    const addField = (label: string, value: string | number | null | undefined) => {
      if (!value && value !== 0) return;
      checkPageBreak(10);
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.primary);
      doc.setFont('helvetica', 'bold');
      doc.text(label.toUpperCase(), margin, y);
      y += 3;
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.black);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(String(value), contentWidth);
      lines.forEach((line: string) => {
        checkPageBreak(4);
        doc.text(line, margin, y);
        y += 4;
      });
      y += 1;
    };

    // ============================================================
    // HEADER
    // ============================================================
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(...COLORS.white);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const goalText = data.goal || '90-Day Business Plan';
    const goalLines = doc.splitTextToSize(goalText, contentWidth - 10);
    doc.text(goalLines, pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const startFormatted = format(new Date(data.startDate), 'MMMM d, yyyy');
    const endFormatted = format(new Date(data.endDate), 'MMMM d, yyyy');
    doc.text(`${startFormatted} - ${endFormatted}`, pageWidth / 2, 28, { align: 'center' });

    y = 42;

    // ============================================================
    // 1. WHY & IDENTITY
    // ============================================================
    if (data.why || data.identity || data.targetFeeling) {
      addSectionHeader('1. Why & Identity');
      if (data.why) addField('Why This Goal', data.why);
      if (data.identity) {
        checkPageBreak(8);
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'italic');
        doc.text(`"I am becoming ${data.identity}"`, margin, y);
        y += 6;
      }
      if (data.targetFeeling) addField('Target Feeling', data.targetFeeling);
      y += 2;
    }

    // ============================================================
    // 2. BUSINESS DIAGNOSTIC
    // ============================================================
    addSectionHeader('2. Business Diagnostic');
    checkPageBreak(18);

    const boxWidth = (contentWidth - 8) / 3;
    const scores = [
      { label: 'Discover', value: data.discoverScore, focus: data.focusArea === 'discover' },
      { label: 'Nurture', value: data.nurtureScore, focus: data.focusArea === 'nurture' },
      { label: 'Convert', value: data.convertScore, focus: data.focusArea === 'convert' },
    ];

    scores.forEach((score, i) => {
      const boxX = margin + i * (boxWidth + 4);
      doc.setFillColor(...(score.focus ? COLORS.primaryLight : COLORS.lightGray));
      doc.roundedRect(boxX, y, boxWidth, 14, 1, 1, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(score.label + (score.focus ? ' ★' : ''), boxX + boxWidth / 2, y + 5, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.primary);
      doc.setFont('helvetica', 'bold');
      doc.text(`${score.value}/10`, boxX + boxWidth / 2, y + 11, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    });
    y += 18;

    // ============================================================
    // 3. SUCCESS METRICS
    // ============================================================
    if (data.metric1_name) {
      addSectionHeader('3. Success Metrics');
      const metrics = [
        { name: data.metric1_name, start: data.metric1_start, goal: data.metric1_goal },
        { name: data.metric2_name, start: data.metric2_start, goal: data.metric2_goal },
        { name: data.metric3_name, start: data.metric3_start, goal: data.metric3_goal },
      ].filter(m => m.name);

      metrics.forEach((metric) => {
        checkPageBreak(5);
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.black);
        doc.text(`• ${metric.name}: ${metric.start ?? 0} → ${metric.goal ?? '?'}`, margin, y);
        y += 5;
      });
      y += 2;
    }

    // ============================================================
    // 4. WEEKLY RHYTHM
    // ============================================================
    addSectionHeader('4. Weekly Rhythm');
    addField('Planning Day', data.weeklyPlanningDay);
    addField('Debrief Day', data.weeklyDebriefDay);
    if (data.officeHoursStart && data.officeHoursEnd) {
      addField('Office Hours', `${data.officeHoursStart} - ${data.officeHoursEnd}`);
    }
    y += 2;

    // ============================================================
    // 5. THE GAP STRATEGY
    // ============================================================
    if (data.gapStrategy || data.accountabilityPerson) {
      checkPageBreak(20);
      y += 2;
      doc.setFillColor(...COLORS.amberLight);
      doc.roundedRect(margin, y - 3, contentWidth, 16, 1, 1, 'F');
      doc.setTextColor(...COLORS.amber);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('⚠️ THE GAP STRATEGY (Days 18-28)', margin + 3, y + 2);
      y += 6;
      doc.setTextColor(...COLORS.black);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (data.gapStrategy) {
        const gapLines = doc.splitTextToSize(data.gapStrategy, contentWidth - 6);
        gapLines.slice(0, 2).forEach((line: string) => {
          doc.text(line, margin + 3, y);
          y += 3.5;
        });
      }
      if (data.accountabilityPerson) {
        doc.text(`Accountability: ${data.accountabilityPerson}`, margin + 3, y);
        y += 4;
      }
      y += 4;
    }

    // ============================================================
    // 6. OBSTACLES
    // ============================================================
    if (data.biggestBottleneck || data.biggestFear) {
      addSectionHeader('5. Obstacles & Response');
      if (data.biggestBottleneck) addField('Bottleneck', data.biggestBottleneck);
      if (data.biggestFear) addField('Fear', data.biggestFear);
      if (data.fearResponse) addField('Response', data.fearResponse);
      y += 2;
    }

    // ============================================================
    // 7. MINDSET ANCHORS
    // ============================================================
    if (data.usefulBelief || data.usefulThought || data.thingsToRemember.length > 0) {
      addSectionHeader('6. Mindset Anchors');
      if (data.usefulBelief) addField('Belief', data.usefulBelief);
      if (data.limitingThought && data.usefulThought) {
        checkPageBreak(8);
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.muted);
        doc.text(`When I think "${data.limitingThought}" → I'll switch to "${data.usefulThought}"`, margin, y);
        y += 5;
      }
      if (data.thingsToRemember.length > 0) {
        checkPageBreak(4 + data.thingsToRemember.length * 4);
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.text('REMINDERS:', margin, y);
        y += 4;
        doc.setTextColor(...COLORS.black);
        doc.setFont('helvetica', 'normal');
        data.thingsToRemember.forEach((reminder) => {
          doc.text(`• ${reminder}`, margin + 2, y);
          y += 4;
        });
      }
    }

    // ============================================================
    // FOOTER
    // ============================================================
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `Generated on ${format(new Date(), 'MMMM d, yyyy')}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );

    // Generate blob
    const blob = doc.output('blob');

    return { success: true, blob };
  } catch (error) {
    console.error('PDF generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    };
  }
}
