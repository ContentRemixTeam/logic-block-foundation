import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Flame,
  CalendarDays,
  ListTodo,
  FolderKanban,
  Package,
  CalendarRange,
  Sparkles,
  Brain,
  Inbox,
  BookOpen,
  Lightbulb,
  Trophy,
  TrendingUp,
  GraduationCap,
  Compass,
  ClipboardCheck,
  Settings,
  HelpCircle,
  Zap,
  Library,
  ClipboardList,
  CheckSquare,
  DollarSign,
  PenSquare,
  Search,
} from "lucide-react";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  keywords?: string;
};

const ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Home" },
  { name: "Today", href: "/daily-plan", icon: Flame, group: "Home", keywords: "daily plan" },
  { name: "This Week", href: "/weekly-plan", icon: CalendarDays, group: "Home", keywords: "weekly" },
  { name: "Focus Mode", href: "/focus", icon: Zap, group: "Home", keywords: "blitz" },

  { name: "Tasks", href: "/tasks", icon: ListTodo, group: "Build" },
  { name: "All Tasks", href: "/all-tasks", icon: ListTodo, group: "Build" },
  { name: "Projects", href: "/projects", icon: FolderKanban, group: "Build" },
  { name: "Offers", href: "/offers", icon: Package, group: "Build" },
  { name: "Editorial Calendar", href: "/editorial-calendar", icon: CalendarRange, group: "Build", keywords: "content" },
  { name: "Wizards", href: "/wizards", icon: Sparkles, group: "Build" },

  { name: "Brain Dump", href: "/brain-dump", icon: Brain, group: "Capture" },
  { name: "Open Loops", href: "/open-loops", icon: Inbox, group: "Capture" },
  { name: "Notes", href: "/notes", icon: BookOpen, group: "Capture" },
  { name: "Ideas", href: "/ideas", icon: Lightbulb, group: "Capture" },
  { name: "Wins", href: "/wins", icon: Trophy, group: "Capture" },

  { name: "Progress", href: "/progress", icon: TrendingUp, group: "Grow" },
  { name: "Learning", href: "/courses", icon: GraduationCap, group: "Grow", keywords: "courses" },
  { name: "Mindset", href: "/mindset", icon: Compass, group: "Grow" },
  { name: "Reviews", href: "/planning", icon: ClipboardCheck, group: "Grow", keywords: "planning weekly monthly" },
  { name: "Content Vault", href: "/content-vault", icon: Library, group: "Grow" },
  { name: "SOPs", href: "/sops", icon: ClipboardList, group: "Grow" },
  { name: "Habits", href: "/habits", icon: CheckSquare, group: "Grow" },
  { name: "Finances", href: "/finances", icon: DollarSign, group: "Grow", keywords: "money income" },

  { name: "Settings", href: "/settings", icon: Settings, group: "System" },
  { name: "Support", href: "/support", icon: HelpCircle, group: "System" },
];

/** Global Cmd+K / Ctrl+K palette for jump-to-anywhere. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    ITEMS.forEach((it) => {
      if (!map.has(it.group)) map.set(it.group, []);
      map.get(it.group)!.push(it);
    });
    return Array.from(map.entries());
  }, []);

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to a page or action…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/brain-dump")}>
            <PenSquare className="mr-2 h-4 w-4" />
            <span>New brain dump</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/daily-plan")}>
            <Flame className="mr-2 h-4 w-4" />
            <span>Plan today</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/focus")}>
            <Zap className="mr-2 h-4 w-4" />
            <span>Start a focus session</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/all-tasks")}>
            <Search className="mr-2 h-4 w-4" />
            <span>Search all tasks</span>
          </CommandItem>
        </CommandGroup>

        {grouped.map(([group, items]) => (
          <div key={group}>
            <CommandSeparator />
            <CommandGroup heading={group}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    value={`${item.name} ${item.keywords ?? ""} ${item.group}`}
                    onSelect={() => go(item.href)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
