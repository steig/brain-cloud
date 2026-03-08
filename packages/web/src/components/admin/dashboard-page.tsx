import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats } from "@/lib/queries";
import { Users, Lightbulb, GitFork, Timer, Key } from "lucide-react";

export function AdminDashboardPage() {
  const { data, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">System Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    { label: "Users", value: data.totals.users, icon: Users },
    { label: "Thoughts", value: data.totals.thoughts, icon: Lightbulb },
    { label: "Decisions", value: data.totals.decisions, icon: GitFork },
    { label: "Sessions", value: data.totals.sessions, icon: Timer },
    { label: "API Keys", value: data.totals.api_keys, icon: Key },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Dashboard</h1>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 7-day activity chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.daily_activity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No activity in the last 7 days
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.daily_activity}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tickFormatter={(d: string) =>
                    new Date(d + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="thoughts"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="decisions"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top users */}
      <Card>
        <CardHeader>
          <CardTitle>Top Users by Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data.top_users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No users yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium text-right">Thoughts</th>
                    <th className="pb-2 font-medium text-right">Decisions</th>
                    <th className="pb-2 font-medium text-right">Sessions</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{user.name}</td>
                      <td className="py-2 text-muted-foreground">{user.email}</td>
                      <td className="py-2">
                        <RoleBadge role={user.system_role} />
                      </td>
                      <td className="py-2 text-right">{user.thought_count}</td>
                      <td className="py-2 text-right">{user.decision_count}</td>
                      <td className="py-2 text-right">{user.session_count}</td>
                      <td className="py-2 text-right font-medium">
                        {user.thought_count + user.decision_count + user.session_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case "super_admin":
      return <Badge className="bg-red-600 hover:bg-red-700">super_admin</Badge>;
    case "admin":
      return <Badge className="bg-blue-600 hover:bg-blue-700">admin</Badge>;
    default:
      return <Badge variant="secondary">{role}</Badge>;
  }
}
