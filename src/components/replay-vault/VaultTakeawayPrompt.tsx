import { useEffect, useState } from 'react';
import { ExternalLink, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_SHARE_URL } from '@/constants/community';

const reasons = [
  {
    message: 'Put the idea in your own words. Research calls this the generation effect: self-generated information is remembered better than information you only read.',
    source: 'https://pubmed.ncbi.nlm.nih.gov/32671573/',
    sourceLabel: 'See the research',
  },
  {
    message: 'In two experiments with 200 learners, people who took notes remembered more of a video lecture than people who only photographed it or took no notes.',
    source: 'https://pubmed.ncbi.nlm.nih.gov/34166036/',
    sourceLabel: 'See the study',
  },
  {
    message: 'Share the one action you will take next. It gives the community something specific to encourage, answer, and follow up on.',
  },
  {
    message: 'Your takeaway can help someone else spot the lesson they need, while explaining it helps you make the idea your own. Double win.',
  },
] as const;

export function VaultTakeawayPrompt() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % reasons.length), 12_000);
    return () => window.clearInterval(timer);
  }, []);

  const reason = reasons[index];
  return (
    <section aria-labelledby="vault-takeaway-heading" className="border-y-2 border-[#111111] bg-[#F7F5F2] px-4 py-4">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h3 id="vault-takeaway-heading" className="flex items-center gap-2 text-base font-semibold text-[#111111]">
            <Lightbulb className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Make this replay stick
          </h3>
          <p className="max-w-3xl text-sm leading-6 text-[#555555]" aria-live="polite">{reason.message}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Reason {index + 1} of {reasons.length}</span>
            {'source' in reason && <a href={reason.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{reason.sourceLabel}</a>}
            <button type="button" className="inline-flex min-h-8 items-center gap-1 font-medium underline underline-offset-2" onClick={() => setIndex((current) => (current + 1) % reasons.length)}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Another reason
            </button>
          </div>
        </div>
        <Button asChild className="min-h-11 shrink-0">
          <a href={DEFAULT_SHARE_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
            Share your takeaway
          </a>
        </Button>
      </div>
    </section>
  );
}
