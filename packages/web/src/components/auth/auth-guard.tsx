import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthGuard() {
  const { data: user, isLoading, isError } = useUser();

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

  return <Outlet />;
}
