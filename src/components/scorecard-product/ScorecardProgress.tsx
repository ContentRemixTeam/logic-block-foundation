import { CheckCircle2 } from 'lucide-react';

export function ScorecardProgress({ completed, total, label = 'This week' }: { completed: number; total: number; label?: string }) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <section className="border-2 border-[#111111] bg-white p-5 shadow-[5px_5px_0_#111111] sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8891E]">{label}</p>
          <p className="mt-1 font-['Bebas_Neue'] text-4xl leading-none tracking-wide">
            {completed} of {total} done
          </p>
        </div>
        <div className="flex items-center gap-2 text-[#C8145E]">
          <CheckCircle2 className="h-6 w-6" />
          <span className="font-['Bebas_Neue'] text-4xl leading-none">{percentage}%</span>
        </div>
      </div>
      <div className="mt-5 h-4 border-2 border-[#111111] bg-[#F7F5F2]" aria-label={`${percentage}% complete`}>
        <div
          className="h-full bg-[#C8145E] transition-[width] duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </section>
  );
}
