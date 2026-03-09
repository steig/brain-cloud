import { Helmet } from "react-helmet-async";
import { BrainCloudLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Clock, Brain, Zap, Search } from "lucide-react";
import type { AuthUser } from "@/lib/api";

const VALUE_PROPS = [
  { icon: Brain, text: "Persistent memory across AI sessions" },
  { icon: Search, text: "Search & recall past decisions instantly" },
  { icon: Zap, text: "AI coaching from your work patterns" },
];

export function WaitlistPage({ user }: { user: AuthUser }) {
  const handleLogout = async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' })
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Helmet>
        <title>You're on the waitlist — Brain Cloud</title>
      </Helmet>

      <div className="w-full max-w-md text-center">
        <BrainCloudLogo size={48} className="mx-auto text-foreground" />

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Early access
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          You're on the waitlist
        </h1>
        <p className="mt-2 text-muted-foreground">
          Hey {user.name?.split(" ")[0] || "there"}, we're letting people in gradually.
          You'll get access soon.
        </p>

        {user.email && (
          <p className="mt-4 text-sm text-muted-foreground">
            We'll notify <span className="font-medium text-foreground">{user.email}</span> when
            your account is approved.
          </p>
        )}

        <div className="mt-10 space-y-3 text-left">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            What you'll get
          </p>
          {VALUE_PROPS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="text-sm">{text}</span>
            </div>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-8 text-muted-foreground"
          onClick={handleLogout}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
