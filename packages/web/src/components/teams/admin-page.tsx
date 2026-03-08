import { useParams, Link } from "react-router-dom";
import { useTeam, useTeamStats } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/utils";
import {
  ArrowLeft,
  Brain,
  GitFork,
  Timer,
  Users,
} from "lucide-react";

export function TeamAdminPage() {
  const { id } = useParams<{ id: string }>();
  const { data: team, isLoading: teamLoading } = useTeam(id ?? null);
  const { data: stats, isLoading: statsLoading } = useTeamStats(id ?? null);

  if (teamLoading || statsLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!team || !stats) {
    return (
      <div className="max-w-4xl">
        <p className="text-muted-foreground">Team not found or you do not have admin access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link to="/teams">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{team.name} - Admin</h1>
          <p className="text-sm text-muted-foreground">
            Team statistics and member activity
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.members}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Thoughts</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thoughts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Decisions</CardTitle>
            <GitFork className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.decisions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sessions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Member activity table */}
      <Card>
        <CardHeader>
          <CardTitle>Member Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Member</th>
                  <th className="pb-2 font-medium text-right">Thoughts</th>
                  <th className="pb-2 font-medium text-right">Decisions</th>
                  <th className="pb-2 font-medium text-right">Sessions</th>
                  <th className="pb-2 font-medium text-right">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.member_activity.map((m) => (
                  <tr key={m.user_id}>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={m.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {m.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.name}</span>
                          <Badge
                            variant={
                              m.role === "owner"
                                ? "default"
                                : m.role === "admin"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {m.role}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right tabular-nums">{m.thoughts}</td>
                    <td className="py-3 text-right tabular-nums">{m.decisions}</td>
                    <td className="py-3 text-right tabular-nums">{m.sessions}</td>
                    <td className="py-3 text-right text-muted-foreground">
                      {timeAgo(m.last_active)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t">
            <Link to="/teams">
              <Button variant="outline" size="sm">
                Manage Roles
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
