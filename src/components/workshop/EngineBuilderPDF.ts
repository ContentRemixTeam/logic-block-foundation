import jsPDF from 'jspdf';
import type { EngineBuilderData } from './EngineBuilderTypes';
import { PLATFORMS } from './PlatformScorecardData';
import { LOOP_LENGTHS, OFFER_FREQUENCIES, EMAIL_METHODS, SECONDARY_NURTURE_OPTIONS, SALES_METHODS } from './EngineBuilderTypes';

export function generateEngineBuilderPDF(data: EngineBuilderData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  const platform = PLATFORMS.find((p) => p.id === data.primaryPlatform);
  const additionalNames = (data.additionalPlatforms || [])
    .map((id) => {
      if (id === 'other') return data.customAdditionalPlatform || 'Other';
      return PLATFORMS.find((p) => p.id === id)?.name;
    })
    .filter(Boolean)
    .join(', ');
  const loopLabel = LOOP_LENGTHS.find((l) => l.value === data.loopLength)?.label || '—';
  const freqLabel = OFFER_FREQUENCIES.find((f) => f.value === data.offerFrequency)?.label || '—';
  const emailLabel = EMAIL_METHODS.find((e) => e.value === data.emailMethod)?.label || '—';
  const nurtureLabel = SECONDARY_NURTURE_OPTIONS.find((n) => n.value === data.secondaryNurture)?.label;
  const salesLabels = data.salesMethods.map((m) => SALES_METHODS.find((s) => s.value === m)?.label).filter(Boolean);
  const salesNeeded = data.revenueGoal && data.offerPrice && data.offerPrice > 0
    ? Math.ceil(data.revenueGoal / data.offerPrice) : null;

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Your Business Engine Blueprint', pageWidth / 2, y, { align: 'center' });
  y += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128);
  doc.text('Built with the Business Engine Builder', pageWidth / 2, y, { align: 'center' });
  y += 15;
  doc.setTextColor(0);

  // Section helper
  const addSection = (emoji: string, title: string, items: [string, string][]) => {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${emoji} ${title}`, 15, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    items.forEach(([label, value]) => {
      if (value) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}: `, 20, y);
        const labelWidth = doc.getTextWidth(`${label}: `);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 20 + labelWidth, y);
        y += 6;
      }
    });
    y += 5;
  };

  addSection('DISCOVER', 'Fuel System — How People Find You', [
    ['Primary Platform', platform?.name || data.customPlatform || '—'],
    ['Weekly Action', data.specificAction || '—'],
    ['Additional Sources', additionalNames || 'None'],
  ]);

  addSection('NURTURE', 'Engine Block — How You Stay Connected', [
    ['Email Method', emailLabel],
    ['Lead Magnet', data.freeTransformation || '—'],
    ['Secondary', nurtureLabel || 'None'],
  ]);

  addSection('CONVERT', 'Turbo Boost — How You Make Money', [
    ['Offer', data.offerName || '—'],
    ['Price', data.offerPrice ? `$${data.offerPrice.toLocaleString()}` : '—'],
    ['90-Day Goal', data.revenueGoal ? `$${data.revenueGoal.toLocaleString()}` : '—'],
    ['Sales Needed', salesNeeded ? String(salesNeeded) : '—'],
    ['Frequency', freqLabel],
    ['Sales Methods', salesLabels.join(', ') || '—'],
  ]);

  addSection('LOOP', 'Rev Cycle — Your Revenue Loop', [
    ['Loop Length', loopLabel],
    ['Content Slots', `${data.contentPlan.length} items planned`],
  ]);

  // Weekly schedule
  if (data.weeklySchedule.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SCHEDULE — Your Weekly Race Plan', 15, y);
    y += 8;

    doc.setFontSize(10);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach((day) => {
      const daySlots = data.weeklySchedule.filter(s => s.day === day);
      if (daySlots.length === 0) return;
      
      daySlots.forEach((slot, i) => {
        if (y > 275) { doc.addPage(); y = 20; }
        const typeEmoji = slot.type === 'create' ? 'Create' : slot.type === 'publish' ? 'Publish' : 'Engage';
        doc.setFont('helvetica', 'bold');
        const prefix = i === 0 ? `${slot.day}: ` : '          ';
        doc.text(prefix, 20, y);
        const prefixWidth = doc.getTextWidth(prefix);
        doc.setFont('helvetica', 'normal');
        doc.text(`[${typeEmoji}] ${slot.activity || '(not specified)'}`, 20 + prefixWidth, y);
        y += 6;
      });
    });
  }

  doc.save('business-engine-blueprint.pdf');
}
