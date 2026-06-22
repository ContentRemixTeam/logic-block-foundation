export function AuthLogo() {
  return (
    <div className="flex flex-col items-center mb-6">
      <div className="flex items-center gap-2 text-2xl tracking-[0.3em] font-light mb-4">
        <span className="text-foreground">FAITH</span>
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="text-foreground">MARIAH</span>
      </div>
      
      <h1 className="text-xl font-semibold tracking-wide text-center">
        BOSS PLANNER
      </h1>
      
      <p className="text-sm text-muted-foreground mt-2">
        90-Day Business Planning System
      </p>
    </div>
  );
}
