import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Copy, Check, MessageSquare, Mail, FileText, 
  RefreshCw, Download, Sparkles
} from 'lucide-react';
import { 
  MoneyMomentumData, 
  OfferScore,
  IDEA_DISPLAY_NAMES,
  formatCurrency
} from '@/types/moneyMomentum';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StepScriptGeneratorProps {
  data: MoneyMomentumData;
  onChange: (updates: Partial<MoneyMomentumData>) => void;
}

type ScriptType = 'social' | 'dm' | 'email' | 'followup';

export function StepScriptGenerator({ data, onChange }: StepScriptGeneratorProps) {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ScriptType>('social');

  // Get primary and backup offers
  const primaryScore = data.offerScores.find(s => s.ideaId === data.primaryOfferId);
  const backupScore = data.offerScores.find(s => s.ideaId === data.backupOfferId);
  
  // Get offer details from brainstormed ideas
  const primaryIdea = data.brainstormedIdeas.find(i => 
    `${i.type}-${data.brainstormedIdeas.indexOf(i)}` === data.primaryOfferId
  );

  const generateSocialScript = (offer: OfferScore): string => {
    const ideaData = data.brainstormedIdeas.find(i => 
      `${i.type}-${data.brainstormedIdeas.indexOf(i)}` === offer.ideaId
    )?.data || {};

    const price = (ideaData as any).price || (ideaData as any).standardPrice || '[PRICE]';
    const spots = (ideaData as any).spots || (ideaData as any).podSize || '[X]';

    return `I'm opening ${spots} spots for ${offer.ideaName}.

If you're stuck on [PROBLEM]:
✓ [BENEFIT 1]
✓ [BENEFIT 2]
✓ [BENEFIT 3]

In [TIMEFRAME], we'll [SPECIFIC OUTCOME].

Investment: ${typeof price === 'number' ? formatCurrency(price) : price}

Only ${spots} spots available.

DM me "${offer.ideaType.toUpperCase().replace(/_/g, '')}" if you're ready.`;
  };

  const generateDMScript = (offer: OfferScore): string => {
    return `Hey [Name]!

Quick question: are you still [struggling with X / working on Y]?

I'm opening spots for ${offer.ideaName} and immediately thought of you.

[One sentence: what it is]
[One sentence: specific outcome for THEM]

[PRICE]. [TIMELINE/URGENCY].

Want details?`;
  };

  const generateEmailScript = (offer: OfferScore): string => {
    const ideaData = data.brainstormedIdeas.find(i => 
      `${i.type}-${data.brainstormedIdeas.indexOf(i)}` === offer.ideaId
    )?.data || {};

    const price = (ideaData as any).price || '[PRICE]';

    return `Subject: I'm opening [X] spots for ${offer.ideaName}

Hey [First Name],

[Opening: relate to their pain/goal]

I'm launching ${offer.ideaName}.

Here's what it is:
[2-3 sentences explaining the offer]

Perfect if you:
• [Qualifier 1]
• [Qualifier 2]
• [Qualifier 3]

What's included:
• [Deliverable 1]
• [Deliverable 2]
• [Deliverable 3]

Investment: ${typeof price === 'number' ? formatCurrency(price) : price}
Timeline: [DATES/DURATION]

[URGENCY: spots/deadline]

Ready? Reply to this email.

[Your Name]

P.S. [Additional urgency or bonus]`;
  };

  const generateFollowupScript = (offer: OfferScore): string => {
    return `--- DAY 2 ---

Hey [Name],

Saw you [opened my email / saw my post / asked about this].

${offer.ideaName} - still have [X] spots.

Any questions I can answer?

[Your Name]

--- DAY 4 ---

Quick update: [X] spots left for ${offer.ideaName}.

If you were on the fence, now's the time.

[Link/next step]

--- DAY 7 (LAST CALL) ---

Final spots for ${offer.ideaName} close [tonight/tomorrow].

If you're interested, let me know ASAP.

Otherwise, next round is [when].`;
  };

  const getScript = (type: ScriptType, offer: OfferScore): string => {
    switch (type) {
      case 'social': return generateSocialScript(offer);
      case 'dm': return generateDMScript(offer);
      case 'email': return generateEmailScript(offer);
      case 'followup': return generateFollowupScript(offer);
    }
  };

  const handleCopy = async (script: string, id: string) => {
    await navigator.clipboard.writeText(script);
    setCopiedScript(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const handleDownloadAll = () => {
    if (!primaryScore) return;

    let content = `# ${primaryScore.ideaName} - Sales Scripts\n\n`;
    content += `Generated on ${new Date().toLocaleDateString()}\n\n`;
    content += `---\n\n`;
    
    content += `## 📱 Social Media Post\n\n${generateSocialScript(primaryScore)}\n\n`;
    content += `---\n\n`;
    content += `## 💬 DM Script\n\n${generateDMScript(primaryScore)}\n\n`;
    content += `---\n\n`;
    content += `## 📧 Email\n\n${generateEmailScript(primaryScore)}\n\n`;
    content += `---\n\n`;
    content += `## 🔄 Follow-up Sequence\n\n${generateFollowupScript(primaryScore)}\n\n`;

    if (backupScore) {
      content += `\n\n# BACKUP OFFER: ${backupScore.ideaName}\n\n`;
      content += `---\n\n`;
      content += `## 📱 Social Media Post\n\n${generateSocialScript(backupScore)}\n\n`;
      content += `---\n\n`;
      content += `## 💬 DM Script\n\n${generateDMScript(backupScore)}\n\n`;
    }

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${primaryScore.ideaName.replace(/\s+/g, '-').toLowerCase()}-scripts.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Scripts downloaded!');
  };

  if (!primaryScore) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Your Offer Scripts</h2>
          <p className="text-muted-foreground">
            Go back and select your primary offer first!
          </p>
        </div>
      </div>
    );
  }

  const scriptTypes: { key: ScriptType; label: string; icon: typeof MessageSquare }[] = [
    { key: 'social', label: 'Social Post', icon: MessageSquare },
    { key: 'dm', label: 'DM Script', icon: MessageSquare },
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'followup', label: 'Follow-ups', icon: RefreshCw },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">
          Here's exactly how to sell {primaryScore.ideaName}
        </h2>
        <p className="text-muted-foreground">
          Copy, paste, and personalize these scripts.<br />
          Everything you need to start selling TODAY.
        </p>
      </div>

      {/* Primary Offer Scripts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Primary: {primaryScore.ideaName}</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadAll} className="gap-2">
              <Download className="h-4 w-4" />
              Download All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ScriptType)}>
            <TabsList className="grid grid-cols-4 mb-4">
              {scriptTypes.map(({ key, label }) => (
                <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {scriptTypes.map(({ key, label, icon: Icon }) => {
              const script = getScript(key, primaryScore);
              const copyId = `primary-${key}`;
              
              return (
                <TabsContent key={key} value={key} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{label}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(script, copyId)}
                      className="gap-2"
                    >
                      {copiedScript === copyId ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[300px] rounded-md border">
                    <pre className="p-4 text-sm whitespace-pre-wrap font-sans">
                      {script}
                    </pre>
                  </ScrollArea>

                  <p className="text-xs text-muted-foreground">
                    💡 Replace [BRACKETED TEXT] with your specific details
                  </p>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Backup Offer Scripts */}
      {backupScore && (
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">BACKUP</Badge>
              <CardTitle className="text-lg">{backupScore.ideaName}</CardTitle>
            </div>
            <CardDescription>
              Use these if primary offer doesn't get traction in 3 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {scriptTypes.slice(0, 2).map(({ key, label, icon: Icon }) => {
                const script = getScript(key, backupScore);
                const copyId = `backup-${key}`;
                
                return (
                  <Button
                    key={key}
                    variant="outline"
                    className="justify-start gap-2 h-auto py-3"
                    onClick={() => handleCopy(script, copyId)}
                  >
                    {copiedScript === copyId ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copy {label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personalization Tips */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">📝 Personalization Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary">→</span>
              Replace [Name] with actual names when DMing
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">→</span>
              Reference something specific about each person
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">→</span>
              Fill in your specific outcomes, not generic benefits
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">→</span>
              Add real deadlines/dates for urgency
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">→</span>
              Keep it conversational, not salesy
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
