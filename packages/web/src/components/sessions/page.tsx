import { useSessions } from "@/lib/queries";
import { SessionList } from "./session-list";

export function SessionsPage() {
  const sessions = useSessions({ order: "started_at.desc" });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sessions</h1>
      <SessionList
        sessions={sessions.data ?? []}
        isLoading={sessions.isLoading}
      />
    </div>
  );
}
