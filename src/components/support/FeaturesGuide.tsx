import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Search, Target, Calendar, CheckSquare, RefreshCw, ClipboardList, 
  BarChart3, Brain, Lightbulb, Zap, Clock, LayoutList, Columns,
  Trophy, Repeat, FileText, Sparkles, Smartphone, CalendarRange, Layers, ArrowUpDown,
  Key
} from 'lucide-react';

interface FeatureSection {
  id: string;
  title: string;
  icon: React.ElementType;
  category: string;
  description: string;
  details: string[];
  tips?: string[];
}

const featuresData: FeatureSection[] = [
  // Core Planning
  {
    id: '90-day-cycle',
    category: 'Core Planning',
    title: '90-Day Cycles',
    icon: Target,
    description: 'The foundation of your planning system. A 90-day cycle is long enough to achieve meaningful progress, but short enough to stay focused and adapt.',
    details: [
      'Set one clear, compelling goal for the entire 90 days',
      'Define your "why" – the deeper motivation that keeps you going',
      'Choose an identity statement – who you need to become to achieve this goal',
      'Select a target feeling – how you want to feel during this journey',
      'Your cycle breaks down into weeks (13 weeks) and days for actionable planning'
    ],
    tips: [
      'Make your goal specific and measurable where possible',
      'Your identity statement should start with "I am..." or "I am becoming..."',
      'Review your cycle goal during weekly planning to stay aligned'
    ]
  },
  {
    id: 'business-diagnostic',
    category: 'Core Planning',
    title: 'Business Diagnostic (DISCOVER → NURTURE → CONVERT)',
    icon: BarChart3,
    description: 'Rate your business in three key areas to identify where to focus your 90-day efforts. Your lowest score becomes your priority.',
    details: [
      'DISCOVER: Do enough people know you exist? (traffic, visibility, audience growth)',
      'NURTURE: Are you building trust effectively? (free content, email list, engagement)',
      'CONVERT: Are you making enough offers? (sales calls, pitches, closing deals)',
      'Rate each area 1-10 honestly – the lowest score reveals your bottleneck',
      'Your focus area guides which activities to prioritize this quarter'
    ],
    tips: [
      'Be brutally honest – inflated scores lead to misguided focus',
      'If all scores are similar, choose based on where effort will have the biggest impact',
      'Re-evaluate at the start of each new cycle'
    ]
  },
  {
    id: 'success-metrics',
    category: 'Core Planning',
    title: 'Success Metrics',
    icon: BarChart3,
    description: 'Track 3 key numbers weekly that indicate progress toward your goal. These become your "scoreboard" for the cycle.',
    details: [
      'Choose metrics aligned with your focus area (DISCOVER/NURTURE/CONVERT)',
      'Set starting values to measure progress over time',
      'Update these weekly during your Weekly Review',
      'See trends visualized on the Progress page'
    ],
    tips: [
      'Focus on leading indicators (actions you control) not just lagging indicators (results)',
      'Examples: emails sent, content published, calls made, offers extended',
      'Consistency in tracking matters more than perfection'
    ]
  },
  {
    id: 'weekly-planning',
    category: 'Core Planning',
    title: 'Weekly Planning',
    icon: Calendar,
    description: 'Each week, set your top 3 priorities that will move you closest to your 90-day goal.',
    details: [
      'Pick 3-5 priorities that, if completed, make this week a success',
      'These should connect directly to your cycle goal',
      'Check in with your mindset – note your current thoughts and feelings',
      'Set weekly targets for your success metrics',
      'Select priorities from your weekly plan to focus on each day'
    ],
    tips: [
      'Avoid filling this with routine tasks – focus on needle-moving work',
      'Ask: "What must happen this week for me to feel successful?"',
      'Review and adjust mid-week if needed'
    ]
  },
  {
    id: 'daily-planning',
    category: 'Core Planning',
    title: 'Daily Planning',
    icon: CheckSquare,
    description: 'Start each day by choosing your Top 3 priorities and setting your intention.',
    details: [
      'Pick your Top 3 tasks for the day from weekly priorities or new items',
      'Check in with how you\'re feeling to build self-awareness',
      'Use the Scratch Pad for brain dumps and quick captures',
      'Note your "One Thing" – the single most important task if you could only do one',
      'Customize which sections appear and their order via Settings → Daily Page Layout'
    ],
    tips: [
      'Spend 5-10 minutes on this each morning',
      'Front-load your most important work when energy is highest',
      'The Scratch Pad gets processed at the end of the day',
      'Use Daily Page settings to hide sections you don\'t use regularly'
    ]
  },
  {
    id: 'daily-page-customization',
    category: 'Core Planning',
    title: 'Daily Page Customization',
    icon: LayoutList,
    description: 'Personalize your Daily Planning page by showing/hiding sections, reordering them, and adding custom check-in questions.',
    details: [
      'Access via Settings → Daily Page Layout or the gear icon on your Daily Plan page',
      'Toggle visibility for 18+ sections to streamline your planning workflow',
      'Drag-and-drop (or use arrows on mobile) to reorder sections to your preference',
      'Add custom check-in questions: checkbox, text, number, rating, time, or dropdown types',
      'Apply pre-built templates: Minimalist, Entrepreneur, Creator, Wellness, or Student',
      'Preview your layout before saving to see exactly how it will look'
    ],
    tips: [
      'Start with a template that matches your work style, then customize from there',
      'Hide sections you rarely use to reduce cognitive load',
      'Custom questions are great for tracking mood, energy, specific habits, or daily ratings',
      'Your custom question responses are saved with each day\'s plan for later review'
    ]
  },

  // Task Management
  {
    id: 'task-manager',
    category: 'Task Management',
    title: 'Task Manager Overview',
    icon: LayoutList,
    description: 'Your workflow command center for managing all tasks, with multiple views and smart filtering.',
    details: [
      'Three views: List (grouped by date), Kanban (drag-and-drop columns), Timeline (calendar-based)',
      'List view supports flexible grouping: by Date, Priority, Project, or Energy Level',
      'Sort tasks by Due Date, Priority, Created Date, or Name (ascending/descending)',
      'Timeline has sub-views: Day, 3-Day, Week views',
      'Filter tasks by energy level (High Focus, Medium, Low) and context tags',
      'Capacity Indicator shows how much of your 8-hour workday is scheduled',
      'Tasks integrate with Google Calendar for time blocking'
    ],
    tips: [
      'Use List view for quick task management, Kanban for workflow visualization',
      'Group by Project to see all tasks for a specific project in one place',
      'Timeline view is great for time blocking and seeing your day at a glance'
    ]
  },
  {
    id: 'quick-add',
    category: 'Task Management',
    title: 'Quick Add (Natural Language)',
    icon: Zap,
    description: 'Add tasks instantly using natural language shortcuts. Press Cmd/Ctrl + K to focus the Quick Add input from anywhere on the Tasks page.',
    details: [
      'Type "today" or "tomorrow" to automatically set the scheduled date',
      'Use #tag to add context tags (e.g., #calls, #deep-work, #admin)',
      'Add !high, !med, or !low to set priority level',
      'Include time durations like "30m", "1h", or "2h" to set estimated time',
      'The parser shows a live preview of what will be created'
    ],
    tips: [
      'Example: "Call client about proposal tomorrow #calls !high 30m"',
      'Tags help with filtering – create a consistent tagging system',
      'Duration estimates improve your capacity planning accuracy'
    ]
  },
  {
    id: 'capacity-indicator',
    category: 'Task Management',
    title: 'Capacity Indicator',
    icon: Clock,
    description: 'Visual indicator showing how much of your daily work capacity is scheduled, helping prevent overcommitment.',
    details: [
      'Default capacity is 8 hours (480 minutes) of productive work time',
      'Green = plenty of time available',
      'Yellow = approaching capacity (80%+ filled)',
      'Red = over capacity – consider rescheduling some tasks',
      'Shows both planned time and completed time for the day'
    ],
    tips: [
      'Add duration estimates to all tasks for accurate capacity tracking',
      'Leave buffer room – don\'t schedule to 100% capacity',
      'If consistently over capacity, reassess your task scoping'
    ]
  },
  {
    id: 'recurring-tasks',
    category: 'Task Management',
    title: 'Recurring Tasks',
    icon: RefreshCw,
    description: 'Set tasks to repeat automatically on a schedule. Great for regular routines and weekly activities.',
    details: [
      'Daily: Task appears every day',
      'Weekly: Choose specific days (e.g., Monday, Wednesday, Friday)',
      'Monthly: Choose a specific day of the month (e.g., 1st, 15th)',
      'Recurring "parent" tasks generate individual instances you can complete',
      'Edit the parent to change all future occurrences'
    ],
    tips: [
      'Use for weekly reviews, regular client check-ins, content publishing schedules',
      'You can delete single instances, future instances, or the entire series',
      'Recurring tasks appear in a collapsed section on the Tasks page'
    ]
  },
  {
    id: 'sops',
    category: 'Task Management',
    title: 'SOPs (Standard Operating Procedures)',
    icon: ClipboardList,
    description: 'Create reusable checklists and procedures that can be attached to tasks. Perfect for ensuring consistency in repeated processes.',
    details: [
      'SOPs contain: a name, description, checklist items, useful links, and notes',
      'Checklist items appear as interactive checkboxes when attached to a task',
      'Useful links provide quick access to resources needed for the procedure',
      'Notes contain additional context, tips, or reminders',
      'Track how many times each SOP has been used'
    ],
    tips: [
      'Create SOPs for any process you do more than twice',
      'Examples: client onboarding, content publishing, weekly review routine',
      'Keep checklists focused – break large procedures into multiple SOPs if needed'
    ]
  },
  {
    id: 'sop-task-integration',
    category: 'Task Management',
    title: 'Attaching SOPs to Tasks',
    icon: FileText,
    description: 'When you attach an SOP to a task, the checklist becomes interactive and progress is tracked automatically.',
    details: [
      'When creating a task, select an SOP from the dropdown to attach it',
      'The SOP\'s checklist, links, and notes populate the task description',
      'Check off items directly within the task – progress is saved',
      'See checklist completion stats (e.g., "3/5 completed") on the task card',
      'Detach an SOP from a task if you no longer need it',
      'Each time you complete a task with an SOP, the "times used" counter increments'
    ],
    tips: [
      'Great for complex tasks that need consistent execution',
      'Use for onboarding new team members – attach SOPs to their tasks',
      'Review and update SOPs periodically to keep them current'
    ]
  },
  {
    id: 'task-views',
    category: 'Task Management',
    title: 'Task Views Explained',
    icon: Columns,
    description: 'Choose the view that matches how you like to work. Each view offers different benefits.',
    details: [
      'List View: Traditional list grouped by Overdue, Today, Tomorrow, This Week, Later, Unscheduled',
      'Kanban View: Columns for Today\'s Focus, Scheduled, Backlog, Waiting On, Someday',
      'Timeline Day: Hour-by-hour view of one day with time blocks',
      'Timeline 3-Day: See today and the next two days at once',
      'Timeline Week: Full week overview for planning ahead',
      'Timeline Month: High-level view of the entire month'
    ],
    tips: [
      'Kanban is great for managing workflow states',
      'Use Timeline views for time blocking and scheduling',
      'The "Waiting On" column is perfect for delegated tasks'
    ]
  },

  // Reviews & Reflection
  {
    id: 'daily-review',
    category: 'Reviews & Reflection',
    title: 'Daily Review',
    icon: Sparkles,
    description: 'End each day with a quick reflection on what worked, what didn\'t, and your wins.',
    details: [
      'Capture your wins – even small ones count!',
      'Note what worked well so you can repeat it',
      'Identify what didn\'t work so you can adjust',
      'Add custom reflection questions if desired',
      'Builds self-awareness and momentum over time'
    ],
    tips: [
      'Spend just 5 minutes on this before ending your workday',
      'Writing wins builds confidence and motivation',
      'Consistency matters more than depth'
    ]
  },
  {
    id: 'weekly-review',
    category: 'Reviews & Reflection',
    title: 'Weekly Review',
    icon: Calendar,
    description: 'Each week, reflect on your progress, update your metrics, and set up the next week.',
    details: [
      'Update your success metric actuals for the week',
      'Record your wins and challenges',
      'Note what adjustments you want to make',
      'See your habit completion summary for the week',
      'Optionally share highlights to the Community Celebration Wall'
    ],
    tips: [
      'Schedule a recurring time slot for your weekly review',
      'Review your 90-day goal to stay aligned',
      'Use challenges as learning opportunities, not failures'
    ]
  },
  {
    id: 'monthly-review',
    category: 'Reviews & Reflection',
    title: 'Monthly Review',
    icon: Calendar,
    description: 'Zoom out to see patterns and trends over the past month.',
    details: [
      'Review habit trends – which habits are sticking?',
      'Identify thought patterns from your reflections',
      'Celebrate monthly wins',
      'Make strategic adjustments for next month',
      'Great checkpoint for cycle progress'
    ],
    tips: [
      'Monthly reviews are about patterns, not daily details',
      'Ask: "Am I on track for my 90-day goal? What needs to change?"',
      'Schedule this at the end of each month'
    ]
  },

  // Habits & Mindset
  {
    id: 'habits',
    category: 'Habits & Mindset',
    title: 'Habit Tracking',
    icon: Repeat,
    description: 'Build consistent behaviors that support your 90-day identity. Track completion daily.',
    details: [
      'Create habits with names, descriptions, and success definitions',
      'Organize habits into categories (optional)',
      'Check off habits daily – see your streaks build',
      'Habit status appears on the Dashboard (green/yellow/grey)',
      'Archive habits you\'re no longer tracking'
    ],
    tips: [
      'Start with 3-5 key habits – don\'t overwhelm yourself',
      'Define clear success criteria for each habit',
      'Habits should support your cycle identity statement'
    ]
  },
  {
    id: 'useful-thoughts',
    category: 'Habits & Mindset',
    title: 'Useful Thoughts',
    icon: Brain,
    description: 'Capture and organize thoughts, affirmations, and mindset reframes that serve you.',
    details: [
      'Save thoughts that shift your perspective in a positive way',
      'Organize thoughts into categories',
      'Mark favorites for quick access',
      'Browse your library during planning or when you need a boost',
      'Use the modal in Weekly/Daily Plan to insert a useful thought'
    ],
    tips: [
      'Add thoughts from books, mentors, or your own realizations',
      'Review favorites when facing challenges',
      'Quality over quantity – curate what truly resonates'
    ]
  },
  {
    id: 'identity-anchors',
    category: 'Habits & Mindset',
    title: 'Identity Anchors',
    icon: Target,
    description: 'Define the identity you\'re embodying with supporting actions and habits.',
    details: [
      'Create an identity statement (e.g., "I am a disciplined entrepreneur")',
      'Add supporting actions that reinforce this identity',
      'Link to supporting habits',
      'See your identity anchor during daily planning for motivation',
      'Update as you evolve throughout your cycle'
    ],
    tips: [
      'Write identity statements in present tense',
      'Choose actions that prove the identity to yourself daily',
      'Review and refine as you learn what works'
    ]
  },

  // Other Features
  {
    id: 'ideas',
    category: 'Other Features',
    title: 'Ideas Capture',
    icon: Lightbulb,
    description: 'Capture ideas and inspirations without cluttering your task list.',
    details: [
      'Quickly capture ideas as they come to you',
      'Organize ideas into categories',
      'Review and process ideas during weekly planning',
      'Convert ideas to tasks when you\'re ready to act'
    ],
    tips: [
      'Don\'t judge ideas when capturing – just save them',
      'Review your ideas list during weekly planning',
      'Move actionable ideas to tasks when the time is right'
    ]
  },
  {
    id: 'pet-mode',
    category: 'Other Features',
    title: 'Pet Mode (Daily Tasks & Rewards)',
    icon: Trophy,
    description: 'Make task completion fun! Complete 3 daily tasks to grow a virtual pet from egg to adult.',
    details: [
      'Access Pet Mode from the ✨ button in the header or via /arcade',
      'Choose from 10 different pets: Unicorn, Dragon, Cat, Dog, Bunny, Fox, Panda, Penguin, Owl, or Hamster',
      'Enter 3 tasks or select from your existing task list',
      'Complete each task to evolve your pet: Egg → Baby → Teen → Adult',
      'Use the optional Pomodoro timer (5/10/15/25/45 min) for focused work sessions',
      'When the timer ends, a sound plays and you\'re asked if you completed the task',
      'Hatch multiple pets in a day by clicking "Start Fresh" after completing all 3 tasks',
      'Track your collection and progress in the Progress tab'
    ],
    tips: [
      'Great for building a consistent daily habit of completing your top priorities',
      'Use the timer for tasks that need deep focus',
      'Reflect on "what went well" after each task to build self-awareness',
      'Try to hatch at least one pet every day to build momentum'
    ]
  },
  {
    id: 'notes',
    category: 'Other Features',
    title: 'Notes & Journal',
    icon: FileText,
    description: 'Keep longer-form notes, journal entries, and documentation.',
    details: [
      'Create pages for notes, meeting notes, or journal entries',
      'Add tags to organize and find notes later',
      'Archive old notes to keep things tidy',
      'Great for capturing insights from books, courses, or coaching'
    ],
    tips: [
      'Use for content that doesn\'t fit in plans or reviews',
      'Review notes during monthly reviews for insights',
      'Link back to notes in your task descriptions if relevant'
    ]
  },
  {
    id: 'mobile-app',
    category: 'Other Features',
    title: 'Mobile App (Install to Home Screen)',
    icon: Smartphone,
    description: 'Install Boss Planner as an app on your phone for the best mobile experience with touch-optimized features.',
    details: [
      'Install from your browser - no app store download required',
      'Works on iPhone (via Safari), Android (via Chrome), and Desktop',
      'Optimized touch targets (44px minimum) for easy one-handed use',
      'Tap-to-schedule: quickly assign times to tasks without dragging',
      'Swipeable day navigation in the weekly planner',
      'Auto-scrolls to current time in agenda view',
      'Full offline support - capture ideas anywhere',
      'Fast loading with cached assets'
    ],
    tips: [
      'On iPhone, you MUST use Safari - Chrome does not support installation on iOS',
      'Look for "Add to Home Screen" in your browser\'s share or menu options',
      'The app updates automatically when you\'re online',
      'Use the mobile bottom navigation bar for quick access to all sections'
    ]
  },
  {
    id: 'editorial-calendar',
    category: 'Other Features',
    title: 'Editorial Calendar',
    icon: CalendarRange,
    description: 'Plan and visualize your content publishing schedule across all platforms.',
    details: [
      'Week-by-week calendar view with Create and Publish lanes',
      'Drag-and-drop content items between days',
      'Add graphics URLs and copy/caption text to each content item',
      'Link content to marketing campaigns for organized launches',
      'Filter by platform, content type, or campaign',
      'Unscheduled pool for content ideas not yet assigned to dates',
      'Campaign layers show active promotional periods as colored bars'
    ],
    tips: [
      'Use the Create lane for content creation dates, Publish lane for go-live dates',
      'Attach graphics URLs to keep visual assets organized with your content',
      'Add copy/captions directly in the content drawer for easy reference',
      'Link content to campaigns for coordinated launch planning'
    ]
  },
  {
    id: 'task-sorting-grouping',
    category: 'Task Management',
    title: 'Task Sorting & Grouping',
    icon: Layers,
    description: 'Organize your task list view by grouping and sorting options to find what you need quickly.',
    details: [
      'Group by Due Date: Overdue, Today, Tomorrow, This Week, Later, No Date',
      'Group by Priority: High, Medium, Low, No Priority',
      'Group by Project: See tasks organized by their assigned project',
      'Group by Energy Level: High Focus, Medium, Low Energy',
      'Sort within groups by Due Date, Priority, Created Date, or Name',
      'Toggle ascending/descending sort order'
    ],
    tips: [
      'Group by Project when focusing on a specific initiative',
      'Group by Energy Level to batch similar-effort tasks together',
      'Use Priority sorting to always see your most important tasks first'
    ]
  },
  // AI Copywriting
  {
    id: 'ai-copywriting',
    category: 'AI Copywriting',
    title: 'AI Copywriting Overview',
    icon: Sparkles,
    description: 'Generate high-converting emails, social posts, and sales copy that sounds exactly like you—not like generic AI.',
    details: [
      'Complete the Brand Wizard to teach AI your unique voice (analyze writing samples)',
      'Generate strategic 5-email welcome sequences with proven structure',
      'Multi-pass generation: Draft → Critique → Refine for quality output',
      'AI Detection scoring ensures human-sounding output (Excellent to High Risk badges)',
      'Rate every generation to help AI learn your preferences over time',
      'Save content to your Vault or add directly to the Editorial Calendar'
    ],
    tips: [
      'Provide 2-3 writing samples of at least 50 characters each for best results',
      'More diverse samples = better voice matching',
      'Rate every generation to help AI learn what you like',
      'Use specific context for each generation to get more relevant copy'
    ]
  },
  {
    id: 'ai-copywriting-api',
    category: 'AI Copywriting',
    title: 'API Key Setup & Costs',
    icon: Key,
    description: 'Connect your own OpenAI API key to power AI copywriting. You pay OpenAI directly—typically $2-10/month based on usage.',
    details: [
      'Create account at platform.openai.com (free to sign up)',
      'Add payment method in Billing (required for API access)',
      'Set a spending limit: Usage → Limits → $10-20 recommended',
      'Generate API key: Settings → API Keys → Create new secret key',
      'Key starts with "sk-" – copy immediately, it won\'t show again!',
      'Paste key in AI Copywriting → Settings'
    ],
    tips: [
      'Each email generation costs ~$0.02-0.08',
      'Heavy users (50+ generations/month) might spend $5-15',
      'Much cheaper than ChatGPT Plus ($20/month fixed)',
      'Set a budget cap in OpenAI to avoid surprise charges'
    ]
  }
];

