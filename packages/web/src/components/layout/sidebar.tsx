import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Lightbulb,
  GitFork,
  Timer,
  BarChart3,
  Settings,
  ArrowRightLeft,
} from "lucide-react";
import { BrainCloudLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/thoughts", icon: Lightbulb, label: "Thoughts" },
  { to: "/decisions", icon: GitFork, label: "Decisions" },
  { to: "/sessions", icon: Timer, label: "Sessions" },
  { to: "/handoffs", icon: ArrowRightLeft, label: "Handoffs" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-56 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-4">
        <NavLink to="/dashboard">
          <BrainCloudLogo variant="full" size={20} className="text-sidebar-primary" />
        </NavLink>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
