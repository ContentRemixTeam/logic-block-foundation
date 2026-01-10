import { format, addDays } from 'date-fns';

export interface CycleExportData {
  // Step 1: Dates & Goal
  startDate: string;
  endDate: string;
  goal: string;
  why: string | null;
  identity: string | null;
  feeling: string | null;
  
  // Step 2: Business Diagnostic
  discoverScore: number | null;
  nurtureScore: number | null;
  convertScore: number | null;
  biggestBottleneck: string | null;
  
  // Step 3: Audience & Message
  audienceTarget: string | null;
  audienceFrustration: string | null;
  signatureMessage: string | null;
  
  // Step 4: Lead Gen Strategy
  leadPlatform: string | null;
  leadContentType: string | null;
  leadFrequency: string | null;
  secondaryPlatforms: unknown[];
  postingDays: string[];
  postingTime: string | null;
  batchDay: string | null;
  batchFrequency: string | null;
  leadGenContentAudit: string | null;
  
  // Step 5: Nurture Strategy
  nurtureMethod: string | null;
  nurtureFrequency: string | null;
  freeTransformation: string | null;
  proofMethods: string[];
  nurturePostingDays: string[];
  nurturePostingTime: string | null;
  nurtureBatchDay: string | null;
  nurtureBatchFrequency: string | null;
  nurtureContentAudit: string | null;
  
  // Step 6: Offers
  offers: Array<{
    name: string;
    price: number | null;
    transformation: string | null;
    isPrimary: boolean;
    frequency?: string;
  }>;
  
  // Step 7: 90-Day Breakdown
  revenueGoal: number | null;
  pricePerSale: number | null;
  launchSchedule: string | null;
  
  // Step 8: Success Metrics & Routines
  metric1Name: string | null;
  metric1Start: number | null;
  metric2Name: string | null;
  metric2Start: number | null;
  metric3Name: string | null;
  metric3Start: number | null;
  thingsToRemember: string[];
  weeklyPlanningDay: string | null;
  weeklyDebriefDay: string | null;
  officeHoursStart: string | null;
  officeHoursEnd: string | null;
  officeHoursDays: string[];
  
  // Step 9: Mindset & First 3 Days
  biggestFear: string | null;
  fearResponse: string | null;
  commitmentStatement: string | null;
  accountabilityPerson: string | null;
  day1Top3: string[];
  day1Why: string | null;
  day2Top3: string[];
  day2Why: string | null;
  day3Top3: string[];
  day3Why: string | null;
  
  // Auto-generated data
  generatedProjects?: Array<{ name: string; description?: string }>;
  generatedTasks?: Array<{ title: string; due_date?: string; priority?: string }>;
  generatedHabits?: Array<{ habit_name: string; description?: string }>;
  
