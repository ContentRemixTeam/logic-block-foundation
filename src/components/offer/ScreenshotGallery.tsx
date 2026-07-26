import anchors from "@/assets/offer/anchors.jpg";
import lowBatteryDay from "@/assets/offer/low-battery-day.jpg";
import weeklyPlan from "@/assets/offer/weekly-plan.jpg";
import wizards from "@/assets/offer/wizards.jpg";
import openLoops from "@/assets/offer/open-loops.jpg";


type Shot = {
  src: string;
  alt: string;
  caption: string;
  wide?: boolean;
};

const shots: Shot[] = [
  {
    src: lowBatteryDay,
    alt: "Low Battery Day prompt asking if the rest of the day should be parked",
    caption:
      "Low Battery Day. One tap parks everything except your bare minimum. Nothing is deleted.",
  },
  {
    src: anchors,
    alt: "Today's Anchors panel with brave move, low-energy task and waiting-on fields",
    caption:
      "Today's Anchors. One brave move, one low-energy task, one thing you're letting go of.",
  },
  {
    src: weeklyPlan,
    alt: "Weekly planner showing the one outcome, three commitments and a life-happens plan",
    caption:
      "The weekly tradeoff. One outcome, three commitments, and a plan for when life happens.",
    wide: true,
  },
  {
    src: openLoops,
    alt: "Open Loops page grouping items into Do, Decide, Defer and Delete",
    caption:
      "Open Loops. Every loose thread in one calm place, sorted into do, decide, defer or delete.",
  },
  {
    src: wizards,
    alt: "Smart Wizards library with 90-day cycle planner and other guided workflows",
    caption:
      "Guided wizards. Plan a 90-day cycle, a launch, or a content batch without a blank page.",
  },
];

export function ScreenshotGallery() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {shots.map((shot) => (
        <figure
          key={shot.src}
          className={`overflow-hidden rounded-xl border border-border-subtle bg-surface ${
            shot.wide ? "sm:col-span-2" : ""
          }`}
        >
          <div className="bg-surface-sunken">
            <img
              src={shot.src}
              alt={shot.alt}
              loading="lazy"
              className="w-full"
            />
          </div>
          <figcaption className="border-t border-border-subtle px-5 py-4 text-sm leading-relaxed text-muted-foreground">
            {shot.caption}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
