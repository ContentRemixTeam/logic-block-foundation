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
    question: 'What are the 3 key metrics and how do I choose them?',
    answer: 'Your 3 key metrics are the numbers that best represent progress toward your goal. Choose metrics that are: 1) Measurable (you can track them objectively), 2) Meaningful (they actually matter for your goal), and 3) Within your control (actions you take, not outcomes you hope for). For example, if your goal is to grow your business, metrics might be: calls made, proposals sent, and content pieces published.'
  },
  {
    category: 'Getting Started',
    question: 'What\'s the best way to use this app daily?',
    answer: 'Start each day with your Daily Plan (5-10 minutes)—set your intentions, check in with your mood, and pick your top 3 priorities. End each day with your Daily Review (5 minutes)—note what worked, what didn\'t, and any wins. This simple ritual creates powerful momentum over time.'
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
  }
];

const categories = ['All', 'Getting Started', 'Planning & Reviews', 'Metrics & Progress', 'Troubleshooting'];

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
