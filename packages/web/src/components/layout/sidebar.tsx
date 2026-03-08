import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Lightbulb,
  GitFork,
  Timer,
  BarChart3,
  Settings,
  ArrowRightLeft,
  ChevronDown,
  Zap,
  Brain,
  Calendar,
  Users,
  FolderKanban,
  Github,
  Search,
  Sparkles,
  Shield,
} from "lucide-react";
import { BrainCloudLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: "Capture",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", shortcut: "D" },
      { to: "/quick-entry", icon: Zap, label: "Quick Entry", shortcut: "N" },
    ],
  },
  {
    title: "Knowledge",
    items: [
      { to: "/thoughts", icon: Lightbulb, label: "Thoughts", shortcut: "T" },
      { to: "/decisions", icon: GitFork, label: "Decisions" },
      { to: "/sessions", icon: Timer, label: "Sessions" },
      { to: "/handoffs", icon: ArrowRightLeft, label: "Handoffs" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { to: "/ask", icon: Sparkles, label: "Ask Brain", shortcut: "A" },
      { to: "/insights", icon: Brain, label: "Insights" },
      { to: "/calendar", icon: Calendar, label: "Calendar" },
    ],
  },
  {
    title: "Collaborate",
    items: [
      { to: "/teams", icon: Users, label: "Teams" },
      { to: "/projects", icon: FolderKanban, label: "Projects" },
      { to: "/github", icon: Github, label: "GitHub" },
    ],
  },
  {
    title: "System",
    items: [
      { to: "/analytics", icon: BarChart3, label: "Analytics" },
      { to: "/settings", icon: Settings, label: "Settings" },
      { to: "/admin", icon: Shield, label: "Admin" },
    ],
  },
];

// Flat list of all nav items for command palette
export const allNavItems = navSections.flatMap((s) =>
  s.items.map((item) => ({ ...item, section: s.title }))
);

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors"
      >
        {title}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            !open && "-rotate-90"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 pb-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-56 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-4">
        <NavLink to="/dashboard">
          <BrainCloudLogo variant="full" size={20} className="text-sidebar-primary" />
        </NavLink>
      </div>

      {/* Cmd+K trigger */}
      <div className="px-2 pt-2">
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent("open-command-palette"));
          }}
          className="flex w-full items-center gap-2 rounded-md border border-sidebar-border px-3 py-1.5 text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground/70 transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="ml-auto rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-medium text-sidebar-foreground/40">
            {"\u2318"}K
          </kbd>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navSections.map((section) => (
          <CollapsibleSection key={section.title} title={section.title}>
            {section.items.map(({ to, icon: Icon, label, shortcut }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
                {shortcut && (
                  <kbd className="hidden lg:inline-block text-[10px] font-medium text-sidebar-foreground/30">
                    {shortcut}
                  </kbd>
                )}
              </NavLink>
            ))}
          </CollapsibleSection>
        ))}
      </nav>
    </aside>
  );
}
