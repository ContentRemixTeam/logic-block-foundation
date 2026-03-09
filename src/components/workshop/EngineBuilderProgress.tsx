import { STEP_CONFIGS, TOTAL_STEPS } from './EngineBuilderTypes';

interface EngineBuilderProgressProps {
  currentStep: number;
}

export function EngineBuilderProgress({ currentStep }: EngineBuilderProgressProps) {
  return (
    <div className="w-full px-4 py-6">
      {/* Race Track */}
      <div className="relative flex items-center justify-between max-w-2xl mx-auto">
        {/* Track line */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-full overflow-hidden" style={{ background: 'hsl(220 13% 87%)' }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out engine-progress-fill"
            style={{ width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>

        {/* Checkpoints */}
        {STEP_CONFIGS.map((step) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          
          return (
            <div key={step.number} className="relative z-10 flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 border-2"
                style={
                  isCompleted
                    ? { background: 'hsl(32 95% 44%)', borderColor: 'hsl(32 95% 44%)', color: 'white', transform: 'scale(1)' }
                    : isCurrent
                      ? { background: 'hsl(var(--engine-card))', borderColor: 'hsl(32 95% 44%)', color: 'hsl(32 95% 44%)', transform: 'scale(1.1)', boxShadow: '0 4px 12px hsl(32 95% 44% / 0.3), 0 0 0 4px hsl(32 95% 44% / 0.15)' }
                      : { background: 'hsl(220 13% 91%)', borderColor: 'hsl(220 13% 87%)', color: 'hsl(220 9% 46%)', transform: 'scale(0.9)' }
                }
              >
                {isCompleted ? '🏁' : step.emoji}
              </div>
              <span
                className="mt-2 text-xs font-medium text-center max-w-[80px] leading-tight"
                style={{ color: isCurrent ? 'hsl(32 95% 44%)' : 'hsl(220 9% 46%)', fontWeight: isCurrent ? 600 : 500 }}
              >
                {step.funLabel}
              </span>
            </div>
          );
        })}

        {/* Moving car */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out z-20 pointer-events-none"
          style={{
            left: `calc(${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}% - 12px)`,
          }}
        >
          <span className="text-2xl drop-shadow-md" role="img" aria-label="race car">🏎️</span>
        </div>
      </div>
    </div>
  );
}
