import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminUsers, useAdminUser, useUpdateUserRole, useUser } from "@/lib/queries";
import { RoleBadge } from "./dashboard-page";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

export function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: currentUser } = useUser();
  const { data, isLoading } = useAdminUsers(debouncedSearch || undefined, page);
  const { data: userDetail, isLoading: detailLoading } = useAdminUser(selectedUserId);
  const updateRole = useUpdateUserRole();

  const isSuperAdmin = currentUser?.system_role === "super_admin";

  // Simple debounce on search
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
    // Debounce 300ms
    const timeout = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timeout);
  };

  const totalPages = data ? Math.ceil(data.total / 50) : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">User Management</h1>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* User table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : !data || data.users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No users found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 font-medium">Role</th>
                    <th className="p-3 font-medium text-right">Thoughts</th>
                    <th className="p-3 font-medium text-right">Sessions</th>
                    <th className="p-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <td className="p-3 font-medium">{user.name}</td>
                      <td className="p-3 text-muted-foreground">{user.email}</td>
                      <td className="p-3">
                        <RoleBadge role={user.system_role} />
                      </td>
                      <td className="p-3 text-right">{user.thought_count}</td>
                      <td className="p-3 text-right">{user.session_count}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} users total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* User detail dialog */}
      <Dialog
        open={!!selectedUserId}
        onOpenChange={(open) => !open && setSelectedUserId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-20" />
            </div>
          ) : userDetail ? (
            <div className="space-y-4">
              <div>
                <p className="font-medium text-lg">{userDetail.name}</p>
                <p className="text-sm text-muted-foreground">{userDetail.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Joined {new Date(userDetail.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Role:</span>
                {isSuperAdmin && userDetail.id !== currentUser?.id ? (
                  <Select
                    value={userDetail.system_role}
                    onValueChange={(value) =>
                      updateRole.mutate({ id: userDetail.id, system_role: value })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="super_admin">super_admin</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <RoleBadge role={userDetail.system_role} />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(userDetail.counts).map(([key, value]) => (
                  <Card key={key}>
                    <CardHeader className="pb-1 pt-3 px-3">
                      <CardTitle className="text-xs font-medium capitalize text-muted-foreground">
                        {key.replace(/_/g, " ")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                      <span className="text-lg font-bold">{value}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
