// Engine Builder Intro — shown above Step 1 content

export function EngineBuilderIntro() {
  return (
    <div className="mb-8 space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          🏎️ Build Your Business Engine
        </h2>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto">
          In the next 5 steps, you'll map out the complete engine that drives your business — 
          from how people find you to how you make money on repeat.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
        <WalkAwayCard emoji="🗺️" text="A visual blueprint of your full business engine" />
        <WalkAwayCard emoji="🔄" text="A revenue loop that cycles Nurture → Sell → Nurture" />
        <WalkAwayCard emoji="📅" text="A weekly schedule with create & publish days" />
        <WalkAwayCard emoji="🎁" text="Personalized tool recommendations to accelerate your growth" />
      </div>

      <div className="text-center pt-2">
        <p className="text-sm font-medium text-primary">
          Mastermind members can save their blueprint directly to their planner with auto-generated tasks.
        </p>
      </div>

      <div className="border-t border-border pt-4" />
    </div>
  );
}

function WalkAwayCard({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 border border-border">
      <span className="text-xl shrink-0">{emoji}</span>
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}
