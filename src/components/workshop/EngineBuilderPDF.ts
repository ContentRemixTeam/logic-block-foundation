import jsPDF from 'jspdf';
import type { EngineBuilderData } from './EngineBuilderTypes';
import { PLATFORMS } from './PlatformScorecardData';
import { LOOP_LENGTHS, OFFER_FREQUENCIES, EMAIL_METHODS, SECONDARY_NURTURE_OPTIONS, SALES_METHODS, BATCH_OPTIONS } from './EngineBuilderTypes';

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
  const emailLabel = data.emailMethod === 'other' ? (data.customEmailMethod || 'Custom') : (EMAIL_METHODS.find((e) => e.value === data.emailMethod)?.label || data.emailMethod || '—');
  const nurtureLabel = data.secondaryNurture === 'other' ? (data.customNurture || 'Custom') : SECONDARY_NURTURE_OPTIONS.find((n) => n.value === data.secondaryNurture)?.label;
  const salesLabels = data.salesMethods.map((m) => SALES_METHODS.find((s) => s.value === m)?.label).filter(Boolean);
  const salesNeeded = data.revenueGoal && data.offerPrice && data.offerPrice > 0
    ? Math.ceil(data.revenueGoal / data.offerPrice) : null;

  const checkPage = () => {
    if (y > 265) { doc.addPage(); y = 20; }
  };

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
    checkPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${emoji} ${title}`, 15, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    items.forEach(([label, value]) => {
      if (value && value !== '—') {
        checkPage();
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}: `, 20, y);
        const labelWidth = doc.getTextWidth(`${label}: `);
        doc.setFont('helvetica', 'normal');
        // Wrap long text
        const maxWidth = pageWidth - 25 - labelWidth;
        const lines = doc.splitTextToSize(value, maxWidth);
        doc.text(lines[0], 20 + labelWidth, y);
        if (lines.length > 1) {
          for (let i = 1; i < lines.length; i++) {
            y += 5;
            checkPage();
            doc.text(lines[i], 25, y);
          }
        }
        y += 6;
      }
    });
    y += 5;
  };

  // --- DISCOVER ---
  const additionalActions = (data.additionalPlatforms || [])
    .map((id) => {
      const p = PLATFORMS.find((pl) => pl.id === id);
      const label = p ? p.name : (id === 'other' ? (data.customAdditionalPlatform || 'Other') : id);
      const action = data.additionalPlatformActions?.[id];
      return action ? `${label}: ${action}` : null;
    })
    .filter(Boolean)
    .join('; ');

  addSection('DISCOVER', 'Fuel System — How People Find You', [
    ['Primary Platform', platform?.name || data.customPlatform || '—'],
    ['Weekly Action', data.specificAction || '—'],
    ['Additional Sources', additionalNames || 'None'],
    ['Additional Actions', additionalActions || ''],
  ]);

  // --- NURTURE ---
  const nurtureFreqLabel = data.secondaryNurtureFrequency === 'other' 
    ? (data.customNurtureFrequency || 'Custom') 
    : data.secondaryNurtureFrequency || '';

  addSection('NURTURE', 'Engine Block — How You Stay Connected', [
    ['Email Frequency', emailLabel],
    ['Main Message / Lead Magnet', data.freeTransformation || '—'],
    ['Secondary Nurture', nurtureLabel || 'None'],
    ['Secondary Frequency', nurtureFreqLabel],
  ]);

  // --- CONVERT ---
  const sellFreqLabels: Record<string, string> = {
    'weekly': 'Weekly',
    'evergreen-urgency': 'Evergreen with urgency',
    'monthly': 'Monthly launches',
    'quarterly': 'Quarterly launches',
    'yearly': '1-2x per year',
  };
  const sellFreq = sellFreqLabels[data.offerFrequency] || data.customOfferFrequency || data.offerFrequency || '—';

  addSection('CONVERT', 'Turbo Boost — How You Make Money', [
    ['Main Offer', data.offerName || '—'],
    ['Price', data.offerPrice ? `$${data.offerPrice.toLocaleString()}` : '—'],
    ['90-Day Goal', data.revenueGoal ? `$${data.revenueGoal.toLocaleString()}` : '—'],
    ['Sales Needed', salesNeeded ? String(salesNeeded) : '—'],
    ['Sell Frequency', sellFreq],
    ['Sales Methods', salesLabels.join(', ') || '—'],
  ]);

  // Secondary offers
  if (data.secondaryOffers?.length > 0) {
    checkPage();
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Secondary Offers:', 20, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    data.secondaryOffers.forEach((offer) => {
      checkPage();
      const priceStr = offer.price ? ` — $${offer.price}` : '';
      doc.text(`• ${offer.name}${priceStr}`, 25, y);
      y += 5;
    });
    y += 3;
  }

  // Secondary revenue sources
  const revenueSourceLabels: Record<string, string> = {
    'order-bumps': 'Order bumps & upsells',
    'affiliate': 'Affiliate income',
    'digital-shop': 'Digital product shop',
    'workshops': 'Workshops & events',
    'vip-services': '1:1 services or VIP days',
    'membership': 'Membership or subscription',
    'speaking': 'Speaking or brand deals',
  };
  if (data.secondaryRevenueSources?.length > 0) {
    checkPage();
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Secondary Revenue Streams:', 20, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    data.secondaryRevenueSources.forEach((src) => {
      checkPage();
      const label = revenueSourceLabels[src] || src;
      doc.text(`• ${label}`, 25, y);
      y += 5;
    });
    if (data.revenueSourceGrowthGoal) {
      y += 2;
      doc.text(`Growth Goal: ${data.revenueSourceGrowthGoal}`, 25, y);
      y += 5;
    }
    y += 3;
  }

  // --- REVENUE LOOP ---
  addSection('LOOP', 'Rev Cycle — Your Revenue Loop', [
    ['Loop Length', loopLabel],
    ['Content Slots', `${data.contentPlan.length} items planned`],
  ]);

  // --- EDITORIAL / SCHEDULE ---
  const batchLabel = BATCH_OPTIONS.find(b => b.value === data.batchOrLive)?.label || data.batchOrLive || '—';
  const batchFreqLabels: Record<string, string> = {
    'weekly': 'Weekly', 'biweekly': 'Every 2 Weeks', 'monthly': 'Monthly', 'quarterly': 'Quarterly',
  };

  addSection('SCHEDULE', 'Race Day — Your Content Workflow', [
    ['Creation Style', batchLabel],
    ['Batch Frequency', (data.batchOrLive === 'batch' || data.batchOrLive === 'hybrid') ? (batchFreqLabels[data.batchFrequency] || '—') : ''],
    ['Batch Day', (data.batchOrLive === 'batch' || data.batchOrLive === 'hybrid') ? (data.batchDay || '—') : ''],
    ['Focus Area', data.engineFocusArea ? data.engineFocusArea.charAt(0).toUpperCase() + data.engineFocusArea.slice(1) : '—'],
  ]);

  // Weekly schedule
  if (data.weeklySchedule.length > 0) {
    checkPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('WEEKLY RACE PLAN', 15, y);
    y += 8;

    doc.setFontSize(10);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach((day) => {
      const daySlots = data.weeklySchedule.filter(s => s.day === day);
      if (daySlots.length === 0) return;
      
      daySlots.forEach((slot, i) => {
        checkPage();
        const typeLabel = slot.type === 'create' ? 'Create' : slot.type === 'publish' ? 'Publish' : 'Engage';
        doc.setFont('helvetica', 'bold');
        const prefix = i === 0 ? `${slot.day}: ` : '          ';
        doc.text(prefix, 20, y);
        const prefixWidth = doc.getTextWidth(prefix);
        doc.setFont('helvetica', 'normal');
        doc.text(`[${typeLabel}] ${slot.activity || '(not specified)'}`, 20 + prefixWidth, y);
        y += 6;
      });
    });
  }

  doc.save('business-engine-blueprint.pdf');
}
