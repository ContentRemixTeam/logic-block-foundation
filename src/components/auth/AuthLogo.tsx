import logoMark from '/brand/logo-mark.svg';

export function AuthLogo() {
  return (
    <div className="flex flex-col items-center mb-6">
      <img
        src={logoMark}
        alt="Low Battery Business Planner"
        className="w-20 h-20 mb-4"
      />
      <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
        Low Battery
      </h1>
      <p className="text-xs font-medium tracking-[0.35em] text-muted-foreground mt-1">
        BUSINESS PLANNER
      </p>
      <p className="text-sm text-muted-foreground mt-3 italic">
        your 25% still counts
      </p>
    </div>
  );
}
