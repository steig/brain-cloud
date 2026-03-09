import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const ADMIN_TABS = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/users", label: "Users" },
];

export function AdminNav() {
  return (
    <div className="flex gap-1 border-b border-border">
      {ADMIN_TABS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </div>
  );
}
