import { useNavigate, NavLink } from "react-router-dom";
import {
  Brain,
  LayoutDashboard,
  Lightbulb,
  GitFork,
  Timer,
  BarChart3,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
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

const mobileNavItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/thoughts", icon: Lightbulb, label: "Thoughts" },
  { to: "/decisions", icon: GitFork, label: "Decisions" },
  { to: "/sessions", icon: Timer, label: "Sessions" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
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
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Brain className="h-5 w-5" />
          <span className="font-semibold">Brain Cloud</span>
        </div>
        <div className="hidden md:block" />
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
      </header>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-b bg-background p-2 md:hidden">
          {mobileNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
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
    </>
  );
}
