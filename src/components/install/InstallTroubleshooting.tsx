import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';

export function InstallTroubleshooting() {
  const faqs = [
    {
      question: "I don't see an install button or prompt",
      answer: `This can happen for a few reasons:
      
• **iPhone/iPad**: You MUST use Safari. Other browsers like Chrome won't show the install option.
• **Android**: Try Chrome browser. Look for the "Add to Home screen" option in the menu (⋮).
• **Already installed**: If the app is already on your home screen, you won't see the prompt again.
• **Refresh the page**: Sometimes a quick refresh helps. Pull down on mobile or press Ctrl+R on desktop.`
    },
    {
      question: "What's the difference between Quick Add and Boss Planner?",
      answer: `**Quick Add ⚡** is for fast capture:
• Opens instantly (1 second)
• Minimal interface - just type and save
• Perfect for capturing ideas on the go
• Captures tasks, ideas, expenses, and income

**Boss Planner 📊** is your full planning hub:
• Daily planning with Top 3 priorities
• Weekly planning and reflection
• 90-day goal tracking
• Habits, projects, content planning, and more

**Tip**: Install both! Use Quick Add when you need to capture something fast, and Boss Planner when you're ready to plan and organize.`
    },
    {
      question: "Can I use this on my computer?",
      answer: `Yes! Boss Planner works great on desktop.

**Chrome or Edge**: Look for the install icon (⊕) on the right side of your address bar. Click it and select "Install".

**Firefox or Safari on Mac**: These browsers don't support installation, but you can still use the app in your browser. Just bookmark the page for easy access.

The app automatically adjusts its layout for larger screens, giving you a full dashboard experience.`
    },
    {
      question: "How do I update the apps?",
      answer: `The apps update automatically! Here's how it works:

• When you open the app, it checks for updates in the background
• If an update is available, it downloads automatically
• Close and reopen the app to get the latest version

**Tip**: If something seems off, try closing the app completely and reopening it. On iPhone, swipe up from the bottom to see all apps, then swipe the app away to close it.`
    },
    {
      question: "How do I uninstall the apps?",
      answer: `Uninstalling works just like any other app:

**iPhone/iPad**: 
1. Press and hold the app icon until it jiggles
2. Tap the minus (-) icon
3. Select "Delete App"

**Android**:
1. Press and hold the app icon
2. Drag to "Uninstall" or tap the info icon
3. Confirm removal

**Desktop**:
• Windows: Right-click the app icon → Uninstall
• Mac: Drag the app to Trash from Applications folder

Your data stays safe in your account even if you uninstall the apps.`
    },
    {
      question: "The app won't open after installing",
      answer: `Try these fixes:

1. **Wait a moment**: Sometimes it takes a few seconds for the app to fully install.

2. **Check your home screen**: The app might be on a different screen or in a folder. Search for "Quick Add" or "Boss Planner".

3. **Restart your device**: This can resolve installation issues.

4. **Reinstall**: Remove the app and try installing again from this page.

5. **Clear browser cache**: If the app opens but shows old content, clear your browser's cache and reinstall.`
    },
    {
      question: "Do I need internet to use the apps?",
      answer: `The apps work offline with some limitations:

**What works offline**:
• Viewing your existing tasks and plans
• Creating new tasks (they'll sync when you're back online)
• Accessing recently viewed content

**What needs internet**:
• Syncing changes to your account
• Loading new data from other devices
• Some features that require server access

**Tip**: Open the app while you have internet to cache your data, then you can use it offline later.`
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HelpCircle className="h-5 w-5" />
          Troubleshooting & FAQ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent>
                <div className="text-sm text-muted-foreground whitespace-pre-line prose prose-sm max-w-none">
                  {faq.answer}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
