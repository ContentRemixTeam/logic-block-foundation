import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // Getting Started
  {
    category: 'Getting Started',
    question: 'How do I set up my first 90-day cycle?',
    answer: 'Head to the Cycle Setup page from the sidebar. There, you\'ll define your main goal for the next 90 days, your "why" (what makes this goal meaningful), and the identity you want to embody. Think of it as setting your north star—everything else flows from here.'
  },
  {
    category: 'Getting Started',
    question: 'What is the Business Diagnostic and how does it work?',
    answer: 'The Business Diagnostic helps you identify where to focus this quarter. Rate yourself 1-10 on three areas: DISCOVER (visibility/traffic), NURTURE (building trust/content), and CONVERT (making offers/sales). Your lowest score becomes your focus area for the 90 days. This prevents spreading yourself too thin and ensures you address your biggest bottleneck first.'
  },
  {
    category: 'Getting Started',
    question: 'What are the 3 key metrics and how do I choose them?',
    answer: 'Your 3 key metrics are the numbers that best represent progress toward your goal. Choose metrics that are: 1) Measurable (you can track them objectively), 2) Meaningful (they actually matter for your goal), and 3) Within your control (actions you take, not outcomes you hope for). For example, if your goal is to grow your business, metrics might be: calls made, proposals sent, and content pieces published.'
  },
  {
    category: 'Getting Started',
    question: 'What\'s the best way to use this app daily?',
    answer: 'Start each day with your Daily Plan (5-10 minutes)—set your intentions, check in with your mood, and pick your top 3 priorities. End each day with your Daily Review (5 minutes)—note what worked, what didn\'t, and any wins. This simple ritual creates powerful momentum over time.'
  },
  // Task Management
  {
    category: 'Task Management',
    question: 'How do I use the Quick Add feature?',
    answer: 'Quick Add lets you create tasks using natural language. Press Cmd/Ctrl + K to focus the input, then type naturally. For example: "Call client tomorrow #calls !high 30m" creates a high-priority task scheduled for tomorrow, tagged with #calls, estimated at 30 minutes. The parser shows a live preview of what will be created.'
  },
  {
    category: 'Task Management',
    question: 'What does the Capacity Indicator show?',
    answer: 'The Capacity Indicator shows how much of your 8-hour workday is scheduled with tasks. Green means plenty of time, yellow means approaching capacity (80%+), and red means you\'re over capacity. This helps prevent overcommitment. Add duration estimates to your tasks for accurate tracking.'
  },
  {
    category: 'Task Management',
    question: 'How do recurring tasks work?',
    answer: 'Recurring tasks repeat automatically on a schedule. Set a task to repeat daily, weekly (choose specific days like Mon/Wed/Fri), or monthly (choose a specific day like the 1st or 15th). A "parent" task is created that generates individual instances. Edit the parent to change all future occurrences, or delete individual instances without affecting others.'
  },
  {
    category: 'Task Management',
    question: 'What are SOPs and how do I use them?',
    answer: 'SOPs (Standard Operating Procedures) are reusable checklists you can attach to tasks. Create an SOP once with a checklist, useful links, and notes. When you attach it to a task, the checklist becomes interactive—check off items as you complete them. Great for ensuring consistency in processes you repeat, like client onboarding or content publishing.'
  },
  {
    category: 'Task Management',
    question: 'How do I attach an SOP to a task?',
    answer: 'When creating or editing a task, look for the SOP dropdown. Select an SOP and its checklist, links, and notes will populate the task. Check off items directly within the task—progress is saved automatically. You\'ll see a completion indicator (e.g., "3/5") on the task card. You can detach an SOP anytime if you no longer need it.'
  },
  {
    category: 'Task Management',
    question: 'What are the different task views?',
    answer: 'List view groups tasks by date (Overdue, Today, Tomorrow, etc.). Kanban view shows drag-and-drop columns (Today\'s Focus, Scheduled, Backlog, Waiting On, Someday). Timeline views show your schedule hour-by-hour—choose Day, 3-Day, Week, or Month views. Use the view that matches how you like to work.'
  },
  // Planning & Reviews
  {
    category: 'Planning & Reviews',
    question: 'What\'s the difference between daily/weekly/monthly reviews?',
    answer: 'Daily reviews are quick check-ins (what worked today?). Weekly reviews zoom out to see patterns and adjust your priorities. Monthly reviews look at bigger trends, habit consistency, and whether your approach is working. Think of it as: daily = adjust tactics, weekly = adjust strategy, monthly = adjust direction.'
  },
  {
    category: 'Planning & Reviews',
    question: 'How do I track habits vs tasks?',
    answer: 'Habits are recurring behaviors you want to build (like "exercise" or "read 30 minutes")—track these in the Habits section. Tasks are one-time actions with a clear end point (like "finish report" or "call mom")—manage these in the Tasks section. Both matter, but habits build your identity while tasks move projects forward.'
  },
  {
    category: 'Planning & Reviews',
    question: 'What should I include in my weekly priorities?',
    answer: 'Focus on 3-5 priorities that, if completed, would make this week a success. These should connect to your 90-day goal. Avoid filling this with routine tasks—prioritize the things that require focus and move the needle. Ask yourself: "What must happen this week?"'
  },
  {
    category: 'Planning & Reviews',
    question: 'What is the Scratch Pad in Daily Plan?',
    answer: 'The Scratch Pad is a space for brain dumps and quick captures during the day. Write anything—ideas, tasks that pop up, notes from calls. At the end of the day or during your daily review, process the scratch pad: move items to your task list, ideas bank, or notes. It keeps your mind clear during focused work.'
  },
  // Metrics & Progress
  {
    category: 'Metrics & Progress',
    question: 'Can I change my metrics mid-cycle?',
    answer: 'Yes, you can! Go to Cycle Setup to update your metrics. However, think carefully before changing—consistency in tracking helps you see patterns. If you do change, your historical data for the old metric will still be saved, but your Progress page will show the new metric going forward.'
  },
  {
    category: 'Metrics & Progress',
    question: 'How do I view my progress over time?',
    answer: 'Visit the Progress page to see your metrics visualized over weeks and months. You\'ll see trends in your 3 key metrics, habit completion rates, and review consistency. This is your "scoreboard" for the cycle—use it during weekly and monthly reviews to spot what\'s working.'
  },
  {
    category: 'Metrics & Progress',
    question: 'What happens at the end of a 90-day cycle?',
    answer: 'When your cycle ends, you\'ll have the option to complete a Cycle Summary—a comprehensive review of what you accomplished, what you learned, and what you want to carry forward. Then you can start a fresh cycle with new goals (or continue the momentum on the same goal!).'
  },
  // Features
  {
    category: 'Features',
    question: 'What is Pet Mode?',
    answer: 'Pet Mode is a gamified daily task experience. Each day, choose a virtual pet (like a unicorn, dragon, or panda) and complete 3 tasks to grow it from an egg to an adult. Use the optional Pomodoro timer for focused work sessions. When you complete all 3 tasks, your pet hatches and joins your collection—then you can start fresh with a new egg!'
  },
  {
    category: 'Features',
    question: 'How does the Pomodoro timer work in Pet Mode?',
    answer: 'Each task in Pet Mode has an optional timer button. Click it to choose a focus duration (5, 10, 15, 25, or 45 minutes). When the timer ends, a sound plays and a popup asks if you completed the task. You can mark it done, add more time, or skip. Great for maintaining focus on important tasks.'
  },
  {
    category: 'Features',
    question: 'How do I hatch multiple pets in one day?',
    answer: 'After completing all 3 tasks and growing your pet to "Adult" stage, click the "Start Fresh" button. This saves your hatched pet to your collection and gives you a new random egg. You can repeat this as many times as you like—challenge yourself to hatch multiple pets daily!'
  },
  {
    category: 'Features',
    question: 'What are Identity Anchors?',
    answer: 'Identity Anchors help you embody the person you\'re becoming. Create an identity statement (e.g., "I am a disciplined entrepreneur"), then add supporting actions and habits that reinforce this identity. See your anchor during daily planning as a reminder of who you\'re choosing to be.'
  },
  {
    category: 'Features',
    question: 'What are Useful Thoughts?',
    answer: 'Useful Thoughts is a library of mindset reframes, affirmations, and perspectives that serve you. Capture thoughts from books, mentors, or your own realizations. Organize them by category, mark favorites, and browse them when you need a perspective shift. Insert them into your daily/weekly plans.'
  },
  {
    category: 'Features',
    question: 'How does the Ideas Capture work?',
    answer: 'Ideas Capture is a dedicated space for inspiration that doesn\'t belong on your task list. Quickly save ideas as they come, organize into categories, and review during weekly planning. When you\'re ready to act on an idea, convert it into a task. This keeps ideas alive without cluttering your workflow.'
  },
  // Troubleshooting
  {
    category: 'Troubleshooting',
    question: 'Why aren\'t my habits showing up?',
    answer: 'Make sure you\'ve created habits in the Habits page first. Habits need to be marked as "active" to appear in your daily view. If you archived a habit, it won\'t show—check your archived habits and restore if needed.'
  },
  {
    category: 'Troubleshooting',
    question: 'How do I use the Celebration Wall?',
    answer: 'The Celebration Wall shows wins shared by the community. When you complete a weekly review, you can choose to share your highlights publicly (anonymously). This creates a positive feedback loop—celebrate others\' wins and let them celebrate yours!'
  },
  {
    category: 'Troubleshooting',
    question: 'I missed a few days—should I backfill my data?',
    answer: 'That\'s up to you! If you have quick notes about what happened, adding them can help you see patterns in your reviews. But don\'t stress about perfect data—the goal is progress, not perfection. Just pick up where you are today and keep moving forward.'
  },
  {
    category: 'Troubleshooting',
    question: 'How do I see the question mark help buttons throughout the app?',
    answer: 'Look for small question mark icons (?) next to feature labels like Quick Add, Capacity Indicator, and the 90-Day Goal card. Click them to see a popup with tips and explanations. They\'re there to help you understand features at a glance without leaving the page you\'re on.'
  }
];

const categories = ['All', 'Getting Started', 'Task Management', 'Planning & Reviews', 'Metrics & Progress', 'Features', 'Troubleshooting'];

export function FAQSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const groupedFAQs = filteredFAQs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
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

      {/* FAQ Accordion */}
      {filteredFAQs.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              No questions found matching your search. Try different keywords or browse all categories.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedFAQs).map(([category, faqs]) => (
          <Card key={category} className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-primary">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`${category}-${index}`} className="border-border">
                    <AccordionTrigger className="text-left hover:no-underline hover:text-primary">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