const categories = ['All', 'Core Planning', 'Task Management', 'Reviews & Reflection', 'Habits & Mindset', 'Other Features', 'AI Copywriting', 'Content'];

export function FeaturesGuide() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredFeatures = featuresData.filter(feature => {
    const matchesSearch = searchQuery === '' || 
      feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.details.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || feature.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const groupedFeatures = filteredFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureSection[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Features Guide</CardTitle>
          <CardDescription>
            Learn how to use every feature in your 90-Day Planner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Accordion */}
      {filteredFeatures.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              No features found matching your search. Try different keywords or browse all categories.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedFeatures).map(([category, features]) => (
          <Card key={category} className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-primary">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <AccordionItem key={feature.id} value={feature.id} className="border-border">
                      <AccordionTrigger className="text-left hover:no-underline hover:text-primary">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                          <span>{feature.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <p className="text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-foreground">How it works:</h4>
                          <ul className="space-y-1.5">
                            {feature.details.map((detail, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="text-primary mt-1">•</span>
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {feature.tips && feature.tips.length > 0 && (
                          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                            <h4 className="text-sm font-semibold text-primary flex items-center gap-1">
                              <Lightbulb className="h-3 w-3" />
                              Tips
                            </h4>
                            <ul className="space-y-1">
                              {feature.tips.map((tip, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground">
                                  → {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
