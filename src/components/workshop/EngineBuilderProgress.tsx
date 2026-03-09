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
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
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
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-lg
                  transition-all duration-300 border-2
                  ${isCompleted
                    ? 'bg-primary border-primary text-primary-foreground scale-100'
                    : isCurrent
                      ? 'bg-background border-primary text-primary scale-110 shadow-lg ring-4 ring-primary/20'
                      : 'bg-muted border-border text-muted-foreground scale-90'
                  }
                `}
              >
                {isCompleted ? '🏁' : step.emoji}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium text-center max-w-[80px] leading-tight
                  ${isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground'}
                `}
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
