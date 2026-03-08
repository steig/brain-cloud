import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "@/lib/queries";
import { useDemo } from "@/lib/demo-context";
import { Skeleton } from "@/components/ui/skeleton";
import { WaitlistPage } from "./waitlist-page";

export function AuthGuard() {
  const { isDemo } = useDemo();
  const { data: user, isLoading, isError } = useUser();

  // Demo mode bypasses auth
  if (isDemo) {
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.approved_at) {
    return <WaitlistPage user={user} />;
  }

  return <Outlet />;
}
