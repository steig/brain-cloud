import { useNavigate, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Lightbulb,
  GitFork,
  Timer,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { BrainCloudLogo } from "@/components/brand/logo";
import { useUser } from "@/lib/queries";
import { auth } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { allNavItems } from "./sidebar";
import { NotificationBell } from "./notification-bell";

const mobileBottomItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/thoughts", icon: Lightbulb, label: "Thoughts" },
  { to: "/decisions", icon: GitFork, label: "Decisions" },
  { to: "/sessions", icon: Timer, label: "Sessions" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Header() {
  const { data: user } = useUser();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await auth.logout();
    navigate("/login");
  };

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2 md:hidden">
          <NavLink to="/dashboard">
            <BrainCloudLogo variant="full" size={20} />
          </NavLink>
        </div>
        <div className="hidden md:block" />
        <div className="flex items-center gap-2">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar_url} alt={user?.name} />
                <AvatarFallback>{user?.name?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name}</p>
                {user?.email && (
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>

      {/* Mobile hamburger overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {mobileOpen && (
        <nav className="fixed inset-x-0 bottom-14 z-50 max-h-[60vh] overflow-y-auto border-t bg-background p-2 md:hidden">
          {allNavItems
            .filter((item) => !mobileBottomItems.some((b) => b.to === item.to))
            .map(({ to, icon: Icon, label, section }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
        </nav>
      )}

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-center justify-around border-t bg-background md:hidden">
        {mobileBottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px]",
            mobileOpen ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Menu className="h-5 w-5" />
          More
        </button>
      </nav>
    </>
  );
}
