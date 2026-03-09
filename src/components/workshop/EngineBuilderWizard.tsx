import { useState } from 'react';
import { EngineBuilderProgress } from './EngineBuilderProgress';
import { StepDiscover } from './steps/StepDiscover';
import { StepNurture } from './steps/StepNurture';
import { StepConvert } from './steps/StepConvert';
import { StepRevenueLoop } from './steps/StepRevenueLoop';
import { StepEditorialCalendar } from './steps/StepEditorialCalendar';
import { StepResults } from './steps/StepResults';
import { generateEngineBuilderPDF } from './EngineBuilderPDF';
import { DEFAULT_ENGINE_DATA, TOTAL_STEPS, STEP_CONFIGS, TRANSITION_MESSAGES } from './EngineBuilderTypes';
import type { EngineBuilderData } from './EngineBuilderTypes';

export function EngineBuilderWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<EngineBuilderData>(DEFAULT_ENGINE_DATA);
  const [showResults, setShowResults] = useState(false);

  const onChange = (updates: Partial<EngineBuilderData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!data.primaryPlatform;
      case 2: return !!data.emailMethod;
      case 3: return !!data.offerName;
      case 4: return !!data.loopLength;
      case 5: return true;
      default: return true;
    }
  };

  const goNext = () => {
    if (step === TOTAL_STEPS) {
      setShowResults(true);
    } else if (step < TOTAL_STEPS && canProceed()) {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (showResults) {
      setShowResults(false);
    } else if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  const currentConfig = STEP_CONFIGS[step - 1];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏎️</span>
            <h1 className="text-lg font-bold text-foreground">Business Engine Builder</h1>
          </div>
          <a href="/join" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Mastermind member? Log in →
          </a>
        </div>
      </header>

      {/* Progress */}
      {!showResults && <EngineBuilderProgress currentStep={step} />}

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {showResults ? (
          <StepResults
            data={data}
            onDownloadPDF={() => generateEngineBuilderPDF(data)}
          />
        ) : (
          <>
            {/* Transition message */}
            {step > 1 && TRANSITION_MESSAGES[step - 1] && (
              <div className="mb-4 px-4 py-2 rounded-lg bg-accent/50 border border-primary/10 text-center">
                <p className="text-sm text-primary font-medium italic">
                  {TRANSITION_MESSAGES[step - 1]}
                </p>
              </div>
            )}

            {/* Step header badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {currentConfig.emoji} {currentConfig.enginePart}
              </span>
              <span className="text-xs text-muted-foreground">
                Step {step} of {TOTAL_STEPS}
              </span>
            </div>

            {/* Step content */}
            {step === 1 && <StepDiscover data={data} onChange={onChange} />}
            {step === 2 && <StepNurture data={data} onChange={onChange} />}
            {step === 3 && <StepConvert data={data} onChange={onChange} />}
            {step === 4 && <StepRevenueLoop data={data} onChange={onChange} />}
            {step === 5 && <StepEditorialCalendar data={data} onChange={onChange} />}
          </>
        )}
      </main>

      {/* Footer navigation */}
      {!showResults && (
        <footer className="border-t border-border bg-card/80 backdrop-blur-sm sticky bottom-0">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={step === 1}
              className="px-5 py-2 rounded-lg text-sm font-medium text-foreground bg-secondary hover:bg-secondary-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="px-6 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {step === TOTAL_STEPS ? '🏆 See Your Blueprint' : 'Next →'}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
