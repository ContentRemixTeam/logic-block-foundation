export function AuthLogo() {
  return (
    <div className="flex flex-col items-center mb-6">
      {/* Faith Mariah Logo */}
      <div className="flex items-center gap-2 text-2xl tracking-[0.3em] font-light mb-4">
        <span className="text-foreground">FAITH</span>
        <span className="text-amber-500 animate-pulse">⚡</span>
        <span className="text-foreground">MARIAH</span>
      </div>
      
      {/* Mastermind Title */}
      <h1 className="text-xl font-semibold tracking-wide text-center">
        BECOMING BOSS MASTERMIND
      </h1>
      
      {/* Tagline */}
      <p className="text-sm text-muted-foreground mt-2">
        90-Day Goal Achievement System
      </p>
    </div>
  );
}
