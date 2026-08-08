export function AuthLogo() {
  return (
    <div className="mb-6 flex max-w-full flex-col items-center px-2 text-center">
      <div className="mb-4 flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xl font-light tracking-[0.18em] sm:text-2xl sm:tracking-[0.3em]">
        <span className="text-foreground">FAITH</span>
        <span className="text-amber-500 animate-pulse">⚡</span>
        <span className="text-foreground">MARIAH</span>
      </div>

      <h1 className="max-w-full text-balance text-lg font-semibold leading-snug tracking-wide sm:text-xl">
        BECOMING BOSS MASTERMIND
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        90-Day Goal Achievement System
      </p>
    </div>
  );
}
