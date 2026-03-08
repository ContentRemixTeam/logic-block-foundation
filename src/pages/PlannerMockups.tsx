/**
 * Seasonal Planner Mockups
 * Shows how seasonal line art + palettes integrate across:
 * 1. Dashboard (Command Center)
 * 2. Daily Plan
 * 3. Weekly Planner
 */
import { useState } from 'react';
import { SEASONAL_THEMES, type SeasonalTheme } from '@/lib/seasonalThemes';
import { Switch } from '@/components/ui/switch';
import {
  Check, Flame, TrendingUp, Target, Calendar, Clock,
  Sun, Moon, Star, Zap, BarChart3, BookOpen, Sparkles,
  ChevronRight, Plus, GripVertical,
} from 'lucide-react';

/* ─── palette helpers ─── */
function accent(t: SeasonalTheme) { return `hsl(${t.palette.primary})`; }
function accentBg(t: SeasonalTheme) { return `hsl(${t.palette.primary} / 0.08)`; }
function accentMedium(t: SeasonalTheme) { return `hsl(${t.palette.primary} / 0.25)`; }
function border(t: SeasonalTheme) { return `hsl(${t.palette.primary} / 0.15)`; }
function gradientBg(t: SeasonalTheme) {
  return `linear-gradient(135deg, hsl(${t.palette.gradientFrom} / 0.06), hsl(${t.palette.gradientTo} / 0.03))`;
}
function gradientSolid(t: SeasonalTheme) {
  return `linear-gradient(135deg, hsl(${t.palette.gradientFrom}), hsl(${t.palette.gradientTo}))`;
}
function bannerText(t: SeasonalTheme) { return `hsl(${t.palette.primary})`; }
function artTint(t: SeasonalTheme) {
  // Build a CSS filter that tints the grayscale art with the theme color
  // We use sepia + hue-rotate to approximate the target hue
  const hue = t.palette.primary.split(' ')[0]; // extract hue from "210 40% 60%"
  return `brightness(0.6) sepia(1) hue-rotate(${Number(hue) - 50}deg) saturate(1.5)`;
}

/* ─── Section label ─── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-10">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">{children}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ─── Annotation callout ─── */
function Callout({ children, position = 'top-right' }: { children: string; position?: string }) {
  const posClasses: Record<string, string> = {
    'top-right': 'top-1 right-2',
    'top-left': 'top-1 left-2',
    'bottom-right': 'bottom-1 right-2',
    'bottom-left': 'bottom-1 left-2',
  };
  return (
    <span className={`absolute ${posClasses[position] || posClasses['top-right']} text-[8px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium z-10 pointer-events-none`}>
      {children}
    </span>
  );
}