  // Metadata
  exportedAt: string;
  cycleId: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientType = any;

// Helper to load cycle data from database
export async function loadCycleForExport(cycleId: string, supabase: SupabaseClientType): Promise<CycleExportData | null> {
  try {
    // Load main cycle
    const { data: cycle, error: cycleError } = await supabase
      .from('cycles_90_day')
      .select('*')
      .eq('cycle_id', cycleId)
      .single() as { data: Record<string, unknown> | null; error: unknown };
    
    if (cycleError || !cycle) return null;
    
    // Load strategy
    const { data: strategy } = await supabase
      .from('cycle_strategy')
      .select('*')
      .eq('cycle_id', cycleId)
      .single() as { data: Record<string, unknown> | null };
    
    // Load revenue plan
    const { data: revenue } = await supabase
      .from('cycle_revenue_plan')
      .select('*')
      .eq('cycle_id', cycleId)
      .single() as { data: Record<string, unknown> | null };
    
    // Load offers
    const { data: offersData } = await supabase
      .from('cycle_offers')
      .select('*')
      .eq('cycle_id', cycleId)
      .order('sort_order') as { data: Array<Record<string, unknown>> | null };
    
    // Load generated projects
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('cycle_id', cycleId)
      .order('created_at') as { data: Array<Record<string, unknown>> | null };
    
    // Load generated tasks (limit to first 100)
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('cycle_id', cycleId)
      .order('due_date', { ascending: true }) as { data: Array<Record<string, unknown>> | null };
    
    // Load generated habits
    const { data: habits } = await supabase
      .from('habits')
      .select('*')
      .eq('cycle_id', cycleId)
      .order('created_at') as { data: Array<Record<string, unknown>> | null };
    
    const startDate = cycle.start_date as string;
    const endDate = cycle.end_date as string;
    
    // Map database fields to export format
    return {
      // Step 1
      startDate,
      endDate,
      goal: cycle.goal as string,
      why: cycle.why as string | null,
      identity: cycle.identity as string | null,
      feeling: cycle.target_feeling as string | null,
      
      // Step 2
      discoverScore: cycle.discover_score as number | null,
      nurtureScore: cycle.nurture_score as number | null,
      convertScore: cycle.convert_score as number | null,
      biggestBottleneck: cycle.biggest_bottleneck as string | null,
      
      // Step 3
      audienceTarget: cycle.audience_target as string | null,
      audienceFrustration: cycle.audience_frustration as string | null,
      signatureMessage: cycle.signature_message as string | null,
      
      // Step 4 (from strategy)
      leadPlatform: strategy?.lead_primary_platform as string | null,
      leadContentType: strategy?.lead_content_type as string | null,
      leadFrequency: strategy?.lead_frequency as string | null,
      secondaryPlatforms: Array.isArray(strategy?.secondary_platforms) ? strategy.secondary_platforms as unknown[] : [],
      postingDays: Array.isArray(strategy?.posting_days) ? strategy.posting_days as string[] : [],
      postingTime: strategy?.posting_time as string | null,
      batchDay: strategy?.batch_day as string | null,
      batchFrequency: strategy?.batch_frequency as string | null,
      leadGenContentAudit: strategy?.lead_gen_content_audit as string | null,
      
      // Step 5 (from strategy)
      nurtureMethod: strategy?.nurture_method as string | null,
      nurtureFrequency: strategy?.nurture_frequency as string | null,
      freeTransformation: strategy?.free_transformation as string | null,
      proofMethods: Array.isArray(strategy?.proof_methods) ? strategy.proof_methods as string[] : [],
      nurturePostingDays: Array.isArray(strategy?.nurture_posting_days) ? strategy.nurture_posting_days as string[] : [],
      nurturePostingTime: strategy?.nurture_posting_time as string | null,
      nurtureBatchDay: strategy?.nurture_batch_day as string | null,
      nurtureBatchFrequency: strategy?.nurture_batch_frequency as string | null,
      nurtureContentAudit: strategy?.nurture_content_audit as string | null,
      
      // Step 6 (from offers)
      offers: (offersData || []).map(o => ({
        name: o.offer_name as string,
        price: o.price as number | null,
        transformation: o.transformation as string | null,
        isPrimary: o.is_primary as boolean,
        frequency: o.sales_frequency as string | undefined,
      })),
      
      // Step 7 (from revenue)
      revenueGoal: revenue?.revenue_goal as number | null,
      pricePerSale: revenue?.price_per_sale as number | null,
      launchSchedule: revenue?.launch_schedule as string | null,
      
      // Step 8
      metric1Name: cycle.metric_1_name as string | null,
      metric1Start: cycle.metric_1_start as number | null,
      metric2Name: cycle.metric_2_name as string | null,
      metric2Start: cycle.metric_2_start as number | null,
      metric3Name: cycle.metric_3_name as string | null,
      metric3Start: cycle.metric_3_start as number | null,
      thingsToRemember: Array.isArray(cycle.things_to_remember) ? cycle.things_to_remember as string[] : [],
      weeklyPlanningDay: cycle.weekly_planning_day as string | null,
      weeklyDebriefDay: cycle.weekly_debrief_day as string | null,
      officeHoursStart: cycle.office_hours_start as string | null,
      officeHoursEnd: cycle.office_hours_end as string | null,
      officeHoursDays: Array.isArray(cycle.office_hours_days) ? cycle.office_hours_days as string[] : [],
      
      // Step 9
      biggestFear: cycle.biggest_fear as string | null,
      fearResponse: cycle.fear_response as string | null,
      commitmentStatement: cycle.commitment_statement as string | null,
      accountabilityPerson: cycle.accountability_person as string | null,
      day1Top3: Array.isArray(cycle.day1_top3) ? cycle.day1_top3 as string[] : [],
      day1Why: cycle.day1_why as string | null,
      day2Top3: Array.isArray(cycle.day2_top3) ? cycle.day2_top3 as string[] : [],
      day2Why: cycle.day2_why as string | null,
      day3Top3: Array.isArray(cycle.day3_top3) ? cycle.day3_top3 as string[] : [],
      day3Why: cycle.day3_why as string | null,
      
      // Generated data
      generatedProjects: (projects || []).map(p => ({
        name: p.name as string,
        description: p.description as string | undefined,
      })),
      generatedTasks: (tasks || []).slice(0, 100).map(t => ({
        title: t.title as string,
        due_date: t.due_date as string | undefined,
        priority: t.priority as string | undefined,
      })),
      generatedHabits: (habits || []).map(h => ({
        habit_name: h.habit_name as string,
        description: h.description as string | undefined,
      })),
      
      // Metadata
      exportedAt: new Date().toISOString(),
      cycleId,
    };
  } catch (error) {
    console.error('Error loading cycle for export:', error);
    return null;
  }
}

// Export as JSON
export function exportCycleAsJSON(cycleData: CycleExportData): void {
  const jsonString = JSON.stringify(cycleData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `90-day-plan-${format(new Date(cycleData.startDate), 'yyyy-MM-dd')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export as beautifully formatted PDF (using print-to-PDF)
export async function exportCycleAsPDF(cycleData: CycleExportData): Promise<void> {
  const htmlContent = generatePDFHTML(cycleData);
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Could not open print window. Please allow popups.');
    return;
  }
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Trigger print dialog (user can save as PDF)
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

// Generate beautiful HTML for PDF
function generatePDFHTML(data: CycleExportData): string {
  const startDateFormatted = format(new Date(data.startDate), 'MMMM d, yyyy');
  const endDateFormatted = format(new Date(data.endDate), 'MMMM d, yyyy');
  
  const renderSection = (title: string, icon: string, content: string): string => {
    if (!content.trim()) return '';
    return `
      <div class="section">
        <div class="section-header">
          <span class="section-icon">${icon}</span>
          <span>${title}</span>
        </div>
        ${content}
      </div>
    `;
  };
  
  const renderField = (label: string, value: string | number | null | undefined): string => {
    if (!value && value !== 0) return '';
    return `
      <div class="field">
        <div class="field-label">${label}</div>
        <div class="field-value">${value}</div>
      </div>
    `;
  };

  const renderList = (items: string[]): string => {
    const filtered = items.filter(i => i && i.trim());
    if (filtered.length === 0) return '';
    return `<ul class="list">${filtered.map(item => `<li>${item}</li>`).join('')}</ul>`;
  };

  // Build sections
  let sectionsHTML = '';
  
  // Identity & Motivation
  if (data.identity || data.why || data.feeling) {
    sectionsHTML += renderSection('Identity & Motivation', '🧠', `
      ${data.identity ? `<div class="quote">"I am becoming ${data.identity}"</div>` : ''}
      ${renderField('Because', data.why)}
      ${renderField('I want to feel', data.feeling)}
    `);
  }
  
  // Business Diagnostic
  if (data.discoverScore || data.nurtureScore || data.convertScore) {
    sectionsHTML += renderSection('Business Diagnostic', '📊', `
      <div class="grid-3">
        ${data.discoverScore ? `
          <div class="score-card">
            <div class="score-value">${data.discoverScore}/10</div>
            <div class="score-label">Discover</div>
          </div>
        ` : ''}
        ${data.nurtureScore ? `
          <div class="score-card">
            <div class="score-value">${data.nurtureScore}/10</div>
            <div class="score-label">Nurture</div>
          </div>
        ` : ''}
        ${data.convertScore ? `
          <div class="score-card">
            <div class="score-value">${data.convertScore}/10</div>
            <div class="score-label">Convert</div>
          </div>
        ` : ''}
      </div>
      ${renderField('Biggest Bottleneck', data.biggestBottleneck)}
    `);
  }
  
  // Audience & Message
  if (data.audienceTarget || data.signatureMessage) {
    sectionsHTML += renderSection('Audience & Message', '👥', `
      ${renderField('Target Audience', data.audienceTarget)}
      ${renderField('Their Frustration', data.audienceFrustration)}
      ${data.signatureMessage ? `<div class="quote">"${data.signatureMessage}"</div>` : ''}
    `);
  }
  
  // Lead Gen Strategy
  if (data.leadPlatform) {
    sectionsHTML += renderSection('Lead Generation Strategy', '📣', `
      <div class="grid-2">
        ${renderField('Platform', data.leadPlatform)}
        ${renderField('Content Type', data.leadContentType?.replace(/-/g, ' '))}
        ${renderField('Frequency', data.leadFrequency)}
        ${data.postingDays.length > 0 ? renderField('Posting Days', data.postingDays.join(', ')) : ''}
      </div>
      ${data.batchDay ? renderField('Batching', `${data.batchDay} (${data.batchFrequency || 'weekly'})`) : ''}
      ${renderField('Content to Reuse', data.leadGenContentAudit)}
    `);
  }
  
  // Nurture Strategy
  if (data.nurtureMethod) {
    sectionsHTML += renderSection('Nurture Strategy', '💌', `
      <div class="grid-2">
        ${renderField('Method', data.nurtureMethod)}
        ${renderField('Frequency', data.nurtureFrequency)}
      </div>
      ${renderField('Free Transformation', data.freeTransformation)}
      ${data.proofMethods.length > 0 ? renderField('Proof Methods', data.proofMethods.join(', ')) : ''}
    `);
  }
  
  // Offers
  if (data.offers.length > 0 && data.offers.some(o => o.name)) {
    const offersContent = data.offers.filter(o => o.name).map(offer => `
      <div class="offer-card">
        <div class="offer-name">${offer.name}${offer.isPrimary ? ' ⭐' : ''}</div>
        ${offer.price ? `<div class="offer-price">$${offer.price.toLocaleString()}</div>` : ''}
        ${offer.transformation ? `<div class="offer-transform">${offer.transformation}</div>` : ''}
      </div>
    `).join('');
    sectionsHTML += renderSection('Your Offers', '💰', `<div class="offers-grid">${offersContent}</div>`);
  }
  
  // Revenue Goal
  if (data.revenueGoal) {
    sectionsHTML += renderSection('Revenue Goal', '📈', `
      <div class="revenue-highlight">$${data.revenueGoal.toLocaleString()}</div>
      ${data.pricePerSale ? `<div class="field-value" style="text-align: center; margin-top: 8px;">Average Sale: $${data.pricePerSale.toLocaleString()}</div>` : ''}
    `);
  }
  
  // Success Metrics
  if (data.metric1Name || data.metric2Name || data.metric3Name) {
    sectionsHTML += renderSection('Success Metrics', '🎯', `
      <div class="grid-3">
        ${data.metric1Name ? `
          <div class="metric-card">
            <div class="metric-name">${data.metric1Name}</div>
            <div class="metric-value">${data.metric1Start ?? 0}</div>
            <div class="metric-label">Starting</div>
          </div>
        ` : ''}
        ${data.metric2Name ? `
          <div class="metric-card">
            <div class="metric-name">${data.metric2Name}</div>
            <div class="metric-value">${data.metric2Start ?? 0}</div>
            <div class="metric-label">Starting</div>
          </div>
        ` : ''}
        ${data.metric3Name ? `
          <div class="metric-card">
            <div class="metric-name">${data.metric3Name}</div>
            <div class="metric-value">${data.metric3Start ?? 0}</div>
            <div class="metric-label">Starting</div>
          </div>
        ` : ''}
      </div>
    `);
  }
  
  // Things to Remember
  if (data.thingsToRemember.length > 0 && data.thingsToRemember.some(r => r)) {
    sectionsHTML += renderSection('Key Reminders', '💡', renderList(data.thingsToRemember));
  }
  
  // First 3 Days
  if (data.biggestFear || data.day1Top3.some(t => t)) {
    let first3DaysContent = '';
    
    if (data.biggestFear) {
      first3DaysContent += renderField('Biggest Fear', data.biggestFear);
    }
    if (data.fearResponse) {
      first3DaysContent += renderField('When Fear Shows Up, I Will...', data.fearResponse);
    }
    if (data.commitmentStatement) {
      first3DaysContent += `<div class="quote">"I commit to showing up for the next 3 days by ${data.commitmentStatement}"</div>`;
    }
    if (data.accountabilityPerson) {
      first3DaysContent += renderField('Accountability Partner', data.accountabilityPerson);
    }
    
    // Day cards
    const dayCards = [
      { day: 1, tasks: data.day1Top3, why: data.day1Why, color: '#6366f1' },
      { day: 2, tasks: data.day2Top3, why: data.day2Why, color: '#3b82f6' },
      { day: 3, tasks: data.day3Top3, why: data.day3Why, color: '#22c55e' },
    ].filter(d => d.tasks.some(t => t));
    
    if (dayCards.length > 0) {
      first3DaysContent += `<div class="days-grid">
        ${dayCards.map(d => `
          <div class="day-card" style="border-color: ${d.color}">
            <div class="day-number" style="background: ${d.color}">Day ${d.day}</div>
            <ul class="task-list">
              ${d.tasks.filter(t => t).map(t => `<li>${t}</li>`).join('')}
            </ul>
            ${d.why ? `<div class="day-why">${d.why}</div>` : ''}
          </div>
        `).join('')}
      </div>`;
    }
    
    sectionsHTML += renderSection('First 3 Days Action Plan', '⚡', first3DaysContent);
  }
  
  // Generated Content
  const hasGenerated = (data.generatedProjects?.length ?? 0) > 0 || 
                       (data.generatedTasks?.length ?? 0) > 0 || 
                       (data.generatedHabits?.length ?? 0) > 0;
  
  if (hasGenerated) {
    let generatedContent = '';
    
    if (data.generatedProjects && data.generatedProjects.length > 0) {
      generatedContent += `
        <div class="subsection">
          <div class="subsection-title">Projects Created (${data.generatedProjects.length})</div>
          ${renderList(data.generatedProjects.map(p => p.name))}
        </div>
      `;
    }
    
    if (data.generatedHabits && data.generatedHabits.length > 0) {
      generatedContent += `
        <div class="subsection">
          <div class="subsection-title">Habits to Track (${data.generatedHabits.length})</div>
          ${renderList(data.generatedHabits.map(h => h.habit_name))}
        </div>
      `;
    }
    
    if (data.generatedTasks && data.generatedTasks.length > 0) {
      const taskRows = data.generatedTasks.slice(0, 20).map(t => `
        <tr>
          <td>${t.title}</td>
          <td>${t.due_date ? format(new Date(t.due_date), 'MMM d, yyyy') : '-'}</td>
          <td>${t.priority || 'Medium'}</td>
        </tr>
      `).join('');
      
      generatedContent += `
        <div class="subsection">
          <div class="subsection-title">Tasks Scheduled (${data.generatedTasks.length})</div>
          <table class="tasks-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Due Date</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              ${taskRows}
              ${data.generatedTasks.length > 20 ? `<tr><td colspan="3" style="text-align: center; font-style: italic;">+ ${data.generatedTasks.length - 20} more tasks...</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      `;
    }
    
    sectionsHTML += renderSection('Auto-Generated Implementation Plan', '🚀', generatedContent);
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>90-Day Business Plan</title>
  <style>
    @page { margin: 0.5in; size: letter; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; font-size: 11pt; padding: 20px; }
    
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #6366f1; }
    .header h1 { font-size: 26pt; color: #6366f1; margin-bottom: 8px; font-weight: 700; }
    .header .subtitle { font-size: 14pt; color: #64748b; font-weight: 500; }
    .header .dates { margin-top: 12px; font-size: 12pt; color: #475569; }
    
    .section { margin-bottom: 28px; page-break-inside: avoid; }
    .section-header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 10px 16px; margin-bottom: 14px; border-radius: 8px; font-size: 14pt; font-weight: 600; display: flex; align-items: center; gap: 10px; }
    .section-icon { font-size: 18pt; }
    
    .field { margin-bottom: 12px; }
    .field-label { font-size: 10pt; color: #6366f1; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .field-value { color: #374151; font-size: 11pt; }
    
    .quote { font-style: italic; color: #6366f1; font-size: 12pt; padding: 12px 20px; border-left: 4px solid #6366f1; background: #f0f4ff; margin: 12px 0; border-radius: 0 8px 8px 0; }
    
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 12px 0; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0; }
    
    .score-card, .metric-card { background: #f8fafc; padding: 14px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
    .score-value, .metric-value { font-size: 22pt; font-weight: 700; color: #6366f1; }
    .score-label, .metric-label { font-size: 9pt; color: #64748b; text-transform: uppercase; }
    .metric-name { font-size: 10pt; color: #334155; font-weight: 600; margin-bottom: 4px; }
    
    .list { padding-left: 20px; margin: 8px 0; }
    .list li { margin-bottom: 6px; color: #475569; }
    
    .offers-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .offer-card { background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .offer-name { font-weight: 600; color: #1e293b; margin-bottom: 4px; }
    .offer-price { font-size: 18pt; font-weight: 700; color: #6366f1; }
    .offer-transform { font-size: 10pt; color: #64748b; margin-top: 4px; }
    
    .revenue-highlight { font-size: 36pt; font-weight: 700; color: #6366f1; text-align: center; padding: 20px; background: linear-gradient(135deg, #f0f4ff 0%, #ede9fe 100%); border-radius: 12px; }
    
    .days-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
    .day-card { border: 2px solid; border-radius: 10px; padding: 14px; background: white; }
    .day-number { color: white; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 12pt; display: inline-block; margin-bottom: 10px; }
    .task-list { list-style: none; padding: 0; }
    .task-list li { padding: 6px 10px; background: #f8fafc; margin-bottom: 6px; border-radius: 4px; border-left: 3px solid #6366f1; font-size: 10pt; }
    .day-why { font-size: 9pt; color: #64748b; font-style: italic; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
    
    .subsection { margin-top: 16px; }
    .subsection-title { font-size: 11pt; font-weight: 600; color: #334155; margin-bottom: 8px; padding-left: 10px; border-left: 3px solid #6366f1; }
    
    .tasks-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10pt; }
    .tasks-table th { background: #f1f5f9; padding: 8px; text-align: left; font-weight: 600; color: #334155; border-bottom: 2px solid #cbd5e1; }
    .tasks-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; color: #475569; }
    
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 9pt; }
    
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.goal || 'My 90-Day Business Plan'}</h1>
    <div class="subtitle">Becoming Boss Mastermind</div>
    <div class="dates">${startDateFormatted} - ${endDateFormatted}</div>
  </div>
  
  ${sectionsHTML}
  
  <div class="footer">
    <p>Created with Becoming Boss Mastermind Business Planner</p>
    <p>Generated on ${format(new Date(), 'MMMM d, yyyy')}</p>
  </div>
</body>
</html>
  `;
}
