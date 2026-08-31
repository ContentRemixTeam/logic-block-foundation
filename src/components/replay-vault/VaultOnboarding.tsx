import { useEffect, useState } from 'react';
import { Bookmark, Library, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getStorageItem, setStorageItem } from '@/lib/storage';

const STORAGE_KEY = 'replay-vault-tour-v1-last-seen';
const RETURN_AFTER_MS = 60 * 24 * 60 * 60 * 1000;
const STEPS = [
  { title: 'Search for the problem you are solving', body: 'Type a topic or question. The Vault searches video titles and full transcripts, then takes you to the most useful moments.', icon: Search },
  { title: 'Browse the full library', body: 'Use Browse when you want to explore recent calls or a category. Choose Watch full replay to start from the beginning.', icon: Library },
  { title: 'Open an exact answer', body: 'Search results include the matching words and timestamp. Choose Watch answer to jump directly to that part of the video.', icon: Sparkles },
  { title: 'Save what you want to return to', body: 'Save a full video or a useful moment. Find it later under Saved without searching again.', icon: Bookmark },
];

function readTourState() {
  try {
    const stored = JSON.parse(getStorageItem(STORAGE_KEY) ?? 'null');
    const lastVisitedAt = Number(stored?.lastVisitedAt);
    return {
      completedAt: Number.isFinite(Number(stored?.completedAt)) ? Number(stored.completedAt) : null,
      lastVisitedAt: Number.isFinite(lastVisitedAt) && lastVisitedAt > 0 ? lastVisitedAt : null,
    };
  } catch {
    return { completedAt: null, lastVisitedAt: null };
  }
}

export function VaultOnboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const stored = readTourState();
    if (!stored.lastVisitedAt || Date.now() - stored.lastVisitedAt >= RETURN_AFTER_MS) setOpen(true);
    setStorageItem(STORAGE_KEY, JSON.stringify({ completedAt: stored.completedAt, lastVisitedAt: Date.now() }));
  }, []);

  const finish = () => {
    setStorageItem(STORAGE_KEY, JSON.stringify({ completedAt: Date.now(), lastVisitedAt: Date.now() }));
    setOpen(false);
    setStep(0);
  };
  const changeOpen = (nextOpen: boolean) => { if (nextOpen) setOpen(true); else finish(); };
  const current = STEPS[step];
  const Icon = current.icon;

  return <>
    <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => { setStep(0); setOpen(true); }}>
      <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />Show me around
    </Button>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-w-md rounded-none border-2 border-[#111111]">
        <DialogHeader>
          <p className="text-xs font-bold uppercase text-[#555555]">Replay Vault tour · {step + 1} of {STEPS.length}</p>
          <div className="flex items-center gap-3 pt-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#C8145E] text-white"><Icon className="h-5 w-5" aria-hidden="true" /></span>
            <DialogTitle className="text-left text-xl">{current.title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-left text-base text-[#555555]">{current.body}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button type="button" variant="ghost" className="min-h-11" onClick={finish}>Skip tour</Button>
          <div className="flex gap-2">
            {step > 0 && <Button type="button" variant="outline" className="min-h-11" onClick={() => setStep((value) => value - 1)}>Back</Button>}
            <Button type="button" className="min-h-11" onClick={() => step === STEPS.length - 1 ? finish() : setStep((value) => value + 1)}>{step === STEPS.length - 1 ? 'Start exploring' : 'Next'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