export default function PlannerMockups() {
  const currentMonth = new Date().getMonth(); // 0-based
  const [activeIdx, setActiveIdx] = useState(currentMonth);
  const [themeEnabled, setThemeEnabled] = useState(true);
  const theme = SEASONAL_THEMES[activeIdx];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
          Integration Preview
        </p>
        <h1 className="text-xl font-semibold text-foreground tracking-tight mb-2">
          Where Seasonal Graphics Appear
        </h1>
        <p className="text-xs text-muted-foreground mb-6">
          See exactly how the line art, color palette, and badges integrate across your daily workflow.
        </p>

        {/* Month selector */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {SEASONAL_THEMES.map((t, i) => (
            <button
              key={t.slug}
              onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                i === activeIdx
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-muted/50 text-muted-foreground border border-transparent hover:border-border/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${t.palette.primary})` }} />
              <span className="hidden sm:inline">{t.name}</span>
              <span className="sm:hidden">{t.emoji}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Switch checked={themeEnabled} onCheckedChange={setThemeEnabled} />
          <span className="text-xs text-muted-foreground">
            {themeEnabled ? `${theme.emoji} ${theme.name} active` : 'Monochrome base (no theme)'}
          </span>
        </div>

        {/* ═══════════════════════════════════════════
            1. DASHBOARD — Command Center
        ═══════════════════════════════════════════ */}
        <SectionLabel>Dashboard — Command Center</SectionLabel>

        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {/* Gradient accent bar */}
          {themeEnabled && (
            <div className="h-1.5" style={{ background: gradientSolid(theme) }} />
          )}

          {/* Illustrated banner strip — full cute art visible */}
          {themeEnabled && (
            <div
              className="py-2 px-4 flex items-end justify-center"
              style={{
                background: `linear-gradient(180deg, hsl(${theme.palette.gradientFrom} / 0.04), transparent)`,
              }}
            >
              <img
                src={theme.art}
                alt=""
                className="h-16 w-auto max-w-full object-contain"
                style={{ opacity: 0.85 }}
              />
            </div>
          )}

          {/* Dashboard header — clean text, no art behind */}
          <div
            className="px-6 py-4 transition-all duration-500"
            style={{
              borderBottom: `1px solid ${themeEnabled ? border(theme) : 'hsl(var(--border))'}`,
            }}
          >
            <Callout position="top-right">← Illustrated strip above + clean header</Callout>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-0.5">
                  Good morning
                </p>
                <h2 className="text-lg font-semibold text-foreground">Your Command Center</h2>
                {themeEnabled && (
                  <p className="text-[10px] mt-1" style={{ color: bannerText(theme) }}>
                    {theme.emoji} {theme.name} — {theme.tagline}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {themeEnabled && (
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: accentBg(theme), color: bannerText(theme) }}
                  >
                    {theme.badgeEmoji} {theme.badgeLabel}
                  </span>
                )}
                <div className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                  Today
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard body */}
          <div className="p-6 grid grid-cols-3 gap-4">
            {/* One Thing focus */}
            <div
              className="col-span-2 rounded-lg border p-5 relative overflow-hidden transition-all duration-500"
              style={{
                borderColor: themeEnabled ? border(theme) : 'hsl(var(--border))',
                background: themeEnabled ? gradientBg(theme) : undefined,
              }}
            >
              <Callout position="top-left">← Themed gradient + accent color</Callout>
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
                Your One Thing Today
              </p>
              <p className="text-sm font-medium text-foreground mb-3">
                Finish the sales page copy for Q2 launch
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: '65%',
                      background: themeEnabled ? gradientSolid(theme) : 'hsl(var(--primary))',
                      opacity: themeEnabled ? 0.7 : 1,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">65%</span>
              </div>
            </div>

            {/* 90-Day ring */}
            <div
              className="rounded-lg border p-4 text-center relative transition-all duration-500"
              style={{
                borderColor: themeEnabled ? border(theme) : 'hsl(var(--border))',
              }}
            >
              <Callout position="top-right">← Themed ring color</Callout>
              <div className="w-16 h-16 mx-auto mb-2 rounded-full flex items-center justify-center relative">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={themeEnabled ? accent(theme) : 'hsl(var(--primary))'}
                    strokeWidth="2"
                    strokeDasharray="47 53"
                    strokeLinecap="round"
                    opacity={themeEnabled ? 0.7 : 1}
                  />
                </svg>
                <span className="absolute text-sm font-semibold text-foreground">47%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">90-Day Progress</p>
            </div>

            {/* Stat cards row */}
            {[
              { label: 'Tasks', value: '12', icon: Check },
              { label: 'Streak', value: '7d', icon: Flame },
              { label: 'Revenue', value: '$4.2k', icon: TrendingUp },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-lg border p-3 relative overflow-hidden transition-all duration-500"
                  style={{
                    borderColor: themeEnabled ? border(theme) : 'hsl(var(--border))',
                    background: themeEnabled ? gradientBg(theme) : undefined,
                  }}
                >
                  {themeEnabled && (
                    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: accent(theme), opacity: 0.3 }} />
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: themeEnabled ? accentBg(theme) : 'hsl(var(--muted))' }}>
                      <Icon className="w-2.5 h-2.5" style={{ color: themeEnabled ? accent(theme) : 'hsl(var(--muted-foreground))' }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{card.label}</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground mt-1">{card.value}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            2. DAILY PLAN
        ═══════════════════════════════════════════ */}
        <SectionLabel>Daily Plan</SectionLabel>

        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {/* Gradient accent bar */}
          {themeEnabled && (
            <div className="h-1.5" style={{ background: gradientSolid(theme) }} />
          )}

          {/* Illustrated strip — full cute art */}
          {themeEnabled && (
            <div
              className="py-1.5 px-4 flex items-end justify-center"
              style={{
                background: `linear-gradient(180deg, hsl(${theme.palette.gradientFrom} / 0.04), transparent)`,
              }}
            >
              <img src={theme.art} alt="" className="h-12 w-auto max-w-full object-contain" style={{ opacity: 0.85 }} />
            </div>
          )}

          {/* Daily Plan header — clean */}
          <div
            className="px-6 py-3 transition-all duration-500"
            style={{
              borderBottom: `1px solid ${themeEnabled ? border(theme) : 'hsl(var(--border))'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sun className="w-4 h-4" style={{ color: themeEnabled ? accent(theme) : 'hsl(var(--muted-foreground))' }} />
                <div>
                  <p className="text-sm font-medium text-foreground">Saturday, March 8</p>
                  <p className="text-[10px] text-muted-foreground">Day 42 of 90 · 3 tasks planned</p>
                </div>
              </div>
              {themeEnabled && (
                <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: accentBg(theme), color: bannerText(theme) }}>
                  {theme.emoji} {theme.name}
                </span>
              )}
            </div>
          </div>

          <div className="p-6 grid grid-cols-5 gap-4">
            {/* Left: Morning zone */}
            <div className="col-span-3 space-y-3">
              {/* Priorities card */}
              <div
                className="rounded-lg border p-4 relative transition-all duration-500"
                style={{
                  borderColor: themeEnabled ? border(theme) : 'hsl(var(--border))',
                }}
              >
                <Callout position="top-left">← Accent colored priorities</Callout>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Target className="w-3 h-3" style={{ color: themeEnabled ? accent(theme) : 'hsl(var(--muted-foreground))' }} />
                  Top 3 Priorities
                </p>
                {['Finish sales page copy', 'Review ad performance', 'Record video lesson'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1.5">
                    <div
                      className="w-5 h-5 rounded border flex items-center justify-center text-[10px] font-medium shrink-0"
                      style={{
                        borderColor: themeEnabled ? border(theme) : 'hsl(var(--border))',
                        color: themeEnabled ? accent(theme) : 'hsl(var(--muted-foreground))',
                        backgroundColor: i === 0 ? (themeEnabled ? accentBg(theme) : 'hsl(var(--muted))') : 'transparent',
                      }}
                    >
                      {i + 1}
                    </div>
                    <span className="text-xs text-foreground">{item}</span>
                  </div>
                ))}
              </div>

              {/* Hourly agenda */}
              <div className="rounded-lg border p-4" style={{ borderColor: themeEnabled ? border(theme) : 'hsl(var(--border))' }}>
                <Callout position="top-right">← Time indicator uses theme color</Callout>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Hourly Agenda
                </p>
                {[
                  { time: '9:00', task: 'Deep work: Sales page', active: true },
                  { time: '10:00', task: 'Team standup', active: false },
                  { time: '11:00', task: 'Record video lesson', active: false },
                  { time: '12:00', task: 'Lunch break', active: false },
                ].map((slot, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
                  >
                    <span className="text-[10px] text-muted-foreground w-10 shrink-0">{slot.time}</span>
                    {slot.active && (
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeEnabled ? accent(theme) : 'hsl(var(--primary))' }} />
                    )}
                    <span className={`text-xs ${slot.active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {slot.task}
                    </span>
                    {slot.active && (
                      <GripVertical className="w-3 h-3 text-muted-foreground/40 ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Sidebar widgets */}
            <div className="col-span-2 space-y-3">
              {/* Habit tracker */}
              <div
                className="rounded-lg border p-4 transition-all duration-500"
                style={{ borderColor: themeEnabled ? border(theme) : 'hsl(var(--border))' }}
              >
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" style={{ color: themeEnabled ? accent(theme) : 'hsl(var(--muted-foreground))' }} />
                  Daily Habits
                </p>
                {['Morning routine', 'Exercise', 'Journal', 'Read 20 min'].map((habit, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <div
                      className="w-4 h-4 rounded border flex items-center justify-center"
                      style={{
                        borderColor: themeEnabled ? border(theme) : 'hsl(var(--border))',
                        backgroundColor: i < 2 ? (themeEnabled ? accentBg(theme) : 'hsl(var(--muted))') : 'transparent',
                      }}
                    >
                      {i < 2 && <Check className="w-2.5 h-2.5" style={{ color: themeEnabled ? accent(theme) : 'hsl(var(--muted-foreground))' }} />}
                    </div>
                    <span className={`text-[11px] ${i < 2 ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{habit}</span>
                  </div>
                ))}
              </div>

              {/* Streak + badge */}
              <div
                className="rounded-lg border p-4 text-center relative overflow-hidden transition-all duration-500"
                style={{
                  borderColor: themeEnabled ? border(theme) : 'hsl(var(--border))',
                  background: themeEnabled ? gradientBg(theme) : undefined,
                }}
              >
                <Callout position="top-right">← Themed streak card</Callout>
                <Flame className="w-5 h-5 mx-auto mb-1" style={{ color: themeEnabled ? accent(theme) : 'hsl(var(--muted-foreground))' }} />
                <p className="text-lg font-semibold text-foreground">7 days</p>
                <p className="text-[10px] text-muted-foreground">Current streak</p>
                {themeEnabled && (
                  <div className="mt-2 flex items-center justify-center gap-1.5 px-2 py-1 rounded-full mx-auto w-fit" style={{ backgroundColor: accentBg(theme) }}>
                    <span className="text-xs">{theme.badgeEmoji}</span>
                    <span className="text-[9px] font-medium" style={{ color: bannerText(theme) }}>{theme.badgeLabel}</span>
                  </div>
                )}
              </div>

              {/* Evening zone preview */}
              <div className="rounded-lg border p-4" style={{ borderColor: themeEnabled ? border(theme) : 'hsl(var(--border))' }}>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Moon className="w-3 h-3" />
                  Evening Reflection
                </p>
                <p className="text-[11px] text-muted-foreground italic">
                  "What went well today?"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            3. WEEKLY PLANNER
        ═══════════════════════════════════════════ */}
        <SectionLabel>Weekly Planner</SectionLabel>

        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {/* Gradient accent bar */}
          {themeEnabled && (
            <div className="h-1.5" style={{ background: gradientSolid(theme) }} />
          )}

          {/* Illustrated strip */}
          {themeEnabled && (
            <div
              className="h-10 overflow-hidden flex items-end justify-center"
              style={{
                background: `linear-gradient(180deg, hsl(${theme.palette.gradientFrom} / 0.06), hsl(${theme.palette.gradientTo} / 0.02))`,
              }}
            >
              <img src={theme.art} alt="" className="h-full w-full object-cover object-bottom" />
            </div>
          )}

          {/* Week header — clean */}
          <div
            className="px-6 py-3 transition-all duration-500"
            style={{
              borderBottom: `1px solid ${themeEnabled ? border(theme) : 'hsl(var(--border))'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Week of March 3 – 9, 2026</p>
                <p className="text-[10px] text-muted-foreground">Week 10 · 18 tasks planned</p>
              </div>
              <div className="flex items-center gap-3">
                {themeEnabled && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: accentBg(theme), color: bannerText(theme) }}>
                    {theme.emoji} {theme.name}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">12/18 done</span>
                </div>
              </div>
            </div>
          </div>

          {/* Week grid */}
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, di) => {
                const isToday = di === 5; // Saturday
                const isWeekend = di >= 5;
                return (
                  <div key={day} className="min-h-[140px]">
                    {/* Day header */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`text-[10px] font-medium ${isToday ? '' : 'text-muted-foreground'}`}
                        style={isToday && themeEnabled ? { color: accent(theme) } : undefined}
                      >
                        {day}
                      </span>
                      <span
                        className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center ${
                          isToday ? 'text-primary-foreground font-medium' : 'text-muted-foreground'
                        }`}
                        style={isToday ? {
                          background: themeEnabled ? gradientSolid(theme) : 'hsl(var(--primary))',
                          opacity: themeEnabled ? 0.8 : 1,
                        } : undefined}
                      >
                        {3 + di}
                      </span>
                    </div>

                    {/* Tasks */}
                    <div className={`space-y-1 ${isWeekend ? 'opacity-60' : ''}`}>
                      {di < 5 && [0, 1, 2].slice(0, di === 0 ? 3 : di === 4 ? 1 : 2).map((_, ti) => (
                        <div
                          key={ti}
                          className="rounded px-2 py-1.5 text-[9px] border transition-all duration-500"
                          style={{
                            borderColor: themeEnabled ? border(theme) : 'hsl(var(--border))',
                            backgroundColor: ti === 0 && themeEnabled ? accentBg(theme) : undefined,
                            borderLeftWidth: '3px',
                            borderLeftColor: ti === 0 && themeEnabled ? accent(theme) : 'hsl(var(--border))',
                          }}
                        >
                          <span className="text-foreground line-clamp-1">
                            {['Sales page', 'Video', 'Ads review', 'Email draft'][ti % 4]}
                          </span>
                        </div>
                      ))}
                      {di >= 5 && (
                        <div className="rounded px-2 py-1.5 text-[9px] border border-dashed border-border/50 text-muted-foreground">
                          Rest day
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Weekly summary bar */}
            <div
              className="mt-4 rounded-lg p-3 flex items-center justify-between transition-all duration-500"
              style={{
                background: themeEnabled ? gradientBg(theme) : 'hsl(var(--muted) / 0.3)',
                border: `1px solid ${themeEnabled ? border(theme) : 'hsl(var(--border))'}`,
              }}
            >
              <Callout position="top-left">← Themed summary bar</Callout>
              <div className="flex items-center gap-4">
                {[
                  { label: 'Planned', val: '18' },
                  { label: 'Done', val: '12' },
                  { label: 'Content', val: '4' },
                  { label: 'Meetings', val: '2' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-sm font-semibold text-foreground">{s.val}</p>
                    <p className="text-[9px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: '67%',
                      background: themeEnabled ? gradientSolid(theme) : 'hsl(var(--primary))',
                      opacity: themeEnabled ? 0.7 : 1,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">67%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 rounded-lg border border-border p-5">
          <p className="text-xs font-medium text-foreground mb-3">Where seasonal graphics appear:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            {[
              '🖼️ Line art watermark in page headers (Dashboard, Daily, Weekly)',
              '🎨 Accent colors on stat cards, progress bars, and priority numbers',
              '📊 Gradient backgrounds on focus cards and summary bars',
              '🏷️ Theme name badge in headers',
              '🏆 Earned badge displayed in streak/sidebar cards',
              '🔲 Themed card borders (subtle 2px top accent)',
              '⭕ Today indicator uses theme gradient',
              '📋 Left-border color on weekly task cards',
            ].map(item => (
              <div key={item} className="flex items-start gap-1.5">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
